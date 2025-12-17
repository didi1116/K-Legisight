#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
build_party_total_score.py
----------------------------------------------------------
📌 목적:
Supabase 데이터로부터 정당별 발언 협력도 점수를 계산하고,
다음 3가지를 모두 산출한다:

  1) original_stance  → 절대평가 기반
  2) adjusted_stance  → baseline 상대평가 기반
  3) adjusted_score_prob → baseline 중심으로 정규화된 점수

⚠ 중요:
이 모듈은 FastAPI에서 tables dict (Supabase 데이터)를 받아
party_total_score DataFrame을 반환하는 함수를 제공한다.
"""

from typing import Dict, List, Any
import pandas as pd


# ---------------------------------------------------------
# ✔ 절대평가 기반 스탠스(original)
# ---------------------------------------------------------
def get_original_stance(score: float) -> str:
    """
    score_prob 절대값만으로 협력/중립/비협력을 판단한다.

      score >=  0.05 → 협력
      score <= -0.05 → 비협력
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
def get_adjusted_stance(avg: float, cut_up: float, cut_down: float) -> str:
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
# 핵심 함수: Supabase 데이터로부터 party_total_score 계산
# ---------------------------------------------------------
def build_party_total_score(tables: Dict[str, List[Dict[str, Any]]]) -> pd.DataFrame:
    """
    Supabase 테이블 데이터로부터 정당별 협력도 점수를 계산한다.

    입력:
        tables: {
            'speeches': [{'member_id': ..., 'score_prob': ..., ...}, ...],
            'dimension': [{'party': ..., 'member_id': ..., ...}, ...],
            ...
        }

    반환:
        DataFrame with columns:
            party_name, total_speeches, total_score, avg_score_prob, 
            n_members, baseline_score, cut_coop, cut_noncoop,
            original_stance, adjusted_stance, adjusted_score_prob
    """

    # 1) speeches 테이블에서 필요한 데이터 추출
    speeches = tables.get("speeches", [])
    if not speeches:
        raise ValueError("speeches table is empty or missing")

    speeches_df = pd.DataFrame(speeches)

    # score_prob이 문자열인 경우 변환
    if "score_prob" in speeches_df.columns:
        speeches_df["score_prob"] = pd.to_numeric(speeches_df["score_prob"], errors="coerce").fillna(0.0)
    else:
        speeches_df["score_prob"] = 0.0

    # member_id 확인
    if "member_id" not in speeches_df.columns:
        raise ValueError("speeches table must contain 'member_id' column")

    # 2) dimension 테이블에서 party 정보 추출
    dimension = tables.get("dimension", [])
    if dimension:
        dim_df = pd.DataFrame(dimension)
        # member_id와 party를 매핑
        if "member_id" in dim_df.columns and "party" in dim_df.columns:
            party_map = dict(zip(dim_df["member_id"], dim_df["party"]))
        else:
            party_map = {}
    else:
        party_map = {}

    # 3) speeches_df에 party 추가
    speeches_df["party_name"] = speeches_df["member_id"].map(party_map)

    # 4) party_name이 있는 행만 유지
    speeches_df = speeches_df[speeches_df["party_name"].notna()].copy()

    if speeches_df.empty:
        raise ValueError("No speeches with party information found")

    # 5) 정당별 기본 통계 계산 (최적화됨)
    stats = (
        speeches_df.groupby("party_name", as_index=False).agg(
            total_speeches=("member_id", "count"),
            total_score=("score_prob", "sum"),
            avg_score_prob=("score_prob", "mean"),
            n_members=("member_id", "nunique")
        )
    )

    # 6) baseline 계산 및 절단점 생성
    baseline = stats["avg_score_prob"].mean()
    cut_coop = baseline + 0.025
    cut_noncoop = baseline - 0.025

    stats["baseline_score"] = baseline
    stats["cut_coop"] = cut_coop
    stats["cut_noncoop"] = cut_noncoop

    # 7) original_stance 계산 (절대평가)
    stats["original_stance"] = stats["avg_score_prob"].apply(get_original_stance)

    # 8) adjusted_stance 계산 (상대평가)
    stats["adjusted_stance"] = stats.apply(
        lambda row: get_adjusted_stance(row["avg_score_prob"], cut_coop, cut_noncoop),
        axis=1
    )

    # 9) adjusted_score_prob 추가 (baseline 기준 보정 점수)
    stats["adjusted_score_prob"] = stats["avg_score_prob"] - baseline

    # NaN을 None으로 변환 (JSON 직렬화 가능하게)
    for col in stats.columns:
        if stats[col].dtype == 'object':
            stats[col] = stats[col].where(pd.notna(stats[col]), None)
        else:
            # numeric 컬럼: NaN을 None으로 변환
            stats[col] = stats[col].apply(lambda x: None if (isinstance(x, float) and pd.isna(x)) else x)

    return stats
