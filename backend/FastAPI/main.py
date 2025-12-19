
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Optional
import re
import schemas 
from database import supabase 
import random 
from fastapi import FastAPI, Depends, HTTPException, status, Query, APIRouter
import pandas as pd
from build_member_stats import build_member_stats
from sqlalchemy.orm import Session
from util_common import compute_score_prob, compute_speech_length
from predict_bill_pass_probability2 import predict_bill_pass_probability
import ast
from pydantic import BaseModel

TABLE_PREVIEW_NAMES = [
    "bill_detail_score",
    "bill_member_score",
    "bill_party_score",
    "bills",
    "committee_bill_ranking",
    "committee_member_ranking",
    "committee_total_score",
    "committees",
    "committees_history",
    "dimension",
    "meetings",
    "member_bill_stats",
    "member_stats",
    "parties",
    "parties_history",
    "party_bill_ranking",
    "party_member_ranking_unique",
    "party_total_score",
    "speeches",
]


# ======================================================================
# PYDANTIC SCHEMAS FOR BILL PREDICTION
# ======================================================================
class BillKeywordInput(BaseModel):
    """사용자 입력 법안 키워드"""
    keyword: str


class BillEvidenceOutput(BaseModel):
    """근거 법안"""
    bill_number: str
    bill_name: str
    avg_score_prob: float
    n_speeches: int
    label: int
    similarity: float
    stance: str


class BillPredictionOutput(BaseModel):
    """법안 통과 가능성 예측 결과"""
    query: str
    predicted_pass_probability: Optional[float]
    legislative_gap: Optional[Dict[str, Any]]
    confidence: Optional[Dict[str, Any]]
    explanation: str
    evidence_bills: List[BillEvidenceOutput]


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀 Server đang khởi động...")
    print("✅ Đã kết nối Supabase!")
    yield
    print("🔥 Server đã tắt.")

app = FastAPI(lifespan=lifespan)
router = APIRouter()

# --- CẤU HÌNH CORS ---
origins = [
    "http://localhost:5173",
    "http://localhost:5174",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# --- AUTH HELPER ---
def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        user = supabase.auth.get_user(token)
        if not user:
             raise HTTPException(status_code=401, detail="Token không hợp lệ")
        return user.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))
    
def get_committee_maps():
    # committees 테이블에서 id / name 다 가져오기
    res = supabase.table("committees").select("*").execute()
    rows = res.data or []

    print("DEBUG committees rows sample:", rows[:5])

    name_to_id = {}
    id_to_name = {}

    for row in rows:
        # 컬럼 이름이 committee_id 인지 id 인지 둘 다 체크
        c_id = row.get("committee_id") or row.get("id")
        name = row.get("committee")

        if c_id is None or not name:
            continue

        try:
            c_id_int = int(c_id)
        except Exception:
            print("DEBUG invalid committee_id from committees:", c_id)
            continue

        id_to_name[c_id_int] = name
        name_to_id[name] = c_id_int

    print("DEBUG id_to_name_map sample:", list(id_to_name.items())[:5])
    return name_to_id, id_to_name


# --- 공통 헬퍼: 안전한 실수 파싱 / 청크 분할 / 스탠스 분류 ---
def _safe_float(val):
    """
    Supabase 테이블에서 Excel 문자열 형태(\"=0.1\")로 저장된 값을 안전하게 float로 변환.
    """
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return float(val)

    if isinstance(val, str):
        cleaned = val.strip().replace('"', "")
        if cleaned.startswith("="):
            cleaned = cleaned.lstrip("=")
        try:
            return float(cleaned)
        except Exception:
            return None
    return None


def _chunk_list(items, size=100):
    for i in range(0, len(items), size):
        yield items[i : i + size]


def _stance_from_score(score):
    if score is None:
        return "중립"
    if score >= 0.05:
        return "협력"
    if score <= -0.05:
        return "비협력"
    return "중립"


def _extract_member_score(row):
    """
    member_stats 테이블에서 협력도 점수를 안전하게 추출한다.
    우선순위: cooperation_score_prob -> avg_score_prob -> (avg_prob_coop - avg_prob_noncoop)
    """
    score = _safe_float(row.get("cooperation_score_prob"))
    if score is None:
        score = _safe_float(row.get("avg_score_prob"))
    if score is None:
        coop = _safe_float(row.get("avg_prob_coop"))
        noncoop = _safe_float(row.get("avg_prob_noncoop"))
        if coop is not None and noncoop is not None:
            score = coop - noncoop
    return score


def _extract_bill_score(row):
    """
    member_bill_stats 테이블에서 협력도 점수를 추출한다.
    우선순위: score_prob_mean -> score_prob -> (prob_coop - prob_noncoop)
    """
    score = _safe_float(row.get("score_prob_mean"))
    if score is None:
        score = _safe_float(row.get("score_prob"))
    if score is None:
        coop = _safe_float(row.get("prob_coop"))
        noncoop = _safe_float(row.get("prob_noncoop"))
        if coop is not None and noncoop is not None:
            score = coop - noncoop
    return score


def _safe_int(val):
    try:
        return int(val)
    except Exception:
        try:
            return int(float(val))
        except Exception:
            return None


def _fetch_table(table_name: str):
    res = supabase.table(table_name).select("*").execute()
    return res.data or []


def _fetch_table_paginated(table_name: str, select_cols: str = "*", batch_size: int = 1000, max_batches: int = None):
    """
    Supabase에서 1000개 행씩 페이지네이션하여 데이터를 가져온다.
    
    Args:
        table_name: 테이블 이름
        select_cols: 선택할 컬럼 (쉼표로 구분, 기본값 "*")
        batch_size: 한 번에 가져올 행 수 (최대 1000)
        max_batches: 최대 배치 수 (None이면 모두 가져옴)
    
    Returns:
        모든 행을 합친 리스트
    """
    all_data = []
    batch_count = 0
    offset = 0
    
    while True:
        batch_count += 1
        if max_batches and batch_count > max_batches:
            break
        
        try:
            res = (
                supabase.table(table_name)
                .select(select_cols)
                .range(offset, offset + batch_size - 1)
                .execute()
            )
            batch_data = res.data or []
            
            if not batch_data:
                break  # 더 이상 데이터 없음
            
            all_data.extend(batch_data)
            offset += batch_size
            
            print(f"[INFO] {table_name}: 배치 {batch_count} 로드 완료 ({len(batch_data)} 행, 누적: {len(all_data)} 행)")
            
        except Exception as e:
            print(f"[WARN] {table_name} 배치 {batch_count} 로드 실패: {e}")
            break
    
    return all_data






# ==========================================
# 1. API DỮ LIỆU NGHỊ SĨ (SỬA LẠI TÊN BẢNG)
# ==========================================

# --- Lấy danh sách tất cả nghị sĩ ---
@app.get("/api/legislators")
def get_all_legislators():
    try:
        _, id_to_name_map = get_committee_maps()
        response = supabase.table('dimension').select("*").execute()
        data = response.data or []

        # 최신 정당 정보 매핑 (parties_history 기준 최신 start_date)
        latest_party_map = {}
        try:
            ph_res = supabase.table("parties_history").select("member_id, party_name, party_id, start_date").execute()
            ph_rows = ph_res.data or []

            from datetime import datetime

            def _parse_dt(val):
                if not val:
                    return None
                try:
                    # 'YYYY-MM-DD' 또는 ISO 형식 모두 처리
                    return datetime.fromisoformat(str(val).split("T")[0])
                except Exception:
                    return None

            for row in ph_rows:
                mid = row.get("member_id")
                if mid is None:
                    continue
                start_dt = _parse_dt(row.get("start_date")) or datetime.min
                prev = latest_party_map.get(mid)
                if (not prev) or (start_dt > prev["start"]):
                    latest_party_map[mid] = {
                        "party_name": row.get("party_name") or row.get("party"),
                        "party_id": row.get("party_id"),
                        "start": start_dt,
                    }
        except Exception as e:
            print("WARN: failed to build party_history map:", e)
            latest_party_map = {}

        results = []
        for item in data:
            # 🔹 primary key dùng lại cho cả id & member_id
            member_pk = item.get("member_id") or item.get("id")

            score = item.get("score") or random.randint(60, 99)

            c_id_raw = item.get("committee_id")
            try:
                c_id = int(c_id_raw) if c_id_raw is not None else None
            except Exception:
                c_id = None

            committee_name = id_to_name_map.get(c_id) or "소속 위원회 없음"
            
            # 나이 계산 (birth_date가 있으면 사용, 없으면 "-" 반환)
            birth_date = item.get("birth_date")
            age_group = "-"
            if birth_date:
                try:
                    from datetime import datetime
                    birth_year = int(birth_date[:4])
                    current_year = datetime.now().year
                    age = current_year - birth_year
                    
                    if age < 30:
                        age_group = "u30"  # 30세 미만
                    elif age < 40:
                        age_group = "u40"  # 30대
                    elif age < 50:
                        age_group = "u50"  # 40대
                    elif age < 60:
                        age_group = "u60"  # 50대
                    elif age < 70:
                        age_group = "u70"  # 60대
                    else:
                        age_group = "o70"  # 70세 이상
                except Exception:
                    age_group = "-"

            latest_party = latest_party_map.get(member_pk)
            party_name = latest_party.get("party_name") if latest_party else item.get("party")

            # 당선 횟수를 문자열 형식으로 변환 (1→"초선", 2→"재선", 3→"3선" 등)
            elected_count_raw = item.get("elected_time") or item.get("elected_count")
            count_str = "초선"  # 기본값
            if elected_count_raw is not None:
                try:
                    count_num = int(elected_count_raw)
                    if count_num == 1:
                        count_str = "초선"
                    elif count_num == 2:
                        count_str = "재선"
                    elif count_num >= 6:
                        count_str = "6선"
                    else:
                        count_str = f"{count_num}선"
                except Exception:
                    count_str = str(elected_count_raw) if elected_count_raw else "초선"

            # 지역구 파싱: region을 city와 district로 분리
            # 예: "경남 창원시의창구" → city: "경남", district: "창원시의창구"
            region_full = item.get("district") or item.get("region") or "비례대표"
            city = "비례대표"
            district = None
            
            if region_full and region_full != "비례대표":
                parts = region_full.split(None, 1)  # 첫 공백 기준으로 분리
                if len(parts) == 2:
                    city = parts[0]      # "경남", "경기", "서울" 등
                    district = parts[1]  # "창원시의창구", "안성시" 등
                elif len(parts) == 1:
                    city = parts[0]
                    district = None

            results.append({
                "id": member_pk,          
                "member_id": member_pk,  
                "name": item.get("name"),
                "party": party_name,
                "region": region_full,
                "city": city,
                "district": district,
                "committee": committee_name,
                "gender": item.get("gender", "-"),
                "age": age_group,
                "count": count_str,
                "method": item.get("elected_type") or item.get("election_method") or "지역구",
                "score": score
            })

        return results

    except Exception as e:
        print("Lỗi lấy danh sách:", e)
        return []



# --- Lấy dữ liệu cho Bộ lọc ---
@app.get("/api/filters")
def get_filters():
    try:
        # 1. Lấy danh sách Tên Ủy ban trực tiếp từ bảng 'committees'
        com_res = supabase.table('committees').select("committee").execute()
        committee_names = sorted([c['committee'] for c in com_res.data if c.get('committee')])

        # 2. Lấy các thông tin khác từ bảng 'dimension'
        # Dùng select("*") cho an toàn, tránh lỗi nếu sai tên cột (ví dụ 'district' vs 'region')
        response = supabase.table('dimension').select("*").execute()
        data = response.data
        
        # Helper để lấy giá trị duy nhất và loại bỏ None
        def get_unique_values(key_alternatives):
            values = set()
            for x in data:
                val = None
                for key in key_alternatives:
                    if x.get(key):
                        val = x.get(key)
                        break
                if val:
                    values.add(val)
            return sorted(list(values))

        return {
            "parties": get_unique_values(['party']),
            "committees": committee_names,
            "genders": get_unique_values(['gender']),
            "regions": get_unique_values(['district', 'region']),
            "counts": ["초선", "재선", "3선", "4선", "5선", "6선"],
            "ages": ["u30", "u40", "u50", "u60", "u70", "o70"],
            "methods": ["지역구", "비례대표"],
        }
    except Exception as e:
        print("Lỗi Filter:", e)
        # Trả về mảng rỗng để FE không bị crash
        return {
            "parties": [], "committees": [], "genders": [], 
            "regions": [], "counts": [], "ages": [], "methods": []
        }
    

# ==========================================
# 1-1. 정당 협력도 요약 API
# ==========================================
@app.get("/api/parties/{party_id}/summary")
def get_party_summary(party_id: int):
    """
    정당 ID로 조회:
      - 정당 총 협력도
      - 협력도 상위/하위 5명의 의원
      - 정당 주요 법안 찬성 상위/하위 5개
    """
    try:
        # 1. parties 테이블에서 party_name 조회
        party_res = supabase.table("parties").select("party_name").eq("party_id", party_id).execute()
        if not party_res.data:
            raise HTTPException(status_code=404, detail="정당을 찾을 수 없습니다.")
        
        party_name = party_res.data[0].get("party_name")

        # 2. party_total_score 테이블에서 정당 총 협력도 조회
        total_cooperation = None
        analyzed_members = 0
        
        try:
            total_score_res = supabase.table("party_total_score").select("*").eq("party_name", party_name).execute()
            if total_score_res.data:
                party_row = total_score_res.data[0]
                total_cooperation = {
                    "avg_score_prob": party_row.get("avg_score_prob"),
                    "adjusted_score_prob": party_row.get("adjusted_score_prob"),
                    "original_stance": party_row.get("original_stance"),
                    "adjusted_stance": party_row.get("adjusted_stance"),
                }
                analyzed_members = party_row.get("n_members", 0)
            else:
                total_cooperation = {
                    "status": "분석 불가",
                    "message": "정당 협력도 데이터가 없습니다."
                }
        except Exception as e:
            print(f"WARN: party_total_score 조회 실패: {e}")
            total_cooperation = {
                "status": "분석 불가",
                "message": "정당 협력도 데이터 조회 중 오류가 발생했습니다."
            }

        # 3. party_member_ranking_unique 테이블에서 의원 랭킹 조회
        member_top5 = []
        member_bottom5 = []
        
        try:
            member_rank_res = supabase.table("party_member_ranking_unique").select("*").eq("party_name", party_name).execute()
            party_members = member_rank_res.data or []

            if party_members:
                # 상위 5명
                member_top5 = sorted(party_members, key=lambda x: x.get("bayesian_score", 0), reverse=True)[:5]
                # 하위 5명
                member_bottom5 = sorted(party_members, key=lambda x: x.get("bayesian_score", 0))[:5]
                
                # analyzed_members가 아직 0이면 party_members 수로 설정
                if analyzed_members == 0:
                    analyzed_members = len(party_members)
        except Exception as e:
            print(f"WARN: party_member_ranking_unique 조회 실패: {e}")

        # 4. party_bill_ranking 테이블에서 법안 랭킹 조회
        bill_top5 = []
        bill_bottom5 = []
        
        try:
            bill_rank_res = supabase.table("party_bill_ranking").select("*").eq("party_name", party_name).execute()
            party_bills = bill_rank_res.data or []

            if party_bills:
                # 같은 이름의 법안을 하나로 통합 (가장 높은 bayesian_score 사용)
                bill_name_map = {}
                for bill in party_bills:
                    bill_name = bill.get("bill_name")
                    if not bill_name:
                        continue
                    
                    current_score = bill.get("bayesian_score", 0)
                    
                    if bill_name not in bill_name_map:
                        bill_name_map[bill_name] = bill
                    else:
                        # 기존 법안보다 점수가 높으면 교체
                        existing_score = bill_name_map[bill_name].get("bayesian_score", 0)
                        if current_score > existing_score:
                            bill_name_map[bill_name] = bill
                
                # 통합된 법안 리스트
                unique_bills = list(bill_name_map.values())
                
                # 점수로 정렬 (내림차순/오름차순)
                sorted_desc = sorted(unique_bills, key=lambda x: x.get("bayesian_score", 0), reverse=True)
                sorted_asc = sorted(unique_bills, key=lambda x: x.get("bayesian_score", 0))
                
                # 상위 5개 (같은 점수는 하나만 포함)
                prev_score = None
                for bill in sorted_desc:
                    current_score = bill.get("bayesian_score", 0)
                    if prev_score is None or current_score != prev_score:
                        bill_top5.append(bill)
                        prev_score = current_score
                        if len(bill_top5) >= 5:
                            break
                
                # 하위 5개 (같은 점수는 하나만 포함)
                prev_score = None
                for bill in sorted_asc:
                    current_score = bill.get("bayesian_score", 0)
                    if prev_score is None or current_score != prev_score:
                        bill_bottom5.append(bill)
                        prev_score = current_score
                        if len(bill_bottom5) >= 5:
                            break
        except Exception as e:
            print(f"WARN: party_bill_ranking 조회 실패: {e}")

        return {
            "party_id": party_id,
            "party_name": party_name,
            "total_cooperation": total_cooperation,
            "analyzed_members": analyzed_members,
            "member_top5": member_top5,
            "member_bottom5": member_bottom5,
            "bill_top5": bill_top5,
            "bill_bottom5": bill_bottom5,
        }

    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        print("Error in get_party_summary:", e)
        raise HTTPException(status_code=500, detail="정당 분석 중 오류가 발생했습니다.")


# ==========================================
# 1-2. 정당별 총 협력도 점수 API
# ==========================================
@app.get("/api/parties/total-score")
def get_parties_total_score():
    """
    모든 정당의 협력도 점수를 반환한다.
    
    반환 항목:
      - party_name: 정당명
      - total_speeches: 총 발언 수
      - total_score: 점수 총합
      - avg_score_prob: 평균 협력도 점수 (-1 ~ 1)
      - n_members: 소속 의원 수
      - baseline_score: 전체 평균 협력도 (기준값)
      - original_stance: 절대평가 스탠스 (협력/중립/비협력)
      - adjusted_stance: 상대평가 스탠스 (baseline 기준)
      - adjusted_score_prob: 보정된 협력도 점수 (baseline 중심)
    """
    try:
        # party_total_score 테이블에서 직접 조회
        response = supabase.table("party_total_score").select("*").execute()
        result = response.data or []
        
        return {
            "count": len(result),
            "parties": result
        }
    
    except Exception as e:
        print("Error in get_parties_total_score:", e)
        raise HTTPException(status_code=500, detail=f"정당 협력도 조회 중 오류: {str(e)}")

    
@app.get("/api/parties/member-ranking")
def get_parties_member_ranking():
    """
    모든 정당의 의원별 협력도(베이시안 보정 포함) 랭킹을 반환한다.
    """
    try:
        # party_member_ranking_unique 테이블에서 직접 조회
        response = supabase.table("party_member_ranking_unique").select("*").execute()
        result = response.data or []
        return {"count": len(result), "members": result}
    except Exception as e:
        print("Error in get_parties_member_ranking:", e)
        raise HTTPException(status_code=500, detail=f"정당별 의원 랭킹 조회 중 오류: {str(e)}")


@app.get("/api/parties/bill-ranking")
def get_parties_bill_ranking():
    """
    모든 정당의 법안별 협력도 랭킹을 반환한다.
    """
    try:
        # party_bill_ranking 테이블에서 직접 조회
        response = supabase.table("party_bill_ranking").select("*").execute()
        result = response.data or []
        return {"count": len(result), "bills": result}
    except Exception as e:
        print("Error in get_parties_bill_ranking:", e)
        raise HTTPException(status_code=500, detail=f"정당별 법안 랭킹 조회 중 오류: {str(e)}")


# ==========================================
# 2. SEARCH API (ĐÃ SỬA LOGIC LOOKUP)
# ==========================================

@app.post("/api/search", response_model=schemas.SearchResponse)
def search_analysis(data: schemas.SearchInput):
    try:
        name_to_id_map, id_to_name_map = get_committee_maps()
        query = supabase.table('dimension').select("*")

        if data.query:
            query = query.ilike('name', f"%{data.query}%")
        
        if getattr(data, 'party', None) and data.party not in ["all", "소속정당 전체", "전체"]:
            query = query.eq('party', data.party)

        if getattr(data, 'committee', None) and data.committee not in ["all", "전체"]:
            target_c_id = name_to_id_map.get(data.committee)
            if target_c_id:
                query = query.eq('committee_id', target_c_id)
            else:
                return {"profile": None, "results": [], "ai_summary": "Không tìm thấy ủy ban này."}

        if getattr(data, 'city', None) and data.city not in ["all", "전체"]:
            query = query.ilike('district', f"%{data.city}%") 

        if getattr(data, 'gender', None) and data.gender not in ["all", "전체"]:
            query = query.eq('gender', data.gender)

        # 🔥 SỬA Ở ĐÂY
        if getattr(data, 'count', None) and data.count not in ["all", "전체"]:
            query = query.eq("elected_time", data.count)

        if getattr(data, 'method', None) and data.method not in ["all", "전체"]:
            query = query.eq('elected_type', data.method)
        

        response = query.execute()
        found = response.data
        
        if not found: 
            return {"profile": None, "results": [], "ai_summary": "Không tìm thấy kết quả phù hợp."}
        
        target = found[0]

        member_pk = target.get("member_id") or target.get("id")

        history_res = (
            supabase.table("committees_history")
            .select("committee, start_date, end_date")
            .eq("member_id", member_pk)
            .order("start_date", desc=True) # Mới nhất lên đầu
            .execute()
        )
        
        # Format dữ liệu cho khớp với Frontend (name, startDate, endDate)
        raw_history = history_res.data or []
        formatted_committees = []
        
        for h in raw_history:
            formatted_committees.append({
                "name": h.get("committee"),
                "startDate": h.get("start_date"),
                "endDate": h.get("end_date")
            })


        history_res = (
            supabase.table("committees_history")
            .select("committee, start_date, end_date")
            .eq("member_id", member_pk)
            .order("start_date", desc=True) # Mới nhất lên đầu
            .execute()
        )
        
        # Format dữ liệu cho khớp với Frontend (name, startDate, endDate)
        raw_history = history_res.data or []
        formatted_committees = []
        
        for h in raw_history:
            formatted_committees.append({
                "name": h.get("committee"),
                "startDate": h.get("start_date"),
                "endDate": h.get("end_date")
            })

        c_id_result = target.get('committee_id')
        committee_display_name = id_to_name_map.get(c_id_result, "소속 위원회 없음")

        profile_data = {
            "id": member_pk,       
            "member_id": member_pk,  
            "type": "person",
            "name": target.get('name'),
            "party": target.get('party'),
            "committee": committee_display_name,
            "region": target.get('district') or target.get('region'),
            "gender": target.get('gender'),
            "count": target.get('elected_time'),
            "method": target.get('elected_type'),
            "total_bills": 142,
            "img": target.get('img') or target.get('image_url') or ""
        }


        fake_bills = [
            {
                "id": 1, 
                "billNumber": "2214531", 
                "billName": "AI 산업 육성법 (Ví dụ)", 
                "date": "2024-05-30", 
                "sentiment": "협력", 
                "score": 95, 
                "role": "대표발의", 
                "proposer": f"{target['name']} 외 10인"
            },
        ]

        return {
            "profile": profile_data,
            "results": fake_bills,
            "ai_summary": f"DB 분석 결과: {target['name']} 의원은 {committee_display_name}에서 활발한 활동 중입니다."
        }

    except Exception as e:
        print("Lỗi Search:", e)
        raise HTTPException(status_code=500, detail=str(e))






    
    # 1. Lấy thông tin cơ bản (Bảng Member)
    # Lưu ý: Sửa 'member' thành tên bảng chứa thông tin nghị sĩ của bạn (vd: members)
    member_query = text("SELECT * FROM member WHERE member_id = :mid")
    member = db.execute(member_query, {"mid": member_id}).mappings().first()
    
    if not member:
        raise HTTPException(status_code=404, detail="Legislator not found")

    # 2. Lấy lịch sử ủy ban từ bảng 'committees_history' 👈 ĐÃ SỬA TÊN BẢNG
    # Dựa vào hình ảnh bạn gửi: có cột committee, start_date, end_date
    committee_query = text("""
        SELECT committee, start_date, end_date 
        FROM committees_history 
        WHERE member_id = :mid 
        ORDER BY start_date DESC
    """)
    committees_rows = db.execute(committee_query, {"mid": member_id}).mappings().all()

    # 3. Chuyển đổi kết quả sang List Dict
    committees_list = []
    for row in committees_rows:
        committees_list.append({
            "committee": row["committee"],
            "start_date": row["start_date"],
            "end_date": row["end_date"]
        })

    # 4. Trả về JSON gộp
    return {
        "id": member["member_id"],
        "name": member["name"],
        "party": member["party_name"], 
        "region": member["region"],
        "gender": member["gender"],
        "count": member["elected_count"], 
        "method": member["election_method"], 
        "committees": committees_list  # ✅ Frontend sẽ nhận được cái này
    }


# 🔥 Dùng member_id để lấy 법안/통계
@app.get("/api/legislators/{member_id}/bills")
def get_legislator_bills(member_id: int):
    try:
        print("DEBUG /bills member_id =", member_id)

        # 1️⃣ member_bill_stats 에서 member_id 로 조회
        stats_res = (
            supabase.table("member_bill_stats")
            .select("*")
            .eq("member_id", member_id)
            .execute()
        )

        rows = stats_res.data or []
        print("DEBUG rows count =", len(rows))
        
        # ---------------------------------------------------------
        # [추가] 2️⃣ bills 테이블에서 bill_name 가져오기 (Look up)
        # ---------------------------------------------------------
        # row에 있는 'bill_id'를 사용하여 수집
        bill_ids_raw = [r.get("bill_id") for r in rows]
        print("DEBUG extracted bill_ids_raw =", bill_ids_raw)
        print("DEBUG bill_ids_raw numbers =", len(bill_ids_raw))

        # 숫자가 아닌 bill_id(예: "None", "", None 등) 제거 + int로 변환
        valid_bill_ids: list[int] = []
        for v in bill_ids_raw:
            if v is None:
                continue

            s = str(v).strip()

            # "None", "", 알 수 없는 문자열 등은 전부 제외
            if not s.isdigit():
                print(f"WARN: skip invalid bill_id value: {s!r}")
                continue

            valid_bill_ids.append(int(s))

        # 중복 제거
        bill_ids_for_query = sorted(set(valid_bill_ids))
        print("DEBUG cleaned bill_ids_for_query =", bill_ids_for_query)
        print( "DEBUG bill_ids_for_query count =", len(bill_ids_for_query))

        
        bill_name_map: dict[str, str] = {}

        if bill_ids_raw:
            try:
                bill_res = (
                    supabase.table("bills")
                    .select("bill_id, bill_name")
                    .in_("bill_id", bill_ids_for_query)   # <- 여기! in_에 들어가는 건 "값 리스트"
                    .execute()
                )

                for b_item in (bill_res.data or []):
                    # 매핑 생성: { "2100001": "법안이름...", ... }
                    b_id = str(b_item.get("bill_id"))
                    b_name = b_item.get("bill_name")
                    bill_name_map[b_id] = b_name

                print("DEBUG fetched bill_name count =", len(bill_name_map))

            except Exception as e:
                print("Error fetching bill names in get_legislator_bills:", e)
        # ---------------------------------------------------------

        # ---------------------------------------------------------
        # [추가] 3️⃣ bill_member_score 테이블에서 bayesian_score, adjusted_stance 가져오기
        # ---------------------------------------------------------
        bill_member_score_map: dict[tuple, dict] = {}  # (member_id, bill_number:str) -> {bayesian_score, adjusted_stance}
        
        if valid_bill_ids:
            try:
                score_res = (
                    supabase.table("bill_member_score")
                    .select("member_id, bill_number, avg_score_prob, adjusted_stance")
                    .eq("member_id", member_id)
                    .in_("bill_number", valid_bill_ids)
                    .execute()
                )
                
                for item in (score_res.data or []):
                    bid_norm = str(item.get("bill_number")).strip() if item.get("bill_number") is not None else None
                    key = (item.get("member_id"), bid_norm)
                    bill_member_score_map[key] = {
                        "avg_score_prob": item.get("avg_score_prob"),
                        "adjusted_stance": item.get("adjusted_stance")
                    }
                
                print("DEBUG fetched bill_member_score count =", len(bill_member_score_map))
            except Exception as e:
                print("Error fetching bill_member_score:", e)
        # ---------------------------------------------------------

        bills = []
        for idx, row in enumerate(rows, start=1):
            # bill_id를 사용
            bill_id_val = str(row.get("bill_id", ""))
            
            # [수정] bill_name_map에서 실제 법안 이름을 찾음. 없으면 ID 그대로 사용하거나 대체 텍스트 사용
            bill_name_real = bill_name_map.get(bill_id_val, bill_id_val)

            member_name = row.get("member_name", "")

            # 발언 관련 통계 (member_bill_stats 테이블 실제 필드명 사용)
            n_speeches = row.get("n_speeches") or 0
            total_len = row.get("total_speech_length_bill") or 0
            avg_speech_len = row.get("avg_speech_length_bill") or 0

            # 태도 / 점수
            stance = row.get("stance") or "중립"
            raw_prob = row.get("score_prob_mean")
            
            # bill_member_score에서 avg_score_prob adjusted_stance 조회 (bill_number 문자열 키 사용)
            score_key = (member_id, bill_id_val)
            score_data = bill_member_score_map.get(score_key, {})
            
            # avg_score_prob 사용 (없으면 raw_prob 유지)
            final_score_prob = score_data.get("avg_score_prob") if score_data.get("avg_score_prob") is not None else raw_prob
            
            # adjusted_stance 사용 (없으면 stance 유지)
            final_stance = score_data.get("adjusted_stance") if score_data.get("adjusted_stance") else stance
            
            # 소수점 2자리로 제한
            # if raw_prob is not None:
            #     raw_prob = round(raw_prob, 2)

            # if raw_prob is not None:
            #     raw_prob = round(raw_prob, 3)

            # if raw_prob is not None:
            #     try:
            #         p = float(raw_prob)          # -1 ~ 1 이라고 가정
            #         score = max(0, min(100, round((p + 1) / 2 * 100)))
            #     except Exception:
            #         score = 50
            # else:
            #     score = 50

            # 제안일자
            proposal_date = (
                row.get("제안일자")
                or row.get("proposal_date")
                or None
            )

            # 의안 번호 (bill_id)
            bill_number = bill_id_val

            meeting_id = row.get("meeting_id")

            bills.append({
                "id": idx,
                "billNumber": bill_number,
                "billName": bill_name_real,
                "proposer": member_name,
                "role": "심사 참여",
                "nSpeeches": n_speeches,
                "totalSpeechLength": total_len,
                "sentiment": final_stance,
                "scoreProbMean": final_score_prob,
                "date": proposal_date,
                "meetingId": meeting_id,
            })

        # AI 요약 생성 (member_bill_stats 테이블 데이터 기반)
        total_bills = len(bills)
        total_speeches = sum(b["nSpeeches"] for b in bills)
        
        if total_bills > 0:
            # 평균 협력도 계산 (score_prob_mean의 평균)
            valid_scores = [b["scoreProbMean"] for b in bills if b["scoreProbMean"] is not None]
            avg_cooperation = sum(valid_scores) / len(valid_scores) if valid_scores else 0
            avg_cooperation = round(avg_cooperation, 4)
            
            # 법안 1건당 평균 발언 횟수
            avg_speeches_per_bill = round(total_speeches / total_bills, 1)
            
            ai_summary = (
                f"총 {total_bills} 건의 심사에 참여, "
                f"평균 협력도는 {avg_cooperation}, "
                f"총 발언 횟수 {total_speeches}, "
                f"법안 1건당 발언횟수 {avg_speeches_per_bill}"
            )
        else:
            ai_summary = "이 의원의 법안 심사 데이터가 없습니다."

        return {"ai_summary": ai_summary, "bills": bills}

    except Exception as e:
        print("Error get_legislator_bills:", repr(e))
        raise HTTPException(status_code=500, detail=str(e))
 #수정 X
    

@app.get("/api/speeches")
def get_speeches(
    member_id: int = Query(..., description="member_id của nghị sĩ"),
    meeting_id: int | None = Query(None, description="meeting_id của 회의"),
    bill_name: str | None = Query(None, description="bills text để khớp đúng 법안"),
):
    """
    실제 발언 리스트를 Supabase의 public.speeches 테이블에서 가져오는 API
    """
    try:
        print("DEBUG /api/speeches member_id =", member_id, "meeting_id =", meeting_id)
        print("DEBUG /api/speeches bill_name =", (bill_name or "")[:80])

        # 👈 tên bảng đúng: public.speeches
        query = (
            supabase
            .table("speeches")
            .select("*")
            .eq("member_id", member_id)
        )

        if meeting_id is not None:
            query = query.eq("meeting_id", meeting_id)

        if bill_name:
            try:
                head = bill_name.strip().split("\n")[0][:40]
                query = query.ilike("bills", f"%{head}%")
            except Exception as e:
                print("DEBUG skip bill_name filter:", repr(e))

        res = query.order("speech_id", desc=False).execute()
        rows = res.data or []
        print("DEBUG speeches count =", len(rows))

        speeches = []
        for idx, row in enumerate(rows, start=1):
            speeches.append({
                "id": row.get("speech_id") or idx,
                "text": row.get("speech_text") or row.get("speech") or "",
                "bills": row.get("bill_numbers"),
                "meetingId": row.get("meeting_id"),
                "memberId": row.get("member_id"),
                "sentiment": "중립",   # tạm thời mock
                "score": 50,          # tạm thời mock
            })

        return {"speeches": speeches}

    except Exception as e:
        print("Error /api/speeches:", repr(e))
        raise HTTPException(status_code=500, detail=f"/api/speeches failed: {e}")

# [수정] 특정 의원 발언 데이터 조회용 API (구조 개선: 데이터 가공 + AI 요약)
@app.get("/api/build_stat/{member_id}")
def get_speeches_by_member(member_id: int):
    try:
        print(f"DEBUG /api/build_stat/{member_id}")

        # 1. DB에서 해당 member_id의 speeches 조회
        response = (
            supabase.table("speeches")
            .select("*")
            .eq("member_id", member_id)
            .execute()
        )
        rows = response.data or []
        print(f"DEBUG speeches rows count = {len(rows)}")

        # speeches 가 하나도 없으면 빈 결과
        if not rows:
            return {
                "member_id": member_id,
                "stats": None,
                "speeches": [],
                "message": "해당 의원의 발언 데이터가 없습니다.",
            }

        # 2. pandas DataFrame 으로 변환
        df = pd.DataFrame(rows)

        # 3. build_member_stats 호출 (현재 DataFrame 기준으로 의원별 통계 계산)
        stats_df = build_member_stats(df)

        if stats_df.empty:
            stats_dict = None
        else:
            # 이 API는 한 명의 member_id만 조회하므로 첫 행만 사용
            stats_dict = stats_df.iloc[0].to_dict()

        # 4. 결과 반환
        return {
            "member_id": member_id,
            "stats": stats_dict,
            "speeches": rows,  # 필요 없으면 제거해도 됨
        }

    except Exception as e:
        print(f"Error fetching speeches for member {member_id}:", e)
        raise HTTPException(status_code=500, detail=str(e))

# 의안번호 따로, 의안이름 따로.
@app.get("/api/member_bill_stat/{member_id}")
def get_member_bill_stats_api(member_id: int):
    try:
        print(f"DEBUG /api/member_bill_stat/{member_id}")

        # 1. DB에서 해당 member_id의 speeches 조회
        response = (
            supabase.table("speeches")
            .select("*")
            .eq("member_id", member_id)
            .execute()
        )
        rows = response.data or []
        
        if not rows:
            return {
                "member_id": member_id,
                "bill_stats": [],
                "message": "해당 의원의 발언 데이터가 없습니다."
            }

        # 2. DataFrame 변환
        df = pd.DataFrame(rows)

        # ---------------------------------------------------------
        # 로직 적용 (build_member_bill_stats.py 참조)
        # ---------------------------------------------------------
        
        # (A) 확률 컬럼 보정
        def get_prob(x, key):
            if isinstance(x, dict):
                return x.get(key, 0.0)
            return 1.0 if key == "neutral" else 0.0

        if "prob_coop" not in df.columns or df["prob_coop"].isna().all():
            if "sentiment_prob" in df.columns:
                df["prob_noncoop"] = df["sentiment_prob"].apply(lambda x: get_prob(x, "noncoop"))
                df["prob_coop"]    = df["sentiment_prob"].apply(lambda x: get_prob(x, "coop"))
                df["prob_neutral"] = df["sentiment_prob"].apply(lambda x: get_prob(x, "neutral"))
            else:
                df["prob_noncoop"] = 0.0
                df["prob_coop"] = 0.0
                df["prob_neutral"] = 1.0

        # (B) score_prob 및 발언 길이 계산
        if "score_prob" not in df.columns or df["score_prob"].isna().all():
            df["score_prob"] = df.apply(lambda r: compute_score_prob(r.get("prob_coop", 0), r.get("prob_noncoop", 0)), axis=1)
        
        if "speech_length" not in df.columns:
            df["speech_length"] = df["speech_text"].apply(compute_speech_length)

        # (C) Bill Review 컬럼 준비 및 Explode -> 'bill_id'로 이름 변경 [수정됨]
        target_bill_col = None
        for cand in ["bill_review", "bills", "bill_numbers"]:
            if cand in df.columns:
                target_bill_col = cand
                break
        
        if target_bill_col:
            def parse_bill_list(val):
                if isinstance(val, list):
                    return val
                if isinstance(val, str):
                    try:
                        parsed = ast.literal_eval(val)
                        if isinstance(parsed, list):
                            return parsed
                        return [val]
                    except:
                        return [val]
                return []

            # 여기서 컬럼명을 'bill_id'로 지정하여 저장
            df["bill_id"] = df[target_bill_col].apply(parse_bill_list)
            
            df = df.explode("bill_id")
            df = df[df["bill_id"].notna()]
            df = df[df["bill_id"] != ""]
        else:
            return {"member_id": member_id, "bill_stats": [], "message": "법안 정보 컬럼을 찾을 수 없습니다."}

        if df.empty:
             return {"member_id": member_id, "bill_stats": [], "message": "유효한 법안 발언 데이터가 없습니다."}

        # (D) 의원 × 법안 단위 통계 집계 ('bill_review' -> 'bill_id'로 변경)
        if "member_name" not in df.columns:
            df["member_name"] = ""

        agg = df.groupby(["member_id", "member_name", "bill_id"]).agg(
            n_speeches=("speech_id", "count"),
            total_speech_length_bill=("speech_length", "sum"),
            avg_speech_length_bill=("speech_length", "mean"),
            score_prob_mean=("score_prob", "mean")
        ).reset_index()

        # (E) Stance 판단
        def stance(score):
            if score > 0.15:
                return "협력"
            elif score < -0.15:
                return "비협력"
            return "중립"

        agg["stance"] = agg["score_prob_mean"].apply(stance)

        # ---------------------------------------------------------
        # [추가] bills 테이블에서 bill_name 가져오기
        # ---------------------------------------------------------
        # 1. 현재 집계된 데이터에 있는 모든 bill_id 추출
        unique_bill_ids = agg["bill_id"].unique().tolist()
        print(unique_bill_ids[:10])
        print(f"DEBUG unique_bill_ids count = {len(unique_bill_ids)}")

        # 2. Supabase bills 테이블 조회 (bill_id가 일치하는 것들)
        if unique_bill_ids:
            try:
                bill_res = (
                    supabase.table("bills")
                    .select("bill_id, bill_name")
                    .in_("bill_id", unique_bill_ids)
                    .execute()
                )
                
                # 3. 매핑 딕셔너리 생성 {bill_id: bill_name}
                # bill_id가 DB에서는 int일 수 있고 df에서는 str일 수 있으므로 str로 통일하여 매핑
                bill_name_map = {}
                for item in (bill_res.data or []):
                    b_id = str(item.get("bill_id"))
                    b_name = item.get("bill_name")
                    bill_name_map[b_id] = b_name

                # 4. DataFrame에 bill_name 컬럼 추가
                agg["bill_name"] = agg["bill_id"].astype(str).map(bill_name_map).fillna("법안명 없음")
            
            except Exception as e:
                print("Error fetching bill names:", e)
                agg["bill_name"] = "조회 실패"
        else:
            agg["bill_name"] = "-"

        # (F) 정렬
        agg = agg.sort_values(["bill_id"])

        # 3. 결과 반환
        result_data = agg.to_dict(orient="records")

        return {
            "member_id": member_id,
            "count": len(result_data),
            "bill_stats": result_data
        }

    except Exception as e:
        print(f"Error calculating bill stats for member {member_id}:", e)
        raise HTTPException(status_code=500, detail=str(e))
    
# [추가] 특정 의원의 상세 정보(기본정보 + 상임위/정당 이력 + 대표 발의 법안) 조회 API
@app.get("/api/legislators/{member_id}/detail")
def get_legislator_detail(member_id: int):

    try:
        print(f"DEBUG /api/legislators/{member_id}/detail")

        # 1. 기본 정보 조회 (dimension 테이블)
        # ---------------------------------------------------------
        # committee_id 매핑을 위해 맵 가져오기
        name_to_id_map, id_to_name_map = get_committee_maps()

        def _normalize_committee_name(comm_name: str):
            """상임위 이름에서 소위원회 표기(하이픈 뒤) 제거하고 공백 정리."""
            if not comm_name:
                return comm_name
            base = str(comm_name).split("-")[0].strip()
            cleaned = re.sub(r"\s*(소위원회|소위).*$", "", base).strip()
            return cleaned or base

        dim_res = (
            supabase.table("dimension")
            .select("*")
            .eq("member_id", member_id)
            .execute()
        )
        
        if not dim_res.data:
            raise HTTPException(status_code=404, detail="의원 정보를 찾을 수 없습니다.")
        
        member_info = dim_res.data[0]
        member_name = member_info.get("name") # 법안 조회에 사용할 이름

        # 현재 소속 위원회 이름 변환
        current_c_id = member_info.get("committee_id")
        current_committee_name = id_to_name_map.get(current_c_id) or "소속 위원회 없음"

        # 2. 상임위 활동 이력 조회 (committees_history 테이블)
        # ---------------------------------------------------------
        # 최신순 정렬 (start_date 내림차순)
        comm_hist_res = (
            supabase.table("committees_history")
            .select("*")
            .eq("member_id", member_id)
            .order("start_date", desc=True)
            .execute()
        )
        committee_history_raw = comm_hist_res.data or []

        # committees 테이블의 메인 위원회 이름 집합 생성 (소위원회 접미어 제거)
        valid_committees = {
            _normalize_committee_name(name)
            for name in name_to_id_map.keys()
            if _normalize_committee_name(name)
        }

        # committees 테이블에 없는 위원회 제거 + 소위원회 접미어 제거
        committee_history = []

        for row in committee_history_raw:
            raw_name = row.get("committee")
            main_name = _normalize_committee_name(raw_name)
            if not main_name:
                continue
            if main_name not in valid_committees:
                continue
            committee_history.append({**row, "committee": main_name})

        # 3. 정당 이력 조회 (parties_history 테이블)
        # ---------------------------------------------------------
        # 최신순 정렬
        party_hist_res = (
            supabase.table("parties_history")
            .select("*")
            .eq("member_id", member_id)
            .order("start_date", desc=True)
            .execute()
        )
        party_history = party_hist_res.data or []

        # 4. 대표 발의 법안 조회 (bills 테이블) [추가된 부분]
        # ---------------------------------------------------------
        # bills 테이블에는 member_id가 없으므로 이름(proposer_name)으로 조회합니다.
        representative_bills = []
        if member_name:
            bills_res = (
                supabase.table("bills")
                .select("*")
                .ilike("proposer_name", f"%{member_name}%")  # 대표 발의자 이름 매칭
                .order("proposer_date", desc=True) # 최신순 정렬
                .execute()
            )
            representative_bills = bills_res.data or []

        # 5. 결과 조합 및 반환
        # ---------------------------------------------------------
        return {
            "member_id": member_id,
            "profile": {
                "name": member_info.get("name"),
                "party": member_info.get("party"),
                "district": member_info.get("district"),
                "gender": member_info.get("gender"),
                "elected_count": member_info.get("elected_time") or member_info.get("elected_count"), # 당선 횟수
                "elected_type": member_info.get("elected_type"), # 지역구/비례대표
                "committee": current_committee_name, # 현재 소속 상임위
                "birthdate": member_info.get("birthdate"),
                "age": member_info.get("age"),
                "image_url": member_info.get("img") or member_info.get("image_url") or "",
            },
            "history": {
                "committees": committee_history,
                "parties": party_history
            },
            "representative_bills_count": len(representative_bills), # [추가] 대표 발의 법안 수
            "representative_bills": representative_bills, # [추가] 조회된 법안 리스트
            "message": "성공적으로 조회되었습니다."
        }

    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        print(f"Error fetching legislator detail for {member_id}:", e)
        raise HTTPException(status_code=500, detail=str(e))
    
# [추가] 특정 의원의 상임위 활동 이력 조회 API
@app.get("/api/legislators/{member_id}/committees_history")
def get_member_committee_history(member_id: int):
    try:
        print(f"DEBUG /api/legislators/{member_id}/committees_history")

        # committees_history 테이블 조회
        # start_date 기준 내림차순 정렬 (최신 활동이 먼저 나오도록)
        response = (
            supabase.table("committees_history")
            .select("*")
            .eq("member_id", member_id)
            .order("start_date", desc=True)
            .execute()
        )
        
        history = response.data or []
        
        return {
            "member_id": member_id,
            "count": len(history),
            "history": history
        }

    except Exception as e:
        print(f"Error fetching committee history for {member_id}:", e)
        raise HTTPException(status_code=500, detail=str(e))


# [추가] 특정 의원의 특정 법안에 대한 상세 발언 조회 API
@app.get("/api/legislators/{member_id}/bills/{bill_id}/speeches")
def get_member_bill_speeches_detail(member_id: int, bill_id: str):
    try:
        print(f"DEBUG /api/legislators/{member_id}/bills/{bill_id}/speeches")

        # 1. 법안 이름 조회
        bill_name = "법안명 없음"
        try:
            bill_res = supabase.table("bills").select("bill_name").eq("bill_id", bill_id).execute()
            if bill_res.data:
                bill_name = bill_res.data[0].get("bill_name", "법안명 없음")
        except Exception as e:
            print(f"Warning: Failed to fetch bill name for {bill_id}: {e}")

        # 2. 해당 의원의 발언 조회 (Supabase 레벨에서 bill_id 필터링 시도)
        import re
        target_bid = str(bill_id).strip()
        
        # 먼저 .ilike()를 사용해서 Supabase 레벨에서 필터링 시도
        try:
            response = (
                supabase.table("speeches")
                .select("*")
                .eq("member_id", member_id)
                .ilike("bill_numbers", f"%{target_bid}%")  # bill_numbers 필드에서 bill_id 검색
                .execute()
            )
            rows = response.data or []
            print(f"DEBUG: Supabase .ilike() 필터링 결과: {len(rows)}개 발언")
        except Exception as e:
            print(f"DEBUG: Supabase .ilike() 필터링 실패, 전체 조회 후 Python 필터링: {e}")
            # .ilike() 실패시 전체 조회
            response = supabase.table("speeches").select("*").eq("member_id", member_id).execute()
            rows = response.data or []

        if not rows:
            return {
                "member_id": member_id,
                "member_name": "",
                "bill_id": bill_id,
                "bill_name": bill_name,
                "speeches_count": 0,
                "aiSummary": None,
                "speeches": []
            }

        member_name = rows[0].get("member_name", "")

        # 3. Python 레벨에서 정확한 bill_id 매칭 재확인 (Supabase 필터가 부정확할 수 있음)
        filtered_speeches = []
        
        try:
            target_bid_int = int(target_bid)
        except Exception:
            target_bid_int = None

        def _parse_bill_numbers(val):
            """bill_numbers 필드를 파싱하여 리스트로 변환"""
            if val is None:
                return []
            if isinstance(val, list):
                return [str(b).strip() for b in val if b is not None]
            if isinstance(val, str):
                s = val.strip()
                if s.startswith("[") and s.endswith("]"):
                    try:
                        parsed = ast.literal_eval(s)
                        if isinstance(parsed, list):
                            return [str(x).strip() for x in parsed if x is not None]
                    except Exception:
                        pass
                nums = re.findall(r"\d+", s)
                if nums:
                    return nums
                if "," in s:
                    return [p.strip() for p in s.split(",") if p.strip()]
                return [s]
            return [str(val)]

        for row in rows:
            bill_col_val = row.get("bill_numbers") or row.get("bill_review") or row.get("bills")
            bills_list = _parse_bill_numbers(bill_col_val)

            # bill_id 매칭 확인
            matched = False
            if target_bid_int is not None:
                for b in bills_list:
                    try:
                        if int(str(b).strip()) == target_bid_int:
                            matched = True
                            break
                    except Exception:
                        continue
            
            if not matched:
                normalized = [str(x).strip() for x in bills_list]
                if target_bid in normalized:
                    matched = True

            if matched:
                filtered_speeches.append({
                    "speech_id": row.get("speech_id"),
                    "member_id": row.get("member_id"),
                    "member_name": row.get("member_name"),
                    "speech_length": row.get("speech_length"),
                    "prob_noncoop": row.get("prob_noncoop"),
                    "prob_coop": row.get("prob_coop"),
                    "prob_neutral": row.get("prob_neutral"),
                    "sentiment_label": row.get("sentiment_label"),
                    "score_prob": row.get("score_prob"),
                    "speech_text": row.get("speech_text"),
                    "bill_numbers": str(bills_list)
                })

        # aiSummary 생성
        speeches_count = len(filtered_speeches)
        ai_summary = None
        
        if speeches_count > 0:
            # 평균 협력도 계산
            score_probs = [s.get("score_prob", 0) for s in filtered_speeches if s.get("score_prob") is not None]
            avg_cooperation = sum(score_probs) / len(score_probs) if score_probs else 0
            
            ai_summary = f"해당 의원은 이 법률안에 대해 {speeches_count} 회 발언을 했으며 평균 협력도는 {avg_cooperation:.4f} 입니다."
        
        return {
            "member_id": member_id,
            "member_name": member_name,
            "bill_id": bill_id,
            "bill_name": bill_name,
            "speeches_count": speeches_count,
            "aiSummary": ai_summary,
            "speeches": filtered_speeches
        }

    except Exception as e:
        print(f"Error fetching speeches for member {member_id}, bill {bill_id}:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# 2. AUTHENTICATION & AUTO LOGGING
# ==========================================

@app.post("/register", response_model=schemas.UserOut)
def register_user(user: schemas.UserCreate):
    try:
        # 1. Đăng ký bên Supabase Auth (Code cũ)
        response = supabase.auth.sign_up({
            "email": user.email,
            "password": user.password,
            "options": {"data": {"username": user.username, "full_name": user.full_name}}
        })
        
        if not response.user:
             raise HTTPException(status_code=400, detail="Đăng ký thất bại")

        # ============================================================
        # 🔥 THÊM MỚI: TỰ ĐỘNG GHI LOG KHI TẠO TÀI KHOẢN
        # ============================================================
        try:
            new_user_id = response.user.id
            welcome_log = {
                "user_id": new_user_id,
                "activity_type": "system",       
                "target_name": "Tạo tài khoản",
                "details": f"Chào mừng {user.full_name or user.username} gia nhập hệ thống!"
            }
            # Ghi vào bảng user_logs
            supabase.table("user_logs").insert(welcome_log).execute()
            print("✅ Đã ghi log đăng ký.")
        except Exception as log_error:
            print(f"⚠️ Lỗi ghi log đăng ký: {log_error}")
        # ============================================================

        return {
             "email": response.user.email,
             "username": response.user.user_metadata.get("username"),
             "full_name": response.user.user_metadata.get("full_name")
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/token")
def login_for_access_token(user_data: schemas.UserLogin):
    try:
        # 1. Đăng nhập (Code cũ)
        response = supabase.auth.sign_in_with_password({
            "email": user_data.email, "password": user_data.password
        })
        
        # ============================================================
        # 🔥 THÊM MỚI: TỰ ĐỘNG GHI LOG KHI ĐĂNG NHẬP
        # ============================================================
        try:
            if response.user:
                login_log = {
                    "user_id": response.user.id,
                    "activity_type": "system",
                    "target_name": "Đăng nhập",
                    "details": "Đăng nhập hệ thống thành công"
                }
                supabase.table("user_logs").insert(login_log).execute()
                print(f"✅ Đã ghi log đăng nhập: {user_data.email}")
        except Exception as log_error:
            print(f"⚠️ Lỗi ghi log đăng nhập: {log_error}")
        # ============================================================

        return {
            "access_token": response.session.access_token, 
            "token_type": "bearer",
            "user": {
                "email": response.user.email, 
                "username": response.user.user_metadata.get("username")
            }
        }
    except Exception:
        raise HTTPException(status_code=401, detail="Email hoặc mật khẩu sai.")

# ... (Các API AI khác giữ nguyên) ...

@app.post("/sentiment", response_model=schemas.SentimentOutput)
def analyze_sentiment(data_in: schemas.AnalysisInput, current_user = Depends(get_current_user)):
    return {"label": "협력", "confidence_score": 0.95}

@app.post("/prediction", response_model=schemas.PredictionOutput)
def predict_legislation(data_in: schemas.AnalysisInput, current_user = Depends(get_current_user)):
    return {"label": "가결 ", "probability": 0.88}

@app.get("/api/dashboard-stats")
def get_dashboard_stats():
    return {
        "sentiment": {"cooperative": 12, "non_cooperative": 15, "neutral": 73},
        "prediction": {"bill_name": "인공지능법", "probability": 17.15, "status": "분석 완료"}
    }

@app.get("/")
def read_root():
    return {"message": "K-LegiSight API is running!"}


# ==========================================
# 통합 검색 API (의원 → 법안 순서)
# ==========================================
@app.get("/api/unified-search")
def unified_search(query: str = Query(..., description="검색어 (의원명 또는 법안명)")):
    """
    통합 검색 API
    
    검색 순서:
      1. 의원 이름으로 검색 (dimension 테이블)
      2. 결과가 없으면 법안명으로 검색 (bills 테이블)
    
    반환:
      - type: "legislator" | "bill" | "none"
      - data: 검색된 데이터 (의원 정보 또는 법안 정보)
    """
    try:
        query_str = query.strip()
        
        if not query_str:
            return {"type": "none", "data": None, "message": "검색어를 입력해주세요."}
        
        # 1. 의원 이름으로 검색 (부분 일치)
        legislator_res = (
            supabase.table("dimension")
            .select("*")
            .ilike("name", f"%{query_str}%")
            .limit(1)
            .execute()
        )
        
        if legislator_res.data and len(legislator_res.data) > 0:
            member_data = legislator_res.data[0]
            member_id = member_data.get("member_id") or member_data.get("id")
            
            # 위원회 이름 매핑
            _, id_to_name_map = get_committee_maps()
            committee_id = member_data.get("committee_id")
            committee_name = id_to_name_map.get(committee_id, "소속 위원회 없음")
            
            return {
                "type": "legislator",
                "data": {
                    "member_id": member_id,
                    "name": member_data.get("name"),
                    "party": member_data.get("party"),
                    "committee": committee_name,
                    "region": member_data.get("district") or member_data.get("region"),
                    "gender": member_data.get("gender"),
                    "count": member_data.get("elected_time"),
                    "method": member_data.get("elected_type"),
                    "img": member_data.get("img") or member_data.get("image_url") or ""
                },
                "message": f"의원 '{member_data.get('name')}'을(를) 찾았습니다."
            }
        
        # 2. 법안명으로 검색 (부분 일치)
        bill_res = (
            supabase.table("bills")
            .select("*")
            .ilike("bill_name", f"%{query_str}%")
            .limit(10)
            .execute()
        )
        
        if bill_res.data and len(bill_res.data) > 0:
            bills = []
            for b in bill_res.data:
                bills.append({
                    "bill_id": b.get("bill_id"),
                    "bill_number": b.get("bill_number"),
                    "bill_name": b.get("bill_name"),
                    "proposer": b.get("proposer"),
                    "propose_date": b.get("propose_date"),
                    "committee": b.get("committee")
                })
            
            return {
                "type": "bill",
                "data": bills,
                "message": f"법안 {len(bills)}건을 찾았습니다."
            }
        
        # 3. 검색 결과 없음
        return {
            "type": "none",
            "data": None,
            "message": f"'{query_str}'에 대한 검색 결과가 없습니다."
        }
    
    except Exception as e:
        print(f"Error in unified_search: {e}")
        raise HTTPException(status_code=500, detail=f"통합 검색 중 오류 발생: {str(e)}")


@app.post("/api/bills/analysis", response_model=schemas.BillAnalysisResponse)
def analyze_bill_centric(req: schemas.BillSearchInput):
    """
    법안 검색 및 분석 API (4개 조건 지원)
    
    검색 조건:
      - bill_name: 법안명 (부분 일치)
      - bill_number: 의안번호 (정확 일치)
      - proposer: 대표발의자 (부분 일치)
      - proposer_type: 제안 유형 (의원/정부 등)
    
    반환:
      - total_count: 검색된 법안 수
      - search_conditions: 사용된 검색 조건
      - results: 각 법안별 분석 결과 (기본 정보 + 통계)
    """
    try:
        # --- 1단계: 검색 조건 구성 및 로깅 ---
        search_conditions = {}
        
        if req.bill_name:
            search_conditions["bill_name"] = req.bill_name
        if req.bill_number:
            search_conditions["bill_number"] = req.bill_number
        if req.proposer:
            search_conditions["proposer"] = req.proposer
        if req.proposer_type:
            search_conditions["proposer_type"] = req.proposer_type
        
        print(f"[법안 검색] 조건: {search_conditions}")

        # --- 2단계: bills 테이블에서 법안 검색 ---
        query = supabase.table("bills").select("*")

        # 4개 조건 적용
        if req.bill_number:
            query = query.eq("bill_id", req.bill_number)
        if req.bill_name:
            query = query.ilike("bill_name", f"%{req.bill_name}%")
        if req.proposer:
            query = query.ilike("proposer_name", f"%{req.proposer}%")
        if req.proposer_type:
            query = query.eq("proposer_type", req.proposer_type)

        bills_res = query.execute()
        bills_data = bills_res.data or []

        if not bills_data:
            return {
                "total_count": 0,
                "search_conditions": search_conditions,
                "results": [],
                "message": "검색 조건에 맞는 법안을 찾을 수 없습니다."
            }

        print(f"[법안 검색] 총 {len(bills_data)}건 발견")

        # --- 2-1단계: bill_detail_score에서 평가 데이터 조회 및 정렬 ---
        bill_ids = [bill.get("bill_id") for bill in bills_data if bill.get("bill_id")]
        
        # bill_detail_score 테이블에서 평가 정보 조회
        bill_score_map = {}
        if bill_ids:
            try:
                score_res = (
                    supabase.table("bill_detail_score")
                    .select("bill_number, total_speeches, avg_score_prob, bayesian_score")
                    .in_("bill_number", bill_ids)
                    .execute()
                )
                for score_row in (score_res.data or []):
                    bid = score_row.get("bill_number")
                    bill_score_map[str(bid)] = {
                        "total_speeches": score_row.get("total_speeches", 0),
                        "avg_score_prob": score_row.get("avg_score_prob", 0),
                        "bayesian_score": score_row.get("bayesian_score", 0)
                    }
                print(f"[법안 평가 조회] {len(bill_score_map)}개 법안에 평가 데이터 존재")
            except Exception as e:
                print(f"WARN: bill_detail_score 조회 실패: {e}")
        
        # 평가 데이터 기준으로 정렬: 평가 있는 법안 우선, 그 중에서도 발언 수 많은 순
        def bill_sort_key(bill):
            bid = str(bill.get("bill_id"))
            score_info = bill_score_map.get(bid, {})
            has_score = 1 if bid in bill_score_map else 0
            speeches = score_info.get("total_speeches", 0)
            return (-has_score, -speeches)  # 평가 있는 것 먼저, 발언 많은 것 먼저
        
        bills_data.sort(key=bill_sort_key)
        print(f"[법안 정렬] 평가된 법안 우선 정렬 완료")

        # --- 3단계: 검색된 모든 법안의 통계를 한번에 조회 (최적화) ---
        
        if not bill_ids:
            return {
                "total_count": 0,
                "search_conditions": search_conditions,
                "results": [],
                "message": "유효한 법안 ID를 찾을 수 없습니다."
            }
        
        print(f"[통계 조회] {len(bill_ids)}개 법안의 데이터를 조회합니다.")
        
        # --- 3-1단계: bill_party_score 테이블에서 정당별 점수 조회 (최적화) ---
        party_scores_by_bill: dict[str, list[dict]] = {}
        if bill_ids:
            try:
                print(f"[정당별 점수 조회] {len(bill_ids)}개 법안의 정당별 점수를 조회합니다.")
                print(f"  샘플 bill_ids (처음 3개): {bill_ids[:3]}")
                party_score_res = (
                    supabase.table("bill_party_score")
                    .select("bill_number, party_name, speech_count, avg_score_prob, bayesian_score, original_stance")
                    .in_("bill_number", bill_ids)
                    .execute()
                )
                
                print(f"  조회된 전체 행 수: {len(party_score_res.data or [])}")
                if party_score_res.data:
                    print(f"  첫 번째 행 샘플: {party_score_res.data[0]}")
                
                for ps_row in (party_score_res.data or []):
                    bid = str(ps_row.get("bill_number"))
                    if bid not in party_scores_by_bill:
                        party_scores_by_bill[bid] = []
                    party_scores_by_bill[bid].append(ps_row)
                
                print(f"[정당별 점수 조회] {len(party_scores_by_bill)}개 법안에 정당 데이터 존재")
            except Exception as e:
                print(f"WARN: bill_party_score 조회 실패: {e}")

        # --- 3-2단계: bill_member_score 테이블에서 개인별 점수/발언 수 조회 ---
        member_scores_by_bill: dict[str, list[dict]] = {}
        if bill_ids:
            try:
                print(f"[개인별 점수 조회] {len(bill_ids)}개 법안의 개인별 점수를 조회합니다.")
                member_score_res = (
                    supabase.table("bill_member_score")
                    .select("bill_number, member_id, member_name, party_name, speech_count, bayesian_score, avg_score_prob")
                    .in_("bill_number", bill_ids)
                    .execute()
                )
                
                print(f"  조회된 전체 행 수: {len(member_score_res.data or [])}")
                if member_score_res.data:
                    print(f"  첫 번째 행 샘플: {member_score_res.data[0]}")
                
                for ms_row in (member_score_res.data or []):
                    bid = str(ms_row.get("bill_number"))
                    if bid not in member_scores_by_bill:
                        member_scores_by_bill[bid] = []
                    member_scores_by_bill[bid].append(ms_row)
                print(f"[개인별 점수 조회] {len(member_scores_by_bill)}개 법안에 개인 데이터 존재")
            except Exception as e:
                print(f"WARN: bill_member_score 조회 실패: {e}")
        
        # --- 4단계: 각 법안별 통계 계산 ---
        analysis_results = []
        analyzed_count = 0  # 실제 분석된 법안 수 카운트
        
        for bill in bills_data:
            bill_id = bill.get("bill_id")
            bill_name = bill.get("bill_name")
            
            print(f"[법안 분석] {bill_name} (ID: {bill_id})")
            
            # bill_party_score에서 정당별 점수 가져오기 (우선 사용)
            party_score_rows = party_scores_by_bill.get(str(bill_id), [])
            
            # bill_member_score에서 개인별 점수 가져오기
            member_score_rows = member_scores_by_bill.get(str(bill_id), [])
            
            # 데이터가 전혀 없으면 기본 정보만 포함
            if not party_score_rows and not member_score_rows:
                print(f"  - 데이터 없음, 기본 정보만 포함")
                analysis_results.append({
                    "bill_info": bill,
                    "stats": {
                        "total_speeches": 0,
                        "total_cooperation": 0.0,
                        "party_breakdown": [],
                        "individual_members": []
                    }
                })
                continue
            
            # --- 통계 계산 ---
            total_speeches = 0
            total_score_sum = 0.0
            count_for_score = 0
            party_breakdown = []
            individual_members = []
            
            # [1단계] bill_party_score 사용 - 정당별 협력도
            if party_score_rows:
                print(f"  - bill_party_score 사용: {len(party_score_rows)}개 정당")
                
                for ps_row in party_score_rows:
                    party_name = ps_row.get("party_name")
                    speech_count = ps_row.get("speech_count", 0)
                    bayesian = ps_row.get("bayesian_score")
                    
                    total_speeches += speech_count
                    
                    if bayesian is not None:
                        try:
                            score = float(bayesian)
                            total_score_sum += score * speech_count
                            count_for_score += speech_count
                            
                            party_breakdown.append({
                                "party_name": party_name,
                                "avg_score": score,
                                "member_count": speech_count,
                                "speech_count": speech_count,
                                "stance": ps_row.get("original_stance", "중립")
                            })
                        except (ValueError, TypeError) as e:
                            print(f"  WARN: bayesian_score 변환 실패: {bayesian}, {e}")
                
                party_breakdown.sort(key=lambda x: x['avg_score'], reverse=True)
                print(f"    정당별 분석 완료: {len(party_breakdown)}개 정당")
            
            # [2단계] bill_member_score 사용 - 개인별 협력도
            if member_score_rows:
                print(f"  - bill_member_score 사용: {len(member_score_rows)}명")
                
                for r in member_score_rows:
                    n_speeches = r.get("speech_count", 0)
                    score = r.get("bayesian_score")
                    
                    if score is None:
                        score = r.get("avg_score_prob")
                    
                    individual_members.append({
                        "member_id": r.get("member_id"),
                        "member_name": r.get("member_name"),
                        "party_name": r.get("party_name"),
                        "n_speeches": n_speeches,
                        "score": score
                    })
                
                # 협력도 높은 순으로 정렬
                individual_members.sort(key=lambda x: x['score'] if x['score'] is not None else 0, reverse=True)
                print(f"    개인별 분석 완료: {len(individual_members)}명")
            
            # 평균 협력도 계산
            avg_cooperation = total_score_sum / count_for_score if count_for_score > 0 else 0.0
            
            print(f"  - 최종 통계: speeches={total_speeches}, cooperation={avg_cooperation:.4f}, parties={len(party_breakdown)}, members={len(individual_members)}")
            
            # 분석 완료 여부 판단
            if total_speeches > 0 or party_breakdown or individual_members:
                analyzed_count += 1
            
            # 결과 추가
            analysis_results.append({
                "bill_info": bill,
                "stats": {
                    "total_speeches": total_speeches,
                    "total_cooperation": avg_cooperation,
                    "party_breakdown": party_breakdown,
                    "individual_members": individual_members
                }
            })
        
        # --- 5단계: 결과 정리 및 반환 ---
        return {
            "total_count": len(analysis_results),
            "analyzed_count": analyzed_count,  # 실제 분석된 법안 수
            "search_conditions": search_conditions,
            "results": analysis_results,
            "message": f"총 {len(analysis_results)}건 검색, {analyzed_count}건 분석 완료"
        }

    except Exception as e:
        print("Error in Bill Analysis:", e)
        raise HTTPException(status_code=500, detail=str(e))

# [추가] public 스키마의 각 테이블에서 5개 행씩 미리보기 제공
def _fetch_table_preview(table_name: str, limit: int):
    """
    Helper to fetch a small sample for a given table.
    """
    try:
        res = supabase.table(table_name).select("*").limit(limit).execute()
        return res.data or []
    except Exception as e:
        print(f"Error fetching preview for {table_name}:", e)
        return {"error": str(e)}


@app.get("/api/public-table-previews")
def get_public_table_previews(limit: int = 5):
    """
    Return up to 5 rows (default) from every public schema table defined in TABLE_PREVIEW_NAMES.
    """
    safe_limit = max(1, min(limit, 50))  # guardrails to prevent heavy scans
    previews = {name: _fetch_table_preview(name, safe_limit) for name in TABLE_PREVIEW_NAMES}
    return {"limit": safe_limit, "tables": previews}





@app.get("/api/committee-summary/{committee_id}")
def get_committee_summary(committee_id: int):
    """\
    위원회(소위원회) 이름을 기준으로 아래 정보를 묶어서 반환하는 API
      - committee_total_score 테이블: bayesian_score
      - committee_member_ranking 테이블: rank_in_committee 기준 상위 5명
      - committee_bill_ranking 테이블: rank_in_committee 기준 상위 5개 법안

    예상 반환 구조 예시:
    {
      "committee": "과학기술정보방송통신위원회-과학기술원자력법안심사소위원회",
      "committee_id": 1,
      "bayesian_score": 0.0250,
      "members_top5": [ ... ],
      "bills_top5": [ ... ]
    }
    """
    try:
        print(f"DEBUG /api/committee-summary/{committee_id}")

        # 0. committees 테이블에서 committee_id 조회 (있으면 함께 리턴)
        committee_name = None
        try:
            com_res = (
                supabase.table("committees")
                .select("committee_id, committee")
                .eq("committee_id", committee_id)
                .execute()
            )
            com_rows = com_res.data or []
            print(com_res)
            if com_rows:
                committee_name = com_rows[0].get("committee")
        except Exception as e:
            # committees 테이블이 없거나 조회 실패해도 치명적이지 않으므로 로그만 남기고 계속 진행
            print(f"WARN: committees 조회 실패: {e}")

        # 1. committee_total_score 에서 bayesian_score 조회
        score_res = (
            supabase.table("committee_total_score")
            .select("committee, bayesian_score, adjusted_stance")
            .eq("committee", committee_name)
            .execute()
        )
        score_rows = score_res.data or []
        if not score_rows:
            # 점수가 없으면 404로 처리
            raise HTTPException(
                status_code=404,
                detail=f"committee_total_score 에서 '{committee_name}' 데이터를 찾을 수 없습니다.",
            )
        bayesian_score = score_rows[0].get("bayesian_score")

        # 2. committee_member_ranking: rank_in_committee 기준 상위 5명
        member_res = (
            supabase.table("committee_member_ranking")
            .select(
                "committee, member_id, member_name, speech_count, total_speech_length, avg_speech_length, activity_score, rank_in_committee"
            )
            .eq("committee", committee_name)
            .order("rank_in_committee")
            .limit(5)
            .execute()
        )
        members_top5 = member_res.data or []
        
        # members_top5에 party_id, party_name 추가
        if members_top5:
            member_ids = [m.get("member_id") for m in members_top5 if m.get("member_id")]
            if member_ids:
                try:
                    dim_res = (
                        supabase.table("dimension")
                        .select("member_id, party_id, party")
                        .in_("member_id", member_ids)
                        .execute()
                    )
                    # member_id -> {party_id, party_name} 매핑
                    party_map = {
                        d.get("member_id"): {
                            "party_id": d.get("party_id"),
                            "party_name": d.get("party")
                        }
                        for d in (dim_res.data or [])
                    }
                    # members_top5에 party 정보 추가
                    for member in members_top5:
                        mid = member.get("member_id")
                        if mid and mid in party_map:
                            member["party_id"] = party_map[mid]["party_id"]
                            member["party_name"] = party_map[mid]["party_name"]
                except Exception as e:
                    print(f"WARN: dimension 조회 실패 (party 정보): {e}")

        # 3. committee_bill_ranking: rank_in_committee 기준 상위 5개 법안
        bill_res = (
            supabase.table("committee_bill_ranking")
            .select(
                "committee, bill_name, bill_number, speech_count, total_speech_length, avg_speech_length, bill_activity_score, rank_in_committee"
            )
            .eq("committee", committee_name)
            .order("rank_in_committee")
            .limit(10)  # 중복 제거를 위해 더 많이 조회
            .execute()
        )
        bills_raw = bill_res.data or []
        
        # bill_name 중복 제거 (첫 번째 법안만 유지)
        seen_names = set()
        bills_top5 = []
        for bill in bills_raw:
            bill_name = bill.get("bill_name")
            if bill_name and bill_name not in seen_names:
                seen_names.add(bill_name)
                bills_top5.append(bill)
                if len(bills_top5) >= 5:
                    break

        return {
            "committee": committee_name,
            "adjusted_stance": score_rows[0].get("adjusted_stance"),
            "committee_id": committee_id,
            "bayesian_score": bayesian_score,
            "members_top5": members_top5,
            "bills_top5": bills_top5,
        }

    except HTTPException:
        # 이미 의미 있는 HTTPException 을 만든 경우 그대로 raise
        raise
    except Exception as e:
        print(f"Error in /api/committee-summary/{committee_name}:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# 법안 통과 가능성 예측 API
# ==========================================
@app.post("/api/predict/bill-pass", response_model=BillPredictionOutput)
def predict_bill_pass(data: BillKeywordInput):
    """
    📊 법안 키워드를 입력받아 통과 가능성을 예측하는 API
    
    입력:
      - keyword: 법안 키워드 (예: "인공지능", "환경", "교육")
    
    반환:
      - predicted_pass_probability: 가결 확률 (0 ~ 1)
      - legislative_gap: 입법 괴리율 (score + level)
      - confidence: 신뢰도 (score + level)
      - explanation: 자연어 설명
      - evidence_bills: 근거가 된 과거 법안 목록
    """
    try:
        keyword = data.keyword.strip()
        
        if not keyword:
            raise HTTPException(status_code=400, detail="법안 키워드를 입력해주세요.")
        
        print(f"[INFO] /api/predict/bill-pass 요청: keyword='{keyword}'")
        
        # predict_bill_pass_probability 함수 호출
        result = predict_bill_pass_probability(keyword)
        
        # numpy 타입 변환 (JSON 직렬화 안전성)
        if result.get("legislative_gap") and isinstance(result["legislative_gap"], dict):
            if isinstance(result["legislative_gap"].get("score"), float):
                result["legislative_gap"]["score"] = float(result["legislative_gap"]["score"])
        
        if result.get("confidence") and isinstance(result["confidence"], dict):
            if isinstance(result["confidence"].get("score"), float):
                result["confidence"]["score"] = float(result["confidence"]["score"])
        
        # evidence_bills 타입 변환
        if result.get("evidence_bills"):
            for eb in result["evidence_bills"]:
                if "avg_score_prob" in eb:
                    eb["avg_score_prob"] = float(eb["avg_score_prob"])
                if "similarity" in eb:
                    eb["similarity"] = float(eb["similarity"])
        
        return result
    
    except HTTPException as http_ex:
        raise http_ex
    except Exception as e:
        print(f"Error in /api/predict/bill-pass: {e}")
        raise HTTPException(status_code=500, detail=f"법안 예측 중 오류: {str(e)}")

# API Dashboard
# Thay thế hàm get_user_dashboard cũ trong main.py bằng đoạn này:

@app.get("/api/dashboard/me", response_model=schemas.DashboardData)
def get_user_dashboard(current_user = Depends(get_current_user)):
    """
    Lấy dữ liệu tổng hợp cho trang Dashboard (Phiên bản Fix lỗi 500)
    """
    user_id = current_user.id
    
    try:
        # 1. Lấy thống kê (Dùng count='exact', head=True để chỉ lấy số lượng, không lấy data cho nhẹ)
        logs_count_res = supabase.table("user_logs").select("*", count="exact", head=True).eq("user_id", user_id).execute()
        total_activities = logs_count_res.count if logs_count_res.count is not None else 0
        
        saved_count_res = supabase.table("user_bookmarks").select("*", count="exact", head=True).eq("user_id", user_id).execute()
        total_saved = saved_count_res.count if saved_count_res.count is not None else 0

        # 2. Lấy 5 hoạt động gần nhất
        logs_res = (
            supabase.table("user_logs")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(5)
            .execute()
        )
        # Fix lỗi: Nếu data là None thì gán list rỗng
        recent_logs = logs_res.data if logs_res.data else []

        # 3. Lấy bookmark
        bookmarks_res = (
            supabase.table("user_bookmarks")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
        # Fix lỗi: Nếu data là None thì gán list rỗng
        saved_items = bookmarks_res.data if bookmarks_res.data else []

        # 4. Trả về (Đảm bảo đúng format Pydantic)
        return {
            "user_info": {
                "email": current_user.email,
                "name": current_user.user_metadata.get("full_name", "User") or "User", # Fix lỗi nếu full_name null
                "plan": "Free Plan"
            },
            "stats": {
                "total_activities": total_activities,
                "total_saved": total_saved,
                "trend": "Active"
            },
            "recent_activities": recent_logs,
            "saved_bills": saved_items
        }

    except Exception as e:
        # In lỗi chi tiết ra terminal để debug nếu vẫn bị
        print(f"🔥 Dashboard Error Details: {str(e)}")
        # Trả về dữ liệu rỗng thay vì lỗi 500 để App không bị sập
        return {
            "user_info": {"email": current_user.email, "name": "User", "plan": "Error"},
            "stats": {"total_activities": 0, "total_saved": 0, "trend": "Error"},
            "recent_activities": [],
            "saved_bills": []
        }


# ==========================================
# 5. USER ACTION LOGGING (Thêm vào cuối main.py)
# ==========================================

@app.post("/api/log/activity")
def log_user_activity(log: schemas.UserLogInput, current_user = Depends(get_current_user)):
    try:
        data = {
            "user_id": current_user.id,
            "activity_type": log.activity_type,
            "target_name": log.target_name,
            "details": log.details
        }
        supabase.table("user_logs").insert(data).execute()
        return {"status": "success"}
    except Exception as e:
        print("Log Error:", e)
        return {"status": "error"}


@app.post("/api/bookmark")
def toggle_bookmark(item: schemas.BookmarkInput, current_user = Depends(get_current_user)):
    """
    Thêm/Xóa bookmark (Nếu có rồi thì xóa, chưa có thì thêm)
    """
    user_id = current_user.id
    try:
        # Kiểm tra xem đã bookmark chưa
        existing = (
            supabase.table("user_bookmarks")
            .select("*")
            .eq("user_id", user_id)
            .eq("item_type", item.item_type)
            .eq("item_id", item.item_id)
            .execute()
        )
        
        if existing.data:
            # Nếu có rồi -> Xóa (Un-bookmark)
            supabase.table("user_bookmarks").delete().eq("id", existing.data[0]['id']).execute()
            return {"status": "removed", "msg": "Bookmark removed"}
        else:
            # Chưa có -> Thêm mới
            data = {
                "user_id": user_id,
                "item_type": item.item_type,
                "item_id": item.item_id,
                "title": item.title,
                "score": item.score,
                "status": "Tracking"
            }
            supabase.table("user_bookmarks").insert(data).execute()
            return {"status": "added", "msg": "Bookmark added"}
            
    except Exception as e:
        print("Bookmark Error:", e)
        raise HTTPException(status_code=500, detail=str(e))


    