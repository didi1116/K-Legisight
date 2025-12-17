#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_party_bill_ranking.py
----------------------------------------------------------
Provides `build_party_bill_ranking(tables)` which computes
per-party bill rankings from Supabase-loaded tables (dict).

This mirrors the logic of the original script but accepts
`tables` produced by `_load_party_tables()` in `main.py`.
"""
from typing import Dict, List, Any, Tuple
import pandas as pd
import math

try:
        from util_bill import parse_bill_string
except Exception:
        # fallback parser: returns (bill_name, proposer, bill_number)
        def parse_bill_string(s: str) -> Tuple[str, str, Any]:
                if not s:
                        return (None, None, None)
                s = str(s).strip()
                # naive attempt to split number in parentheses or trailing digits
                import re
                m = re.search(r"(\d{5,})", s)
                if m:
                        num = m.group(1)
                        name = s.replace(num, "").strip(" ()\t\n")
                        return (name or s, None, num)
                return (s, None, None)


def bayesian_adjusted_score(avg: float, n: int, baseline: float = 0.0, weight: int = 30) -> float:
        if n is None or n <= 0:
                return baseline
        return (avg * n + baseline * weight) / (n + weight)


def _parse_bill_list(val) -> List[str]:
        """Normalize various bill list representations into a list of strings."""
        if val is None:
                return []
        if isinstance(val, list):
                return [str(x) for x in val if x is not None]
        if isinstance(val, str):
                v = val.strip()
                # looks like a Python list string
                if v.startswith("[") and v.endswith("]"):
                        try:
                                import ast
                                parsed = ast.literal_eval(v)
                                if isinstance(parsed, list):
                                        return [str(x) for x in parsed if x is not None]
                        except Exception:
                                pass
                # comma-separated
                if "," in v:
                        return [p.strip() for p in v.split(",") if p.strip()]
                # single string
                return [v]
        return []


def build_party_bill_ranking(tables: Dict[str, List[Dict[str, Any]]]) -> pd.DataFrame:
        """
        Compute party × bill ranking DataFrame.

        Expects `tables` to contain at least 'speeches' and optionally 'dimension'.
        Each speech row may contain bill list in one of ['bill_review','bills','bill_numbers'].
        Returns DataFrame with columns: party_name, bill_name, bill_number, speech_count, avg_score_prob, bayesian_score, rank_in_party
        """

        print("[DEBUG] 단계 0: member_bill_stats 사용하도록 변경된 입력 확인")
        mbs = tables.get("member_bill_stats", [])
        print(f"[DEBUG] member_bill_stats 행 수: {len(mbs)}")
        if not mbs:
                raise ValueError("member_bill_stats table missing or empty")

        df = pd.DataFrame(mbs)
        print(f"[DEBUG] DataFrame 생성: {df.shape} (행, 열)")
        print(f"[DEBUG] 컬럼: {list(df.columns)}")

        # dimension -> party mapping (same as before)
        print("[DEBUG] 단계 1: 정당 매핑")
        dim = tables.get("dimension", [])
        dim_df = pd.DataFrame(dim) if dim else pd.DataFrame()
        if not dim_df.empty and "member_id" in dim_df.columns and "party" in dim_df.columns:
                party_map = dict(zip(dim_df["member_id"], dim_df["party"]))
                print(f"[DEBUG] 정당 매핑 생성: {len(party_map)} 항목")
        else:
                party_map = {}
                print("[DEBUG] 정당 매핑 실패 (dimension 테이블 이상)")

        # detect member id column
        member_col = None
        for c in ["member_id","member","memberIdx","memberId"]:
                if c in df.columns:
                        member_col = c
                        break
        if member_col is None:
                raise ValueError("No member id column found in member_bill_stats")

        df["party_name"] = df[member_col].map(party_map)
        print(f"[DEBUG] party_name 할당 완료, 비NULL: {df['party_name'].notna().sum()}/{len(df)}")

        # Identify bill name/number columns
        bill_name_col = None
        bill_number_col = None
        for cand in ["bill_name","bill_title","bill","title","bill_nm"]:
                if cand in df.columns:
                        bill_name_col = cand
                        break
        for cand in ["bill_number","bill_no","bill_id","bill_num","bill_number_id"]:
                if cand in df.columns:
                        bill_number_col = cand
                        break

        # Identify count (n) and avg score columns
        n_col = None
        for cand in ["n_speeches","speech_count","n","count","num_speeches"]:
                if cand in df.columns:
                        n_col = cand
                        break

        avg_col = None
        for cand in ["avg_score_prob","score_prob","avg_score","mean_score","avg_prob"]:
                if cand in df.columns:
                        avg_col = cand
                        break

        sum_score_col = None
        for cand in ["sum_score","sum_score_prob","total_score"]:
                if cand in df.columns:
                        sum_score_col = cand
                        break

        print(f"[DEBUG] 사용 컬럼 후보: bill_name={bill_name_col}, bill_number={bill_number_col}, n={n_col}, avg={avg_col}, sum_score={sum_score_col}")

        # Coerce numeric columns where present
        if n_col is not None:
                df[n_col] = pd.to_numeric(df[n_col], errors="coerce").fillna(0).astype(int)
        else:
                # If no per-member count, assume 1 per row
                df["__n_assumed"] = 1
                n_col = "__n_assumed"

        if avg_col is not None:
                df[avg_col] = pd.to_numeric(df[avg_col], errors="coerce")

        if sum_score_col is not None:
                df[sum_score_col] = pd.to_numeric(df[sum_score_col], errors="coerce")

        # Build bill name/number columns (fallback to bill id if necessary)
        if bill_name_col is None and bill_number_col is None:
                # try to find any bill-id-like column
                for cand in ["bill_id","bill_ids"]:
                        if cand in df.columns:
                                bill_number_col = cand
                                break

        # create normalized bill_name and bill_number
        df["bill_name_norm"] = None
        df["bill_number_norm"] = None
        if bill_name_col is not None:
                df["bill_name_norm"] = df[bill_name_col].astype(str).replace('nan', None)
        if bill_number_col is not None:
                df["bill_number_norm"] = df[bill_number_col].astype(str).replace('nan', None)

        # If no bill_name but bill_number exists, use bill_number as name
        df.loc[df["bill_name_norm"].isna() & df["bill_number_norm"].notna(), "bill_name_norm"] = df.loc[df["bill_name_norm"].isna() & df["bill_number_norm"].notna(), "bill_number_norm"].astype(str)

        # Filter rows with party and some bill identifier
        df = df[df["party_name"].notna()]
        df = df[df["bill_name_norm"].notna() | df["bill_number_norm"].notna()]
        print(f"[DEBUG] 필터 후: {df.shape}")
        if df.empty:
                print('[DEBUG] ⚠️ 필터 후 데이터 없음!')
                return pd.DataFrame(columns=["party_name","bill_name","bill_number","speech_count","avg_score_prob","bayesian_score","rank_in_party"])

        # Aggregation: compute total speech_count per (party, bill) and weighted avg_score_prob
        print('[DEBUG] 단계 2: 집계 시작 (party × bill)')
        # helper to compute weighted average when possible
        def _agg_party_bill(subdf: pd.DataFrame) -> Tuple[int, float]:
                n_sum = subdf[n_col].sum()
                # compute weighted avg if avg_col present
                if avg_col is not None and n_sum > 0:
                        # if avg_col has NaN for some rows, treat them as 0 weight
                        weighted_sum = (subdf[avg_col].fillna(0) * subdf[n_col]).sum()
                        avg = float(weighted_sum / n_sum) if n_sum > 0 else 0.0
                        return int(n_sum), avg
                # fallback: if sum_score_col present
                if sum_score_col is not None and n_sum > 0:
                        total_score = subdf[sum_score_col].sum()
                        return int(n_sum), float(total_score / n_sum)
                # if only avg_col present (no counts), take mean of avg_col
                if avg_col is not None:
                        avg = float(subdf[avg_col].dropna().mean()) if not subdf[avg_col].dropna().empty else 0.0
                        return int(n_sum), avg
                # nothing available
                return int(n_sum), 0.0

        # groupby keys
        grouped_rows = []
        for (party, name, num), sub in df.groupby(["party_name","bill_name_norm","bill_number_norm"], dropna=False):
                speech_count_total, avg_score_prob_total = _agg_party_bill(sub)
                grouped_rows.append({
                        "party_name": party,
                        "bill_name": name,
                        "bill_number": num,
                        "speech_count": int(speech_count_total),
                        "avg_score_prob": float(avg_score_prob_total)
                })

        grouped = pd.DataFrame(grouped_rows)
        print(f"[DEBUG] 그룹화 완료: {grouped.shape}")

        # baseline and bayesian
        baseline = grouped["avg_score_prob"].mean() if not grouped.empty else 0.0
        print(f"[DEBUG] baseline: {baseline}")
        grouped["bayesian_score"] = grouped.apply(lambda r: bayesian_adjusted_score(r["avg_score_prob"], int(r["speech_count"]), baseline=baseline, weight=30), axis=1)

        # rank in party
        grouped["rank_in_party"] = grouped.groupby("party_name")["bayesian_score"].rank(method="first", ascending=False).astype(int)
        grouped = grouped.sort_values(["party_name","rank_in_party"]).reset_index(drop=True)
        print(f"[DEBUG] 정렬 완료: {grouped.shape}")

        # Replace NaN/NaT with None for JSON serialization (per-column)
        print("[DEBUG] 단계 3: NaN → None 변환")
        print(f"[DEBUG] NaN 개수 변환 전: {grouped.isna().sum().sum()}")
        for col in grouped.columns:
                if grouped[col].dtype == 'object':
                        grouped[col] = grouped[col].where(pd.notna(grouped[col]), None)
                else:
                        grouped[col] = grouped[col].apply(lambda x: None if (isinstance(x, float) and pd.isna(x)) else x)
        print(f"[DEBUG] NaN 개수 변환 후: {grouped.isna().sum().sum()}")

        print("[DEBUG] ✅ 완료!")
        return grouped
