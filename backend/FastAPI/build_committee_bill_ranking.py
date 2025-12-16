#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
build_committee_bill_ranking.py
==============================================================
📌 목적:
위원회별로 '가장 많이 논의된 법안 순위표 전체'를 생성한다.

✔ 핵심 개념:
- 법안의 중요도 = 논의량
- 논의량은 발언 수 + 발언 분량을 함께 고려
- 위원회 내부 기준으로만 비교 (정규화)

✔ 제공 기능:
1) all_committee.pkl 로드
2) bill_review 리스트 explode
3) util_bill.parse_bill_string 으로 법안 정보 정제
4) 위원회 × 법안 단위 발언 수 / 길이 집계
5) 논의 점수(bill_activity_score) 산출
6) 위원회 내부 순위(rank_in_committee) 부여

📌 입력:
  ./output_committee/all_committee.pkl

📌 출력:
  ./output_committee/committee_bill_ranking.csv
==============================================================
"""

import os
import pandas as pd
from util_bill import parse_bill_string


# ------------------------------------------------------
# 메인 실행부
# ------------------------------------------------------
if __name__ == "__main__":

    INPUT_PKL = "./output_committee/all_committee.pkl"
    OUTPUT_CSV = "./output_committee/committee_bill_ranking.csv"

    print("\n[INFO] 위원회별 법안 논의 순위 분석 시작...")

    if not os.path.exists(INPUT_PKL):
        raise FileNotFoundError(f"[ERROR] 파일 없음: {INPUT_PKL}")

    df = pd.read_pickle(INPUT_PKL)

    # --------------------------------------------------
    # 1) 필수 컬럼 검증 및 정제
    # --------------------------------------------------
    df = df[
        df["committee"].notna() &
        df["speech_text"].notna()
    ].copy()

    if df.empty:
        raise RuntimeError("[ERROR] 위원회 발언 데이터 자체가 없습니다.")


    # --------------------------------------------------
    # 2) 발언 길이 계산
    # --------------------------------------------------
    df["speech_length"] = df["speech_text"].astype(str).str.len()


    # --------------------------------------------------
    # 3) bill_review explode (법안 1개 = 1행)
    # --------------------------------------------------
    df = df.explode("bill_review")

    df = df[df["bill_review"].notna()]

    if df.empty:
        raise RuntimeError(
            "[ERROR] bill_review 기반으로 식별 가능한 법안 발언이 없습니다.\n"
            "→ 위원회 회의 특성상 정상일 수 있습니다."
        )

    # --------------------------------------------------
    # 4) 법안 문자열 파싱
    # --------------------------------------------------
    df["bill_name"], df["bill_proposer"], df["bill_number"] = zip(
        *df["bill_review"].apply(parse_bill_string)
    )

    df = df[df["bill_name"].notna()]


    # --------------------------------------------------
    # 5) 위원회 × 법안 단위 집계
    # --------------------------------------------------
    grouped = (
        df.groupby(["committee", "bill_name", "bill_number"])
        .agg(
            speech_count=("speech_id", "count"),
            total_speech_length=("speech_length", "sum"),
            avg_speech_length=("speech_length", "mean")
        )
        .reset_index()
    )


    # --------------------------------------------------
    # 6) 위원회 내부 정규화
    # --------------------------------------------------
    grouped["norm_speech_count"] = (
        grouped["speech_count"] /
        grouped.groupby("committee")["speech_count"].transform("max")
    )

    grouped["norm_total_speech_length"] = (
        grouped["total_speech_length"] /
        grouped.groupby("committee")["total_speech_length"].transform("max")
    )


    # --------------------------------------------------
    # 7) 법안 논의 점수 계산
    # --------------------------------------------------
    grouped["bill_activity_score"] = (
        0.5 * grouped["norm_speech_count"] +
        0.5 * grouped["norm_total_speech_length"]
    )


    # --------------------------------------------------
    # 8) 위원회 내부 순위 부여
    # --------------------------------------------------
    grouped["rank_in_committee"] = (
        grouped.groupby("committee")["bill_activity_score"]
               .rank(method="first", ascending=False)
               .astype(int)
    )


    # --------------------------------------------------
    # 9) 정렬 및 저장
    # --------------------------------------------------
    grouped = grouped.sort_values(["committee", "rank_in_committee"])

    os.makedirs("./output_committee", exist_ok=True)
    grouped.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")

    print("===========================================================")
    print("[SUCCESS] 위원회별 법안 논의 순위 분석 완료!")
    print(" → 저장 위치:", OUTPUT_CSV)
    print(" → 총 (위원회 × 법안) 행 수:", len(grouped))
    print("===========================================================\n")
