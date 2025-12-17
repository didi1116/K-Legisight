#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
build_party_total_score.py
----------------------------------------------------------
📌 목적:
정당별 발언 협력도 점수를 계산하고,
다음 3가지를 모두 산출하여 CSV로 저장한다.

  1) original_stance  → 절대평가 기반
  2) adjusted_stance  → baseline 상대평가 기반
  3) adjusted_score_prob → baseline 중심으로 정규화된 점수

📌 입력:
  ./output_party/all_party.pkl    (b_load_party_data.py 결과물)

📌 출력:
  ./output_party/party_total_score.csv

⚠ 중요:
여기서는 b_load_party_data.py 가 만든 all_party.pkl 을 신뢰하여 사용하며,
따로 party matching 을 하지 않는다.
"""

import os
import pandas as pd

# ---------------------------------------------------------
# 파일 경로 설정
# ---------------------------------------------------------
INPUT_PICKLE = "./output_party/all_party.pkl"
OUTPUT_CSV   = "./output_party/party_total_score.csv"


# ---------------------------------------------------------
# ✔ 절대평가 기반 스탠스(original)
# ---------------------------------------------------------
def get_original_stance(score):
    """
    score_prob 절대값만으로 협력/중립/비협력을 판단한다.

      score >  0.05 → 협력
      score < -0.05 → 비협력
      그 사이는     → 중립

    * UI에서 기준을 바꿔도 코드만 수정하면 됨.
    """
    if score >= 0.05:
        return "협력"
    elif score <= -0.05:
        return "비협력"
    else:
        return "중립"


# ---------------------------------------------------------
# ✔ 상대평가 기반 스탠스(adjusted)
# ---------------------------------------------------------
def get_adjusted_stance(avg, cut_up, cut_down):
    """
    baseline(정당 평균의 평균)을 중심으로,
    ±0.025 범위 기준으로 스탠스를 분류한다.
    """
    if avg >= cut_up:
        return "협력"
    elif avg <= cut_down:
        return "비협력"
    else:
        return "중립"


# ---------------------------------------------------------
# 메인 실행부
# ---------------------------------------------------------
if __name__ == "__main__":

    # -----------------------------------------------------
    # 1) 데이터 로드
    # -----------------------------------------------------
    print("[INFO] 정당 분석용 all_party.pkl 로드 중...")

    if not os.path.exists(INPUT_PICKLE):
        raise FileNotFoundError(f"[ERROR] {INPUT_PICKLE} 파일이 존재하지 않습니다.")

    df = pd.read_pickle(INPUT_PICKLE)

    # 정당 미부착 발언 제거
    df = df[df["party_name"].notna()].copy()

    if df.empty:
        raise RuntimeError("[ERROR] 정당명이 있는 발언이 하나도 없습니다.")

    # -----------------------------------------------------
    # 2) 정당별 기본 통계 계산
    # -----------------------------------------------------
    print("[INFO] 정당별 기본 통계 계산 중...")

    stats = (
        df.groupby("party_name")
        .agg(
            total_speeches=("speech_id", "count"),
            total_score=("score_prob", "sum"),
            avg_score_prob=("score_prob", "mean"),
            n_members=("member_id", lambda x: x.nunique())
        )
        .reset_index()
    )

    # -----------------------------------------------------
    # 3) baseline 계산 및 절단점 생성
    # -----------------------------------------------------
    print("[INFO] baseline 및 절단점 계산...")

    baseline = stats["avg_score_prob"].mean()   # 전체 정당의 평균 협력도
    cut_coop = baseline + 0.025                 # 협력 판단 상단 기준
    cut_noncoop = baseline - 0.025              # 비협력 판단 하단 기준

    stats["baseline_score"] = baseline
    stats["cut_coop"] = cut_coop
    stats["cut_noncoop"] = cut_noncoop

    # -----------------------------------------------------
    # 4) original_stance 계산 (절대평가)
    # -----------------------------------------------------
    stats["original_stance"] = stats["avg_score_prob"].apply(get_original_stance)

    # -----------------------------------------------------
    # 5) adjusted_stance 계산 (상대평가)
    # -----------------------------------------------------
    stats["adjusted_stance"] = stats["avg_score_prob"].apply(
        lambda x: get_adjusted_stance(x, cut_coop, cut_noncoop)
    )

    # -----------------------------------------------------
    # 6) adjusted_score_prob 추가 (baseline 기준 보정 점수)
    # -----------------------------------------------------
    #  baseline 을 0 으로 두고 점수를 재해석하기 위한 컬럼(매우 중요)
    stats["adjusted_score_prob"] = stats["avg_score_prob"] - baseline

    # -----------------------------------------------------
    # 7) CSV 저장
    # -----------------------------------------------------
    os.makedirs("./output_party", exist_ok=True)

    stats.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")

    print("=====================================================")
    print("[SUCCESS] 정당별 협력도 + 스탠스 + 보정점수 계산 완료!")
    print(" → 저장 위치:", OUTPUT_CSV)
    print(" → 총 정당 수:", len(stats))
    print("=====================================================")
