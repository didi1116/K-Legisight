
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from contextlib import asynccontextmanager
from typing import List
import schemas 
from database import supabase 
import random 
from fastapi import FastAPI, Depends, HTTPException, status, Query, APIRouter
import pandas as pd
from build_member_stats import build_member_stats
from sqlalchemy.orm import Session
from util_common import compute_score_prob, compute_speech_length
import ast

TABLE_PREVIEW_NAMES = [
    "bills",
    "committees",
    "committees_history",
    "dimension",
    "meetings",
    "member_bill_stats",
    "member_stats",
    "parties",
    "parties_history",
    "speeches",
]


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
        name = row.get("name")

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

            results.append({
                "id": member_pk,          
                "member_id": member_pk,  
                "name": item.get("name"),
                "party": item.get("party"),
                "region": item.get("district") or item.get("region") or "비례대표",
                "committee": committee_name,
                "gender": item.get("gender", "-"),
                "count": item.get("elected_time") or item.get("elected_count") or "초선",
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
        com_res = supabase.table('committees').select("name").execute()
        committee_names = sorted([c['name'] for c in com_res.data if c.get('name')])

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
            "committees": committee_names, # Danh sách tên ủy ban đầy đủ lấy từ bảng committees
            "genders": get_unique_values(['gender']),
            "regions": get_unique_values(['district', 'region']), # Thử cả 2 tên cột
            "counts": ["초선", "재선", "3선", "4선", "5선", "6선"], 
            "methods": ["지역구", "비례대표"],
        }
    except Exception as e:
        print("Lỗi Filter:", e)
        # Trả về mảng rỗng để FE không bị crash
        return {
            "parties": [], "committees": [], "genders": [], 
            "regions": [], "counts": [], "methods": []
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
        # 1) 정당 기본 정보
        party_res = (
            supabase.table("parties")
            .select("*")
            .eq("party_id", party_id)
            .limit(1)
            .execute()
        )
        party_row = party_res.data[0] if party_res.data else None
        if not party_row:
            raise HTTPException(status_code=404, detail="정당을 찾을 수 없습니다.")

        party_name = party_row.get("name") or party_row.get("party_name") or f"party-{party_id}"

        # 2) 해당 정당 소속 의원 조회
        dim_res = (
            supabase.table("dimension")
            .select("member_id, name, party_id, party")
            .eq("party_id", party_id)
            .execute()
        )
        members = dim_res.data or []
        member_ids = [m.get("member_id") for m in members if m.get("member_id") is not None]
        name_map = {m.get("member_id"): m.get("name") for m in members}

        if not member_ids:
            return {
                "party_id": party_id,
                "party_name": party_name,
                "message": "해당 정당에 소속된 의원 데이터가 없습니다.",
                "member_top5": [],
                "member_bottom5": [],
                "bill_top5": [],
                "bill_bottom5": [],
                "total_cooperation": None,
                "analyzed_members": 0,
            }

        # 3) member_stats 가져와 협력도 산출
        member_stats_rows = []
        for chunk in _chunk_list(member_ids, size=150):
            res = supabase.table("member_stats").select("*").in_("member_id", chunk).execute()
            member_stats_rows.extend(res.data or [])

        member_entries = []
        for row in member_stats_rows:
            m_id = row.get("member_id")
            score = _extract_member_score(row)
            if score is None:
                continue

            speeches_raw = row.get("total_speeches") or row.get("n_speeches")
            try:
                n_speeches = int(_safe_float(speeches_raw) or 0)
            except Exception:
                n_speeches = 0

            member_entries.append({
                "member_id": m_id,
                "member_name": row.get("member_name") or name_map.get(m_id) or "이름 없음",
                "cooperation_score": score,
                "stance": _stance_from_score(score),
                "total_speeches": n_speeches
            })

        # 총 협력도 (발언 수 가중 평균)
        weight_sum = 0
        score_sum = 0.0
        for entry in member_entries:
            w = entry["total_speeches"] if entry["total_speeches"] > 0 else 1
            weight_sum += w
            score_sum += entry["cooperation_score"] * w
        total_cooperation = round(score_sum / weight_sum, 4) if weight_sum > 0 else None

        # 상/하위 5명
        sorted_members = sorted(member_entries, key=lambda x: x["cooperation_score"])
        member_bottom5 = sorted_members[:5]
        member_top5 = list(reversed(sorted_members[-5:]))

        # 4) 정당 주요 법안 (member_bill_stats 기반)
        bill_rows = []
        for chunk in _chunk_list(member_ids, size=120):
            res = (
                supabase.table("member_bill_stats")
                .select("*")
                .in_("member_id", chunk)
                .execute()
            )
            bill_rows.extend(res.data or [])

        bill_agg = {}
        for row in bill_rows:
            bill_id = row.get("bill_id") or row.get("bill_number") or row.get("billNo")
            if bill_id is None or str(bill_id).strip() == "":
                continue
            bill_id = str(bill_id)

            score = _extract_bill_score(row)
            if score is None:
                continue

            weight_raw = row.get("n_speeches_bill") or row.get("n_speech_bill") or row.get("n_speeches") or 1
            try:
                weight = float(_safe_float(weight_raw) or 1.0)
            except Exception:
                weight = 1.0

            if bill_id not in bill_agg:
                bill_agg[bill_id] = {
                    "weighted_sum": 0.0,
                    "weight": 0.0,
                    "samples": 0,
                    "bill_review": row.get("bill_review")
                }

            bill_agg[bill_id]["weighted_sum"] += score * weight
            bill_agg[bill_id]["weight"] += weight
            bill_agg[bill_id]["samples"] += 1

        # bill_id -> bill_name 매핑
        bill_name_map = {}
        bill_ids = list(bill_agg.keys())
        for chunk in _chunk_list(bill_ids, size=150):
            try:
                bill_res = (
                    supabase.table("bills")
                    .select("bill_id, bill_name")
                    .in_("bill_id", chunk)
                    .execute()
                )
                for item in bill_res.data or []:
                    bill_name_map[str(item.get("bill_id"))] = item.get("bill_name")
            except Exception as e:
                print("WARN: bill lookup chunk failed:", e)

        bill_entries = []
        for b_id, agg in bill_agg.items():
            if agg["weight"] <= 0:
                continue
            avg_score = agg["weighted_sum"] / agg["weight"]
            bill_entries.append({
                "bill_id": b_id,
                "bill_name": bill_name_map.get(b_id) or agg.get("bill_review") or b_id,
                "cooperation_score": avg_score,
                "stance": _stance_from_score(avg_score),
                "samples": agg["samples"]
            })

        bill_entries_sorted = sorted(bill_entries, key=lambda x: x["cooperation_score"])
        bill_bottom5 = bill_entries_sorted[:5]
        bill_top5 = list(reversed(bill_entries_sorted[-5:]))

        return {
            "party_id": party_id,
            "party_name": party_name,
            "total_cooperation": total_cooperation,
            "analyzed_members": len(member_entries),
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

        bills = []
        for idx, row in enumerate(rows, start=1):
            # bill_id를 사용
            bill_id_val = str(row.get("bill_id", ""))
            
            # [수정] bill_name_map에서 실제 법안 이름을 찾음. 없으면 ID 그대로 사용하거나 대체 텍스트 사용
            bill_name_real = bill_name_map.get(bill_id_val, bill_id_val)

            member_name = row.get("member_name", "")

            # 발언 관련 통계
            n_speeches = row.get("n_speeches_bill") or row.get("n_speech_bill") or 0
            total_len = row.get("total_speech_length_bill") or 0

            # 태도 / 점수
            stance = row.get("stance") or "중립"
            raw_prob = row.get("score_prob_mean")
            
            # 소수점 2자리로 제한
            if raw_prob is not None:
                raw_prob = round(raw_prob, 2)

            if raw_prob is not None:
                raw_prob = round(raw_prob, 3)

            if raw_prob is not None:
                try:
                    p = float(raw_prob)          # -1 ~ 1 이라고 가정
                    score = max(0, min(100, round((p + 1) / 2 * 100)))
                except Exception:
                    score = 50
            else:
                score = 50

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
                "billName": bill_name_real, # [수정됨] 실제 법안 이름 할당
                "proposer": member_name,
                "role": "심사 참여",
                "nSpeeches": n_speeches,
                "totalSpeechLength": total_len,
                "sentiment": stance,
                "score": score,
                "scoreProbMean": raw_prob,
                "date": proposal_date,
                "meetingId": meeting_id,
            })

        # 간단 요약
        total_bills = len(bills)
        total_speeches = sum(b["nSpeeches"] for b in bills)
        total_length = sum(b["totalSpeechLength"] for b in bills)

        if total_bills > 0:
            avg_speeches = round(total_speeches / total_bills, 1)
            avg_length = round(total_length / total_bills, 1)
            ai_summary = (
                f"해당 의원은 총 {total_bills}건의 법안 심사에 참여했습니다. "
                f"법안 1건당 평균 발언 횟수는 {avg_speeches}회, "
                f"평균 발언 분량은 {avg_length}문장 수준입니다."
            )
        else:
            ai_summary = "이 의원의 법안 심사 데이터가 없습니다."

        return {"bills": bills, "ai_summary": ai_summary}

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
    
# [추가] 특정 의원의 상세 정보(기본정보 + 상임위/정당 이력) 조회 API
@app.get("/api/legislators/{member_id}/detail")
def get_legislator_detail(member_id: int):

    try:
        print(f"DEBUG /api/legislators/{member_id}/detail")

        # 1. 기본 정보 조회 (dimension 테이블)
        # ---------------------------------------------------------
        # committee_id 매핑을 위해 맵 가져오기
        _, id_to_name_map = get_committee_maps()

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
        committee_history = comm_hist_res.data or []

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
                .eq("proposer_name", member_name)  # 대표 발의자 이름 매칭
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

        # 1. 법안 이름 조회 (bills 테이블)
        # ---------------------------------------------------------
        bill_name = "법안명 없음"
        try:
            bill_res = (
                supabase.table("bills")
                .select("bill_name")
                .eq("bill_id", bill_id)
                .execute()
            )
            if bill_res.data:
                bill_name = bill_res.data[0].get("bill_name")
        except Exception as e:
            print(f"Warning: Failed to fetch bill name for {bill_id}: {e}")

        # 2. 해당 의원의 전체 발언 조회 (speeches 테이블)
        # ---------------------------------------------------------
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
                "bill_id": bill_id,
                "bill_name": bill_name,
                "count": 0,
                "speeches": [],
                "message": "해당 의원의 발언 데이터가 없습니다."
            }

        # 3. Python 레벨에서 bill_id 포함 여부 필터링
        # ---------------------------------------------------------
        filtered_speeches = []
        
        for row in rows:
            # 컬럼명이 bill_numbers, bill_review, bills 중 하나일 수 있음
            bill_col_val = row.get("bill_numbers") or row.get("bill_review") or row.get("bills")
            
            # 리스트 파싱 (문자열 "['210001']" -> 리스트 ['210001'])
            bills_list = []
            if isinstance(bill_col_val, list):
                bills_list = [str(b) for b in bill_col_val]
            elif isinstance(bill_col_val, str):
                try:
                    # 리스트 형태 문자열 파싱 시도
                    if bill_col_val.strip().startswith("["):
                        parsed = ast.literal_eval(bill_col_val)
                        if isinstance(parsed, list):
                            bills_list = [str(b) for b in parsed]
                        else:
                            bills_list = [bill_col_val]
                    else:
                        # 단순 문자열이면 그대로 포함
                        bills_list = [bill_col_val]
                except:
                    bills_list = [bill_col_val]
            
            # 해당 발언이 요청된 bill_id를 포함하고 있는지 확인
            if str(bill_id) in bills_list:
                filtered_speeches.append({
                    "speech_id": row.get("speech_id"),
                    "date": row.get("speech_date") or row.get("date"), # 날짜 컬럼이 있다면 추가
                    "meeting_id": row.get("meeting_id"),
                    "speech_text": row.get("speech_text"),
                    "sentiment": row.get("sentiment_label"),
                    "score": row.get("score_prob"),
                    "prob_coop": row.get("prob_coop"),
                    "prob_noncoop": row.get("prob_noncoop")
                })

        # 4. 결과 반환
        return {
            "member_id": member_id,
            "bill_id": bill_id,
            "bill_name": bill_name,
            "count": len(filtered_speeches),
            "speeches": filtered_speeches
        }

    except Exception as e:
        print(f"Error fetching speeches for member {member_id}, bill {bill_id}:", e)
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================
# 2. AUTHENTICATION & AI (GIỮ NGUYÊN)
# ==========================================

@app.post("/register", response_model=schemas.UserOut)
def register_user(user: schemas.UserCreate):
    try:
        response = supabase.auth.sign_up({
            "email": user.email,
            "password": user.password,
            "options": {"data": {"username": user.username, "full_name": user.full_name}}
        })
        if not response.user:
             raise HTTPException(status_code=400, detail="실패")
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
        response = supabase.auth.sign_in_with_password({
            "email": user_data.email, "password": user_data.password
        })
        return {
            "access_token": response.session.access_token, "token_type": "bearer",
            "user": {"email": response.user.email, "username": response.user.user_metadata.get("username")}
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
        "sentiment": {"cooperative": 65, "non_cooperative": 35, "neutral": 0},
        "prediction": {"bill_name": "AI 기본법 (안)", "probability": 87, "status": "예측 완료"}
    }

@app.get("/")
def read_root():
    return {"message": "K-LegiSight API is running!"}



@app.get("/api/bills/")
def get_bills():
    response = supabase.table("bills").select("*").limit(100).execute()
    return {"bills": response.data}






@app.post("/api/bills/analysis", response_model=schemas.BillAnalysisResponse)
def analyze_bill_centric(req: schemas.BillSearchInput):
    try:
        print(f"Searching Bill: {req.bill_name} | No: {req.bill_number}")

        # --- BƯỚC 1: Tìm thông tin cơ bản của Bill (Metadata) ---
        query = supabase.table("bills").select("*")

        if req.bill_number:
            query = query.eq("bill_no", req.bill_number) # Giả sử cột là bill_no hoặc bill_id
        elif req.bill_name:
            query = query.ilike("bill_name", f"%{req.bill_name}%")
        
        if req.proposer:
            query = query.ilike("proposer", f"%{req.proposer}%")
        
        # Nếu có cột submission_type trong DB
        # if req.submission_type:
        #     query = query.eq("proposer_type", req.submission_type)

        bills_res = query.limit(1).execute() # Lấy bill phù hợp nhất
        bill_data = bills_res.data[0] if bills_res.data else None

        if not bill_data:
            return {
                "bill_info": {},
                "stats": {"total_speeches": 0, "total_cooperation": 0, "party_breakdown": []},
                "message": "Không tìm thấy pháp án phù hợp."
            }

        target_bill_name = bill_data.get("bill_name")
        print(f"Found Bill: {target_bill_name}")

        # --- BƯỚC 2: Tính toán thống kê từ member_bill_stats ---
        # Tìm tất cả bản ghi thống kê liên quan đến tên Bill này
        # (Lưu ý: bill_review trong member_bill_stats là tên bill)
        stats_query = (
            supabase.table("member_bill_stats")
            .select("*")
            .ilike("bill_review", f"%{target_bill_name}%") 
            .execute()
        )
        stats_rows = stats_query.data or []

        if not stats_rows:
             return {
                "bill_info": bill_data,
                "stats": {"total_speeches": 0, "total_cooperation": 0, "party_breakdown": []},
                "message": "Pháp án này chưa có dữ liệu phân tích phát biểu."
            }

        # --- BƯỚC 3: Aggregation (Tính toán) ---
        
        total_speeches = 0
        total_score_sum = 0
        count_for_score = 0
        
        # Để tính theo đảng, ta cần map member_id -> party
        # Lấy danh sách member_id từ kết quả stats để query bảng dimension
        member_ids = [r['member_id'] for r in stats_rows]
        
        # Lấy thông tin đảng của các member này
        dim_res = supabase.table("dimension").select("member_id, party").in_("member_id", member_ids).execute()
        member_party_map = {d['member_id']: d['party'] for d in dim_res.data} # {101: 'TheMinjoo', ...}

        party_agg = {} # { 'TheMinjoo': [score1, score2], 'PPP': [score...] }

        for row in stats_rows:
            # 1. Tổng phát biểu
            n_speech = row.get("n_speeches_bill") or 0
            total_speeches += n_speech

            # 2. Xử lý điểm số
            raw_prob = row.get("score_prob_mean")
            if raw_prob is not None:
                # Convert -1~1 to 0~100
                score = max(0, min(100, round((float(raw_prob) + 1) / 2 * 100)))
                
                total_score_sum += score
                count_for_score += 1

                # 3. Gom nhóm theo đảng
                m_id = row.get("member_id")
                party = member_party_map.get(m_id, "Unknown")
                
                if party not in party_agg:
                    party_agg[party] = []
                party_agg[party].append(score)

        # Tính trung bình tổng
        avg_total_coop = round(total_score_sum / count_for_score, 1) if count_for_score > 0 else 50

        # Tính trung bình theo đảng
        party_breakdown = []
        for p_name, scores in party_agg.items():
            if p_name == "Unknown": continue
            avg = round(sum(scores) / len(scores), 1)
            party_breakdown.append({
                "party_name": p_name,
                "avg_score": avg,
                "member_count": len(scores)
            })

        # Sắp xếp đảng nào hợp tác nhất lên đầu
        party_breakdown.sort(key=lambda x: x['avg_score'], reverse=True)

        return {
            "bill_info": bill_data,
            "stats": {
                "total_speeches": total_speeches,
                "total_cooperation": avg_total_coop,
                "party_breakdown": party_breakdown
            },
            "message": "Phân tích hoàn tất."
        }

    except Exception as e:
        print("Error Bill Analysis:", e)
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
