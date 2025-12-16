#!/usr/bin/env python3
"""
정당별 의원 협력도 랭킹 계산기.

이전 버전은 all_party.pkl을 읽어 CSV를 저장했지만,
지금은 Supabase 테이블(dimension, parties, speeches) 형태의 dict를 받아
DataFrame만 반환한다.
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


def get_adjusted_stance(score: float) -> str:
    if score >= 0.03:
        return "협력"
    if score <= -0.03:
        return "비협력"
    return "중립"


def bayesian_adjust(avg: float, n: float, global_mean: float, alpha: int = 30) -> float:
    return (alpha * global_mean + n * avg) / (alpha + n)


def build_party_member_ranking(tables: Dict[str, List[Dict[str, Any]]]) -> pd.DataFrame:
    """
    tables: {"dimension": [...], "parties": [...], "speeches": [...]}
    반환: party_member_ranking DataFrame
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

    name_col = "member_name" if "member_name" in dimension.columns else "name"
    members = dimension[["member_id", name_col, "party_id", "party"]].copy()
    members = members.rename(columns={"party": "party_name", name_col: "member_name"})
    members["party_id"] = members["party_id"].apply(_safe_int)
    members["party_name"] = members["party_name"].fillna(
        members["party_id"].map(party_lookup)
    )

    speeches = speeches.merge(members, on="member_id", how="left")
    # 병합 시 member_name 중복 열 정리
    if "member_name_x" in speeches.columns and "member_name_y" in speeches.columns:
        speeches["member_name"] = speeches["member_name_x"].fillna(speeches["member_name_y"])
    elif "member_name_x" in speeches.columns:
        speeches = speeches.rename(columns={"member_name_x": "member_name"})
    elif "member_name_y" in speeches.columns:
        speeches = speeches.rename(columns={"member_name_y": "member_name"})
    speeches["prob_coop"] = speeches["prob_coop"].apply(_safe_float)
    speeches["prob_noncoop"] = speeches["prob_noncoop"].apply(_safe_float)
    speeches = speeches.dropna(subset=["party_id", "prob_coop", "prob_noncoop"])
    speeches["score_prob"] = speeches["prob_coop"] - speeches["prob_noncoop"]

    member_stats = (
        speeches.groupby(["party_id", "party_name", "member_id", "member_name"], as_index=False)
        .agg(
            n_speeches=("speech_id", "count"),
            avg_score_prob=("score_prob", "mean"),
        )
    )

    if member_stats.empty:
        raise ValueError("의원 통계가 비어 있습니다.")

    global_mean = member_stats["avg_score_prob"].mean()

    member_stats["bayesian_score"] = member_stats.apply(
        lambda r: bayesian_adjust(
            r["avg_score_prob"],
            r["n_speeches"],
            global_mean,
            alpha=30,
        ),
        axis=1,
    )

    member_stats["original_stance"] = member_stats["avg_score_prob"].apply(get_original_stance)
    member_stats["adjusted_stance"] = member_stats["bayesian_score"].apply(get_adjusted_stance)

    member_stats["rank_total"] = (
        member_stats.sort_values(["party_name", "bayesian_score"], ascending=False)
        .groupby("party_name")
        .cumcount() + 1
    )

    member_stats = member_stats.sort_values(["party_name", "rank_total"])
    return member_stats


if __name__ == "__main__":
    raise SystemExit("build_party_member_ranking(tables) 함수를 사용하세요.")
