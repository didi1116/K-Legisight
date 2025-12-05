"""
build_member_speech_detail.py
----------------------------------------
📌 목적:
- 의원 단위 상세 발언 데이터(member_speech_detail.csv)를 생성한다.
- 개별 발언 레벨에서 스코어, 길이, 확률 값을 모두 포함한다.
- UI에서 특정 의원을 선택했을 때 "발언 리스트"를 그대로 보여주는 핵심 데이터셋

📌 주요 처리:
- sentiment_prob 확률 추출
- score_prob 계산
- 발언 길이 계산
- speech_id 문자열 변환 (Excel 깨짐 방지)
- score_prob 문자열 변환
- member_id + speech_id 기준 정렬

📌 입력:
- ./analysis_by_sen/output_member/all_speeches.pkl
  → build_member_load_data.py 에서 생성된 전체 발언 DataFrame

📌 출력:
- ./analysis_by_sen/output_member/member_speech_detail.csv

📌 포함되는 컬럼:
- member_id, member_name
- speech_id, bill_review
- speech_length (문자 길이)
- prob_noncoop / prob_coop / prob_neutral
- score_prob (협력도 점수 = prob_coop - prob_noncoop)
- speech_text (원문)

⚠️ 중요:
- bill_review는 리스트 형태 그대로 CSV에 저장됨 → UI/백엔드에서 바로 사용 가능.
- skip_reason이 있는 발언은 load 단계에서 이미 제외됨.
"""

import pandas as pd
from util_common import compute_score_prob, compute_speech_length

INPUT_PICKLE = "./output_member/all_speeches.pkl"
OUTPUT_CSV   = "./output_member/member_speech_detail.csv"

if __name__ == "__main__":

    # ---------------------------------------------------------
    # 1) 데이터 로드
    # ---------------------------------------------------------
    try:
        df = pd.read_pickle(INPUT_PICKLE)
    except FileNotFoundError:
        raise FileNotFoundError(f"[ERROR] all_speeches.pkl 없음: {INPUT_PICKLE}")

    # ---------------------------------------------------------
    # 2) sentiment_prob → 확률 안전 추출
    # ---------------------------------------------------------
    def get_prob(x, key):
        if isinstance(x, dict):
            return x.get(key, 0.0)
        return 1.0 if key == "neutral" else 0.0

    df["prob_noncoop"] = df["sentiment_prob"].apply(lambda x: get_prob(x, "noncoop"))
    df["prob_coop"]    = df["sentiment_prob"].apply(lambda x: get_prob(x, "coop"))
    df["prob_neutral"] = df["sentiment_prob"].apply(lambda x: get_prob(x, "neutral"))

    # ---------------------------------------------------------
    # 3) score_prob, speech_length 계산
    # ---------------------------------------------------------
    df["score_prob"]    = df.apply(lambda r: compute_score_prob(r["prob_coop"], r["prob_noncoop"]), axis=1)
    df["speech_length"] = df["speech_text"].apply(compute_speech_length)

    # ---------------------------------------------------------
    # 4) Excel 깨짐 방지 처리
    # ---------------------------------------------------------
    df["speech_id"] = df["speech_id"].apply(lambda x: f'="{x}"')
    df["score_prob"] = df["score_prob"].apply(lambda x: f'="{x:.20f}"')

    # ---------------------------------------------------------
    # 5) 정렬
    # ---------------------------------------------------------
    df = df.sort_values(["member_id", "speech_id"])

    # ---------------------------------------------------------
    # 6) CSV 저장
    # ---------------------------------------------------------
    cols = [
        "member_id", "member_name", "speech_id",
        "bill_review", "speech_length",
        "prob_noncoop", "prob_coop", "prob_neutral", "sentiment_label",
        "score_prob", "speech_text"
    ]

    df[cols].to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")

    print("==============================================")
    print("[SUCCESS] member_speech_detail.csv 생성 완료")
    print(" → 저장 위치:", OUTPUT_CSV)
    print(" → 총 발언 수:", len(df))
    print("==============================================")