#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
build_committee_member_ranking.py
==============================================================
📌 목적:
위원회별로 '발언이 가장 활발한 의원 순위표 전체'를 생성한다.

✔ 핵심 개념:
- 단순 발언 수 ❌
- 단순 발언 길이 ❌
- 발언 빈도 + 발언 분량을 함께 고려한 '활동도(activity_score)' 기반 순위

✔ 제공 기능:
1) 위원회 × 의원 단위 발언 수 집계
2) 발언 길이 총합 및 평균 계산
3) 위원회 내부 기준으로 정규화
4) 활동도 점수(activity_score) 산출
5) 위원회 내부 순위(rank_in_committee) 부여

📌 입력:
  ./output_committee/all_committee.pkl

📌 출력:
  ./output_committee/committee_member_ranking.csv
==============================================================
"""

import os
import pandas as pd


# ------------------------------------------------------
# 메인 실행부
# ------------------------------------------------------
if __name__ == "__main__":

    INPUT_PKL = "./output_committee/all_committee.pkl"
    OUTPUT_CSV = "./output_committee/committee_member_ranking.csv"

    print("\n[INFO] 위원회별 의원 활동도 순위 분석 시작...")

    if not os.path.exists(INPUT_PKL):
        raise FileNotFoundError(f"[ERROR] 파일 없음: {INPUT_PKL}")

    df = pd.read_pickle(INPUT_PKL)

    # 필수 컬럼 없는 행 제거
    df = df[
        df["committee"].notna() &
        df["member_id"].notna() &
        df["speech_text"].notna()
    ].copy()

    if df.empty:
        raise RuntimeError("[ERROR] 유효한 위원회/의원 발언 데이터 없음.")


    # --------------------------------------------------
    # 1) 발언 길이 계산
    # --------------------------------------------------
    df["speech_length"] = df["speech_text"].astype(str).str.len()


    # --------------------------------------------------
    # 2) 위원회 × 의원 단위 집계
    # --------------------------------------------------
    # 여러 행에서 같은 (committee, member_id)에 대해 member_name이
    # 다르게 들어오는 경우(직함 표기 차이 등)를 통일하기 위해
    # 그룹별로 대표 이름을 선택하여 canonical_name으로 사용합니다.
    def _choose_canonical_name(series):
        # series: member_name values for the group
        vals = [str(x).strip() for x in series if pd.notna(x) and str(x).strip() != ""]
        if not vals:
            return ""
        # 우선 가장 많이 등장한 이름(mode)을 선택
        try:
            counts = pd.Series(vals).value_counts()
            top = counts.index[0]
            return top
        except Exception:
            # 예외시 가장 길이가 긴 이름을 선택
            return max(vals, key=len)

    name_map = (
        df.groupby(["committee", "member_id"])["member_name"]
        .agg(_choose_canonical_name)
        .reset_index()
        .rename(columns={"member_name": "canonical_name"})
    )

    # 병합하여 모든 행에 canonical_name 컬럼 추가
    df = df.merge(name_map, on=["committee", "member_id"], how="left")

    # canonical_name을 사용해 집계
    grouped = (
        df.groupby(["committee", "member_id", "canonical_name"]) 
        .agg(
            speech_count=("speech_id", "count"),
            total_speech_length=("speech_length", "sum"),
            avg_speech_length=("speech_length", "mean"),
        )
        .reset_index()
        .rename(columns={"canonical_name": "member_name"})
    )


    # --------------------------------------------------
    # 3) 위원회 내부 정규화
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
    # 4) 활동도 점수 계산
    # --------------------------------------------------
    grouped["activity_score"] = (
        0.5 * grouped["norm_speech_count"] +
        0.5 * grouped["norm_total_speech_length"]
    )


    # --------------------------------------------------
    # 5) 위원회 내부 순위 부여
    # --------------------------------------------------
    grouped["rank_in_committee"] = (
        grouped.groupby("committee")["activity_score"]
               .rank(method="first", ascending=False)
               .astype(int)
    )


    # --------------------------------------------------
    # 6) 정렬 및 저장
    # --------------------------------------------------
    grouped = grouped.sort_values(["committee", "rank_in_committee"])

    os.makedirs("./output_committee", exist_ok=True)
    grouped.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")

    print("===========================================================")
    print("[SUCCESS] 위원회별 의원 활동도 순위 분석 완료!")
    print(" → 저장 위치:", OUTPUT_CSV)
    print(" → 총 행 수:", len(grouped))
    print("===========================================================\n")
