#!/usr/bin/env python3
"""
정당별 법안 협력도 랭킹 생성기.

이전 버전은 all_party.pkl 과 bill_review 문자열을 사용했지만,
지금은 Supabase 테이블 구조(또는 동일한 dict 형태의 데이터)를 바로 받아
전처리 후 랭킹을 계산한다.

필수 테이블 키(모두 dict/list 형태):
  - dimension          : 의원 기본 정보 (member_id, party_id, party 등)
  - parties            : 정당 정보 (party_id, name)
  - bills              : 법안 정보 (bill_id, bill_name)
  - member_bill_stats  : 의원 × 법안 단위 협력도/발언 수

입력 예시는 README 상의 table example 형태를 따른다.
"""

from __future__ import annotations

import os
from typing import Dict, List, Optional, Any

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


def _safe_int(val: Any, default: int = 0) -> int:
    try:
        if val is None:
            return default
        return int(float(val))
    except Exception:
        return default


def bayesian_adjusted_score(avg: float, n: float, baseline: float = 0.0, weight: int = 30) -> float:
    return (avg * n + baseline * weight) / (n + weight)


def _extract_score(row: pd.Series) -> Optional[float]:
    for key in ("score_prob_mean", "score_prob"):
        if key in row and pd.notna(row[key]):
            val = _safe_float(row[key])
            if val is not None:
                return val

    coop = _safe_float(row.get("prob_coop"))
    noncoop = _safe_float(row.get("prob_noncoop"))
    if coop is not None and noncoop is not None:
        return coop - noncoop
    return None


def build_party_bill_ranking(tables: Dict[str, List[Dict[str, Any]]]) -> pd.DataFrame:
    member_bill = pd.DataFrame(tables.get("member_bill_stats") or [])
    if member_bill.empty:
        raise ValueError("member_bill_stats 테이블이 비어 있습니다.")

    dimension = pd.DataFrame(tables.get("dimension") or [])
    bills = pd.DataFrame(tables.get("bills") or [])
    parties = pd.DataFrame(tables.get("parties") or [])

    party_lookup = {}
    if not parties.empty:
        try:
            parties = parties.rename(columns={"name": "party_name"})
            parties["party_id"] = parties["party_id"].apply(_safe_int)
            party_lookup = parties.set_index("party_id")["party_name"].to_dict()
        except Exception:
            party_lookup = {}

    member_party = pd.DataFrame(columns=["member_id", "party_id", "party_name"])
    if not dimension.empty:
        member_party = dimension[["member_id", "party_id", "party"]].copy()
        member_party = member_party.rename(columns={"party": "party_name"})
        member_party["party_id"] = member_party["party_id"].apply(_safe_int)
        member_party["party_name"] = member_party["party_name"].fillna(
            member_party["party_id"].map(party_lookup)
        )

    member_bill = member_bill.merge(member_party, on="member_id", how="left")
    member_bill["party_name"] = member_bill["party_name"].fillna(
        member_bill["party_id"].map(party_lookup)
    )

    if not bills.empty:
        bills = bills.rename(columns={"bill_name": "bill_title"})
        bills["bill_id"] = bills["bill_id"].astype(str)
        member_bill["bill_id"] = member_bill["bill_id"].astype(str)
        member_bill = member_bill.merge(
            bills[["bill_id", "bill_title"]],
            on="bill_id",
            how="left",
        )
    else:
        member_bill["bill_title"] = None

    member_bill["score"] = member_bill.apply(_extract_score, axis=1)
    member_bill["n_speeches"] = member_bill.get("n_speeches", pd.Series([1] * len(member_bill))).apply(
        lambda x: max(_safe_int(x, default=1), 1)
    )

    member_bill = member_bill.dropna(subset=["party_name", "bill_id", "score"])

    member_bill["weighted_score"] = member_bill["score"] * member_bill["n_speeches"]

    grouped = (
        member_bill.groupby(["party_id", "party_name", "bill_id", "bill_title"], as_index=False)
        .agg(
            speech_count=("n_speeches", "sum"),
            score_sum=("weighted_score", "sum"),
        )
    )

    if grouped.empty:
        raise ValueError("집계 결과가 없습니다. 입력 데이터를 확인하세요.")

    grouped["avg_score_prob"] = grouped["score_sum"] / grouped["speech_count"]
    baseline = grouped["avg_score_prob"].mean()

    grouped["bayesian_score"] = grouped.apply(
        lambda r: bayesian_adjusted_score(
            avg=r["avg_score_prob"],
            n=r["speech_count"],
            baseline=baseline,
            weight=30,
        ),
        axis=1,
    )

    grouped["rank_in_party"] = (
        grouped.groupby("party_id")["bayesian_score"]
        .rank(method="first", ascending=False)
        .astype(int)
    )

    grouped = grouped.sort_values(["party_name", "rank_in_party"])

    grouped = grouped.rename(columns={"bill_title": "bill_name"})
    grouped = grouped[
        [
            "party_id",
            "party_name",
            "bill_name",
            "bill_id",
            "speech_count",
            "avg_score_prob",
            "bayesian_score",
            "rank_in_party",
        ]
    ]

    return grouped


if __name__ == "__main__":
    raise SystemExit("이 스크립트는 build_party_bill_ranking(tables) 함수로 호출하세요.")
