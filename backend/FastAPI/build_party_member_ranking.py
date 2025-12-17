#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_party_member_ranking.py
----------------------------------------------------------
Provides `build_party_member_ranking(tables)` which computes
per-party member rankings from Supabase-loaded tables (dict).

This mirrors the logic in the original standalone script but
accepts `tables` produced by `_load_party_tables()` in `main.py`.
"""
from typing import Dict, List, Any
import pandas as pd


def get_original_stance(score: float) -> str:
    if score >= 0.05:
        return "협력"
    elif score <= -0.05:
        return "비협력"
    return "중립"


def get_adjusted_stance(score: float) -> str:
    if score >= 0.03:
        return "협력"
    elif score <= -0.03:
        return "비협력"
    return "중립"


def bayesian_adjust(avg: float, n: int, global_mean: float, alpha: int = 30) -> float:
    return (alpha * global_mean + n * avg) / (alpha + n)


def build_party_member_ranking(tables: Dict[str, List[Dict[str, Any]]]) -> pd.DataFrame:
    """
    Compute party-member rankings.

    Expects `tables` to contain at least:
      - 'speeches': list of dicts with keys including 'member_id', 'score_prob' (optional), 'speech_id' (optional)
      - 'dimension': list of dicts with 'member_id' -> 'name' and 'party' mappings (if available)

    Returns a DataFrame with columns:
      party_name, member_id, member_name, n_speeches, avg_score_prob, bayesian_score,
      original_stance, adjusted_stance, rank_total
    """

    speeches = tables.get("speeches", [])
    if not speeches:
        raise ValueError("speeches table missing or empty")

    speeches_df = pd.DataFrame(speeches)

    # Ensure score_prob numeric
    if "score_prob" in speeches_df.columns:
        speeches_df["score_prob"] = pd.to_numeric(speeches_df["score_prob"], errors="coerce").fillna(0.0)
    else:
        speeches_df["score_prob"] = 0.0

    if "member_id" not in speeches_df.columns:
        raise ValueError("speeches must contain 'member_id'")

    # Try to get member name and party from dimension table if available
    dim = tables.get("dimension", [])
    dim_df = pd.DataFrame(dim) if dim else pd.DataFrame()

    # Build robust maps for party and name (support different column names and types)
    party_map = {}
    name_map_raw = {}
    name_map_str = {}
    if not dim_df.empty and "member_id" in dim_df.columns:
        # party mapping - try several party column names
        party_col = None
        for cand in ["party", "party_name"]:
            if cand in dim_df.columns:
                party_col = cand
                break
        if party_col:
            for mid, p in zip(dim_df["member_id"], dim_df[party_col]):
                party_map[mid] = p
                try:
                    party_map[str(mid)] = p
                except Exception:
                    pass

        # name mapping - try common name columns
        name_col = None
        for cand in ["name", "member_name", "member_nm", "full_name", "이름"]:
            if cand in dim_df.columns:
                name_col = cand
                break
        if name_col:
            for mid, nm in zip(dim_df["member_id"], dim_df[name_col]):
                name_map_raw[mid] = nm
                try:
                    name_map_str[str(mid)] = nm
                except Exception:
                    pass

    # attach party and name using robust lookup (try raw, then str)
    speeches_df["party_name"] = speeches_df["member_id"].map(lambda x: party_map.get(x) or party_map.get(str(x)))

    def _resolve_member_name(mid):
        if mid in name_map_raw:
            return name_map_raw[mid]
        s = str(mid)
        if s in name_map_str:
            return name_map_str[s]
        return None

    speeches_df["member_name"] = speeches_df["member_id"].apply(_resolve_member_name)
    # fallback: if no member_name, use member_id as string
    speeches_df["member_name"] = speeches_df["member_name"].fillna(speeches_df["member_id"].astype(str))

    # keep only rows with party information
    speeches_df = speeches_df[speeches_df["party_name"].notna()].copy()
    if speeches_df.empty:
        raise ValueError("No speeches with party information found")

    # group by party + member
    member_stats = (
        speeches_df
        .groupby(["party_name", "member_id", "member_name"], as_index=False)
        .agg(
            n_speeches=("member_id", "count"),
            avg_score_prob=("score_prob", "mean")
        )
    )

    # global mean for bayesian adjustment
    global_mean = member_stats["avg_score_prob"].mean()

    # bayesian score
    member_stats["bayesian_score"] = member_stats.apply(
        lambda r: bayesian_adjust(r["avg_score_prob"], int(r["n_speeches"]), global_mean, alpha=30),
        axis=1
    )

    # stances
    member_stats["original_stance"] = member_stats["avg_score_prob"].apply(get_original_stance)
    member_stats["adjusted_stance"] = member_stats["bayesian_score"].apply(get_adjusted_stance)

    # rank within party
    member_stats = member_stats.sort_values(["party_name", "bayesian_score"], ascending=[True, False])
    member_stats["rank_total"] = member_stats.groupby("party_name").cumcount() + 1

    # NaN을 None으로 변환 (JSON 직렬화 가능하게)
    for col in member_stats.columns:
        if member_stats[col].dtype == 'object':
            member_stats[col] = member_stats[col].where(pd.notna(member_stats[col]), None)
        else:
            # numeric 컬럼: NaN을 None으로 변환
            member_stats[col] = member_stats[col].apply(lambda x: None if (isinstance(x, float) and pd.isna(x)) else x)

    return member_stats
