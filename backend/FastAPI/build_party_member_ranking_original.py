#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
build_party_member_ranking.py
----------------------------------------------------------
📌 목적:
정당별 의원 협력도 랭킹을 계산하여 CSV로 출력한다.

이 스크립트는 정당 내부에서 어떤 의원이 협력적인지/비협력적인지를
안정적으로 비교하기 위해 '베이시안 보정된 협력 점수'를 사용한다.

⚡ 제공되는 주요 기능:
1) 정당별로 소속된 의원들의 발언을 집계
2) 의원별 avg_score_prob (기본 평균 협력도) 계산
3) 발언 수 부족으로 생기는 왜곡을 방지하기 위해 Bayesian Score 부여
4) original_stance (절대평가), adjusted_stance (베이시안 기반) 제공
5) 정당 내부 협력 순위(rank_total, 1등=가장 협력적) 제공
6) UI에서 필터링을 위해 모든 의원을 정당별 정렬하여 출력

📌 입력:
    ./output_party/all_party.pkl
    (b_load_party_data.py 에서 생성된 정당 매칭 + sentiment 처리 완료된 데이터)

📌 출력:
    ./output_party/party_member_ranking.csv

"""

import os
import pandas as pd

INPUT_PICKLE = "./output_party/all_party.pkl"
OUTPUT_CSV = "./output_party/party_member_ranking.csv"


# ---------------------------------------------------------
# 1) 절대평가 스탠스(original_stance)
# ---------------------------------------------------------
def get_original_stance(score):
    """
    순수 avg_score_prob만을 기준으로 스탠스를 부여한다.
    일반적인 절대평가로,
      +0.05 이상 → 협력
      -0.05 이하 → 비협력
      그 사이 → 중립
    """
    if score >= 0.05:
        return "협력"
    elif score <= -0.05:
        return "비협력"
    return "중립"


# ---------------------------------------------------------
# 2) 스탠스(adjusted_stance) — 베이시안 점수 기반
# ---------------------------------------------------------
def get_adjusted_stance(score):
    """
    Bayesian score를 기준으로 정당 내부 분위기까지 반영한 스탠스.
      +0.03 이상 → 협력
      -0.03 이하 → 비협력
      그 사이 → 중립
    """
    if score >= 0.03:
        return "협력"
    elif score <= -0.03:
        return "비협력"
    return "중립"


# ---------------------------------------------------------
# 3) 베이시안 스코어 계산 함수
# ---------------------------------------------------------
def bayesian_adjust(avg, n, global_mean, alpha=30):
    """
    베이시안 보정 공식:
        score = (alpha * global_mean + n * avg) / (alpha + n)

    - avg : 의원의 평균 협력 점수
    - n   : 의원의 발언 수
    - global_mean : 전체 의원 평균 협력 점수
    - alpha : 발언 수 보정용 사전 신뢰도 (높을수록 global_mean에 가까워짐)
    """
    return (alpha * global_mean + n * avg) / (alpha + n)



# ---------------------------------------------------------
# 메인 실행
# ---------------------------------------------------------
if __name__ == "__main__":

    print("[INFO] all_party.pkl 로드 중...")
    if not os.path.exists(INPUT_PICKLE):
        raise FileNotFoundError(f"[ERROR] {INPUT_PICKLE} 없음")

    df = pd.read_pickle(INPUT_PICKLE)

    # 정당 정보 없는 사람 제외
    df = df[df["party_name"].notna()].copy()

    # -----------------------------------------------------
    # 1) 의원 단위 집계
    # -----------------------------------------------------
    print("[INFO] 의원 단위 통계 계산 중...")

    member_stats = (
        df.groupby(["party_name", "member_id", "member_name"])
        .agg(
            n_speeches=("speech_id", "count"),
            avg_score_prob=("score_prob", "mean"),
        )
        .reset_index()
    )

    # 전체 데이터 평균 (베이시안 global mean)
    global_mean = member_stats["avg_score_prob"].mean()


    # -----------------------------------------------------
    # 2) 베이시안 스코어 계산
    # -----------------------------------------------------
    print("[INFO] 베이시안 스코어 계산 중...")

    member_stats["bayesian_score"] = member_stats.apply(
        lambda r: bayesian_adjust(
            r["avg_score_prob"],
            r["n_speeches"],
            global_mean,
            alpha=30
        ),
        axis=1
    )


    # -----------------------------------------------------
    # 3) 스탠스 생성
    # -----------------------------------------------------
    print("[INFO] 스탠스 부여 중...")

    member_stats["original_stance"] = member_stats["avg_score_prob"].apply(get_original_stance)
    member_stats["adjusted_stance"] = member_stats["bayesian_score"].apply(get_adjusted_stance)


    # -----------------------------------------------------
    # 4) 정당 내부 랭킹 생성
    # -----------------------------------------------------
    print("[INFO] 정당 내부 랭킹 계산 중...")

    member_stats["rank_total"] = (
        member_stats
        .sort_values(["party_name", "bayesian_score"], ascending=False)
        .groupby("party_name")
        .cumcount() + 1
    )


    # -----------------------------------------------------
    # 5) 정렬 후 CSV 저장
    # -----------------------------------------------------
    member_stats = member_stats.sort_values(["party_name", "rank_total"])

    os.makedirs("./output_party", exist_ok=True)
    member_stats.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")

    print("=======================================================")
    print("[SUCCESS] 정당별 의원 협력도 랭킹 생성 완료!")
    print(" → 저장 위치:", OUTPUT_CSV)
    print(" → 총 의원 수:", len(member_stats))
    print("=======================================================")
