#!/usr/bin/env python3
"""
정당별 총 협력도 점수를 계산하는 유틸리티.

이전 버전은 all_party.pkl을 읽어 CSV로 저장했지만,
지금은 Supabase 테이블(dimension, parties, speeches) 형태의 dict를 받아
DataFrame으로 계산한 결과만 반환한다.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import pandas as pd


def _safe_float(val: Any) -> Optional[float]:
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


def _safe_int(val: Any) -> Optional[int]:
    try:
        return int(val)
    except Exception:
        try:
            return int(float(val))
        except Exception:
            return None


def get_original_stance(score: float) -> str:
    if score >= 0.05:
        return "협력"
    if score <= -0.05:
        return "비협력"
    return "중립"


def get_adjusted_stance(avg: float, cut_up: float, cut_down: float) -> str:
    if avg >= cut_up:
        return "협력"
    if avg <= cut_down:
        return "비협력"
    return "중립"


def build_party_total_score(tables: Dict[str, List[Dict[str, Any]]]) -> pd.DataFrame:
    """
    tables: {"dimension": [...], "parties": [...], "speeches": [...]}
    반환: party_total_score DataFrame
    """
    speeches = pd.DataFrame(tables.get("speeches") or [])
    if speeches.empty:
        raise ValueError("speeches 테이블이 비어 있습니다.")

    dimension = pd.DataFrame(tables.get("dimension") or [])
    parties = pd.DataFrame(tables.get("parties") or [])

    if dimension.empty:
        raise ValueError("dimension 테이블이 필요합니다.")

    party_lookup = {}
    if not parties.empty:
        parties = parties.rename(columns={"name": "party_name"})
        parties["party_id"] = parties["party_id"].apply(_safe_int)
        party_lookup = parties.set_index("party_id")["party_name"].to_dict()

    members = dimension[["member_id", "party_id", "party"]].copy()
    members = members.rename(columns={"party": "party_name"})
    members["party_id"] = members["party_id"].apply(_safe_int)
    members["party_name"] = members["party_name"].fillna(
        members["party_id"].map(party_lookup)
    )

    speeches = speeches.merge(members, on="member_id", how="left")
    speeches["prob_coop"] = speeches["prob_coop"].apply(_safe_float)
    speeches["prob_noncoop"] = speeches["prob_noncoop"].apply(_safe_float)
    speeches = speeches.dropna(subset=["party_id", "prob_coop", "prob_noncoop"])

    speeches["score_prob"] = speeches["prob_coop"] - speeches["prob_noncoop"]

    stats = (
        speeches.groupby(["party_id", "party_name"], as_index=False)
        .agg(
            total_speeches=("speech_id", "count"),
            total_score=("score_prob", "sum"),
            avg_score_prob=("score_prob", "mean"),
            n_members=("member_id", lambda x: x.nunique()),
        )
    )

    if stats.empty:
        raise ValueError("정당별 통계가 비어 있습니다.")

    baseline = stats["avg_score_prob"].mean()
    cut_coop = baseline + 0.025
    cut_noncoop = baseline - 0.025

    stats["baseline_score"] = baseline
    stats["cut_coop"] = cut_coop
    stats["cut_noncoop"] = cut_noncoop
    stats["original_stance"] = stats["avg_score_prob"].apply(get_original_stance)
    stats["adjusted_stance"] = stats["avg_score_prob"].apply(
        lambda x: get_adjusted_stance(x, cut_coop, cut_noncoop)
    )
    stats["adjusted_score_prob"] = stats["avg_score_prob"] - baseline

    return stats


if __name__ == "__main__":
    raise SystemExit("build_party_total_score(tables) 함수를 사용하세요.")
