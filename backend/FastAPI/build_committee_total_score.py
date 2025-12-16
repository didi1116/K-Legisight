#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
build_committee_total_score.py
==============================================================
📌 목적:
위원회별 전체 협력도 요약 표를 생성하여 CSV로 저장한다.

✔ 이 스크립트가 제공하는 핵심 정보
--------------------------------------------------------------
1) 위원회별 전체 발언 기반 평균 협력도 (avg_score_prob)
2) 발언 수 편차를 보정한 안정적 협력도 (bayesian_score)
3) 두 가지 관점의 스탠스 제공
   - original_stance : 원래 평균 기준 (절대 평가)
   - adjusted_stance : 베이시안 보정 기준 (상대 평가)

→ UI, 리포트, 정책 해석에서 모두 활용 가능하도록 설계됨.

📌 입력:
  ./output_committee/all_committee.pkl
    (c_load_data.py 에서 생성된 위원회 분석용 발언 데이터)

📌 출력:
  ./output_committee/committee_total_score.csv
==============================================================
"""

import os
import pandas as pd


# ------------------------------------------------------
# 베이시안 보정 함수
# ------------------------------------------------------
def bayesian_adjust(avg, n, baseline, weight=50):
    """
    베이시안 점수 계산 공식:

        bayesian = (avg * n + baseline * weight) / (n + weight)

    ✔ avg      : 위원회의 원래 평균 협력도
    ✔ n        : 위원회 전체 발언 수
    ✔ baseline : 전체 위원회 평균 협력도
    ✔ weight   : 발언 수가 적을 때 baseline의 영향력
                (위원회 단위는 편차가 커서 50 권장)

    → 발언 수가 적은 위원회의 점수 튐 현상을 완화
    """
    return (avg * n + baseline * weight) / (n + weight)


# ------------------------------------------------------
# 절대 평가 기반 스탠스 (original)
# ------------------------------------------------------
def get_original_stance(score):
    """
    원래 평균 협력도(avg_score_prob) 기준 스탠스 분류

    ✔ 기준 의미:
      - 실제 발언 평균만 보고 판단한 '사실 묘사'

    기준값은 경험적으로 보수적으로 설정
    """
    if score >= 0.03:
        return "협력"
    elif score <= -0.03:
        return "비협력"
    else:
        return "중립"


# ------------------------------------------------------
# 상대 평가 기반 스탠스 (adjusted)
# ------------------------------------------------------
def classify_adjusted_stance(score, cut_coop, cut_noncoop):
    """
    베이시안 보정 점수 기준 스탠스 분류

    ✔ 전체 위원회 평균(baseline)을 중심으로
      상대적 위치를 판단하는 용도
    """
    if score >= cut_coop:
        return "협력"
    elif score <= cut_noncoop:
        return "비협력"
    else:
        return "중립"


# ------------------------------------------------------
# 메인 실행부
# ------------------------------------------------------
if __name__ == "__main__":

    INPUT_PKL = "./output_committee/all_committee.pkl"
    OUTPUT_CSV = "./output_committee/committee_total_score.csv"

    print("\n[INFO] 위원회 총 협력도 분석 시작...")

    if not os.path.exists(INPUT_PKL):
        raise FileNotFoundError(f"[ERROR] 파일 없음: {INPUT_PKL}")

    df = pd.read_pickle(INPUT_PKL)

    # 위원회 정보 없는 발언 제거
    df = df[df["committee"].notna()].copy()

    if df.empty:
        raise RuntimeError("[ERROR] 위원회 정보가 포함된 발언이 없습니다.")


    # --------------------------------------------------
    # 1) 위원회별 기본 통계 계산
    # --------------------------------------------------
    grouped = (
        df.groupby("committee")
        .agg(
            total_speeches=("speech_id", "count"),
            avg_score_prob=("score_prob", "mean"),
            n_members=("member_id", "nunique")
        )
        .reset_index()
    )


    # --------------------------------------------------
    # 2) 전체 baseline 계산
    # --------------------------------------------------
    baseline = grouped["avg_score_prob"].mean()


    # --------------------------------------------------
    # 3) 베이시안 보정 점수 계산
    # --------------------------------------------------
    grouped["bayesian_score"] = grouped.apply(
        lambda r: bayesian_adjust(
            avg=r["avg_score_prob"],
            n=r["total_speeches"],
            baseline=baseline,
            weight=50
        ),
        axis=1
    )


    # --------------------------------------------------
    # 4) 컷라인 계산 (baseline ± margin)
    # --------------------------------------------------
    margin = 0.02  # 위원회 단위는 보수적으로 ±2%
    cut_coop = baseline + margin
    cut_noncoop = baseline - margin

    grouped["baseline_score"] = baseline
    grouped["cut_coop"] = cut_coop
    grouped["cut_noncoop"] = cut_noncoop


    # --------------------------------------------------
    # 5) 스탠스 분류 (2종)
    # --------------------------------------------------
    grouped["original_stance"] = grouped["avg_score_prob"].apply(
        get_original_stance
    )

    grouped["adjusted_stance"] = grouped["bayesian_score"].apply(
        lambda x: classify_adjusted_stance(x, cut_coop, cut_noncoop)
    )


    # --------------------------------------------------
    # 6) 정렬 및 저장
    # --------------------------------------------------
    grouped = grouped.sort_values("committee")

    os.makedirs("./output_committee", exist_ok=True)
    grouped.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")

    print("===========================================================")
    print("[SUCCESS] 위원회 총 협력도 분석 완료!")
    print(" → 저장 위치:", OUTPUT_CSV)
    print(" → 위원회 수:", len(grouped))
    print("===========================================================\n")
