"""
build_member_bill_stats.py
----------------------------------------
📌 목적:
- 의원(member_id) × 법안(bill_review) 단위의 상세 통계를 생성한다.
- UI에서 "특정 의원 → 어떤 법안에서 협력/비협력/중립인지"를 조회할 때 필요한 데이터.

📌 입력:
- ./analysis_by_sen/output_member/all_speeches.pkl

📌 출력:
- ./analysis_by_sen/output_member/member_bill_stats.csv

📌 생성 컬럼:
- member_id / member_name
- bill_review (법안 이름 원문)
- n_speeches .................. 해당 법안에서 한 발언 수
- total_speech_length_bill .... 발언 길이 총합
- avg_speech_length_bill ...... 발언 길이 평균
- score_prob_mean ............. 평균 협력도 점수
- stance ....................... 협력/비협력/중립 판단 (score 기반)

⚠️ bill_review는 리스트 형태이므로 explode 반드시 필요.
"""

import pandas as pd
from util_common import compute_score_prob, compute_speech_length

INPUT_PICKLE = "./output_member/all_speeches.pkl"
OUTPUT_CSV   = "./output_member/member_bill_stats.csv"

if __name__ == "__main__":

    # ---------------------------------------------------------
    # 1) 전체 발언 로드
    # ---------------------------------------------------------
    try:
        df = pd.read_pickle(INPUT_PICKLE)
    except FileNotFoundError:
        raise FileNotFoundError(f"[ERROR] all_speeches.pkl 없음: {INPUT_PICKLE}")

    # ---------------------------------------------------------
    # 2) sentiment_prob 확률 추출
    # ---------------------------------------------------------
    def get_prob(x, key):
        if isinstance(x, dict):
            return x.get(key, 0.0)
        return 1.0 if key == "neutral" else 0.0

    df["prob_noncoop"] = df["sentiment_prob"].apply(lambda x: get_prob(x, "noncoop"))
    df["prob_coop"]    = df["sentiment_prob"].apply(lambda x: get_prob(x, "coop"))
    df["prob_neutral"] = df["sentiment_prob"].apply(lambda x: get_prob(x, "neutral"))

    # ---------------------------------------------------------
    # 3) score_prob 및 발언 길이 계산
    # ---------------------------------------------------------
    df["score_prob"]    = df.apply(lambda r: compute_score_prob(r["prob_coop"], r["prob_noncoop"]), axis=1)
    df["speech_length"] = df["speech_text"].apply(compute_speech_length)

    # ---------------------------------------------------------
    # 4) bill_review 리스트 → 행 확장
    # ---------------------------------------------------------
    df = df.explode("bill_review")
    df = df[df["bill_review"].notna()]   # None 제거

    # ---------------------------------------------------------
    # 5) 의원 × 법안 단위 통계 집계
    # ---------------------------------------------------------
    agg = df.groupby(["member_id", "member_name", "bill_review"]).agg(
        n_speeches=("speech_id", "count"),
        total_speech_length_bill=("speech_length", "sum"),
        avg_speech_length_bill=("speech_length", "mean"),
        score_prob_mean=("score_prob", "mean")
    ).reset_index()

    # ---------------------------------------------------------
    # 6) stance 판단 (협력/비협력/중립)
    # ---------------------------------------------------------
    def stance(score):
        if score > 0.15:
            return "협력"
        elif score < -0.15:
            return "비협력"
        return "중립"

    agg["stance"] = agg["score_prob_mean"].apply(stance)

    # ---------------------------------------------------------
    # 7) score_prob_mean도 엑셀에서 깨지지 않도록 문자열 변환
    # ---------------------------------------------------------
    agg["score_prob_mean"] = agg["score_prob_mean"].apply(lambda x: f"{x:.20f}")

    # ---------------------------------------------------------
    # 8) 정렬 후 저장
    # ---------------------------------------------------------
    agg = agg.sort_values(["member_id", "bill_review"])

    agg.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")

    print("==============================================")
    print("[SUCCESS] member_bill_stats.csv 생성 완료")
    print(" → 저장 위치:", OUTPUT_CSV)
    print(" → 총 행 수:", len(agg))
    print("==============================================")