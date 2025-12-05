"""
build_member_stats.py
----------------------------------------
📌 목적:
- 의원(member_id) 단위의 전체 요약 통계를 생성한다.
- 전체 발언을 기반으로 협력도 평균, 발언량, 법안 참여 수 등을 계산한다.
- UI에서 "의원 프로필"에 해당하는 핵심 데이터.

📌 입력:
- ./analysis_by_sen/output_member/all_speeches.pkl
  (build_member_load_data.py 에서 생성됨)

📌 기능 요약:
1) sentiment_prob에서 협력/비협력/중립 확률 추출
2) score_prob 계산 (협력도 = coop - noncoop)
3) 발언 길이 계산
4) 의원 단위(groupby member_id)로 통계를 계산
5) 한 의원이 여러 이름(member_name)을 가진 경우 → 가장 많이 등장한 이름(mode) 선택
6) 마지막에 안정적으로 merge하여 NaN 없이 구성
7) member_id 기준 정렬 후 CSV 저장

📌 출력:
- ./analysis_by_sen/output_member/member_stats.csv

📌 생성되는 주요 컬럼:
- total_speeches ............ 의원 전체 발언 수
- total_speech_length ....... 발언 길이 총합
- avg_speech_length ......... 발언 길이 평균
- avg_prob_coop ............. 평균 협력 확률
- avg_prob_noncoop .......... 평균 비협력 확률
- avg_prob_neutral .......... 평균 중립 확률
- cooperation_score_prob ..... 평균 협력도 점수 (coop - noncoop)
- bills_count ............... 의원이 참여한 고유 법안 수
- controversy_rate .......... coop + noncoop (의견 강도 지표)

"""

import pandas as pd
from util_common import compute_score_prob, compute_speech_length

# ----------------------------------------
# 경로 설정
# ----------------------------------------
INPUT_PICKLE = "./output_member/all_speeches.pkl"
OUTPUT_CSV   = "./output_member/member_stats.csv"

if __name__ == "__main__":

    # ---------------------------------------------------------
    # 1) 전체 발언 로드
    # ---------------------------------------------------------
    try:
        df = pd.read_pickle(INPUT_PICKLE)
    except FileNotFoundError:
        raise FileNotFoundError(f"[ERROR] all_speeches.pkl 을 찾을 수 없습니다: {INPUT_PICKLE}")

    # ---------------------------------------------------------
    # 2) sentiment_prob → 안전한 확률 추출
    # ---------------------------------------------------------
    def get_prob(x, key):
        if isinstance(x, dict):
            return x.get(key, 0.0)
        return 1.0 if key == "neutral" else 0.0   # None → neutral=1

    df["prob_noncoop"] = df["sentiment_prob"].apply(lambda x: get_prob(x, "noncoop"))
    df["prob_coop"]    = df["sentiment_prob"].apply(lambda x: get_prob(x, "coop"))
    df["prob_neutral"] = df["sentiment_prob"].apply(lambda x: get_prob(x, "neutral"))

    # ---------------------------------------------------------
    # 3) score_prob, speech_length 계산
    # ---------------------------------------------------------
    df["score_prob"]    = df.apply(lambda r: compute_score_prob(r["prob_coop"], r["prob_noncoop"]), axis=1)
    df["speech_length"] = df["speech_text"].apply(compute_speech_length)

    # ---------------------------------------------------------
    # 4) 의원 이름 통일 (member_id 기준으로 가장 많이 등장한 이름 사용)
    # ---------------------------------------------------------
    name_map = (
        df.groupby("member_id")["member_name"]
          .agg(lambda x: x.mode()[0] if len(x) > 0 else None)
          .to_dict()
    )

    # ---------------------------------------------------------
    # 5) 의원 단위 기본 통계 생성
    # ---------------------------------------------------------
    basic_stats = df.groupby("member_id").agg(
        total_speeches=("speech_id", "count"),
        total_speech_length=("speech_length", "sum"),
        avg_speech_length=("speech_length", "mean"),
        avg_prob_coop=("prob_coop", "mean"),
        avg_prob_noncoop=("prob_noncoop", "mean"),
        avg_prob_neutral=("prob_neutral", "mean"),
        cooperation_score_prob=("score_prob", "mean")
    ).reset_index()

    # ---------------------------------------------------------
    # 6) 의원이 참여한 고유 법안 수 계산
    # ---------------------------------------------------------
    bills_count = (
        df.groupby("member_id")["bill_review"]
        .apply(lambda x: len(set(sum(x.tolist(), []))))
        .reset_index(name="bills_count")
    )

    # ---------------------------------------------------------
    # 7) 모두 병합 (member_id 기준)
    # ---------------------------------------------------------
    result = (
        basic_stats
        .merge(bills_count, on="member_id", how="left")
    )

    # 의원 이름 붙이기
    result["member_name"] = result["member_id"].map(name_map)

    # ---------------------------------------------------------
    # 8) controversy_rate 계산
    # ---------------------------------------------------------
    result["controversy_rate"] = (
        result["avg_prob_coop"] + result["avg_prob_noncoop"]
    )
    # sentiment_label 카운트 추가
    label_counts = (
        df.groupby(["member_id", "sentiment_label"])["speech_id"]
          .count()
          .unstack(fill_value=0)
          .rename(columns={0: "count_label_0", 1: "count_label_1", 2: "count_label_2"})
    )

    result = result.merge(label_counts, on="member_id", how="left")

    # ==== Excel 지수표기 방지 처리 ====
    for col in ["avg_prob_coop", "avg_prob_noncoop", "avg_prob_neutral", "cooperation_score_prob"]:
        result[col] = result[col].apply(lambda x: f'="{x:.20f}"')

    # ---------------------------------------------------------
    # 9) 정렬 후 저장
    # ---------------------------------------------------------
    result = result.sort_values("member_id")

    result.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")

    print("==============================================")
    print("[SUCCESS] member_stats.csv 생성 완료")
    print(" → 저장 위치:", OUTPUT_CSV)
    print(" → 총 의원 수:", len(result))
    print("==============================================")