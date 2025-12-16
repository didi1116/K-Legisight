#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
extract_unique_committees.py
=========================================
간단 목적: `all_committee.pkl` 또는 지정한 pickle 파일에서
`committee` 컬럼의 고유한 값들을 추출하여 CSV로 저장합니다.

출력: 기본 `./output_committee/unique_committees.csv` (committee, count)

사용법:
  python extract_unique_committees.py --input ./output_committee/all_committee.pkl \
      --output ./output_committee/unique_committees.csv

옵션:
  --only-names  : 이름만 저장하는 추가 CSV 파일(`_names.csv`)도 생성
"""

from __future__ import annotations
import argparse
import os
import pandas as pd


def extract_unique_committees(input_pkl: str, output_csv: str, only_names: bool = False) -> None:
    if not os.path.exists(input_pkl):
        raise FileNotFoundError(f"Input file not found: {input_pkl}")

    df = pd.read_pickle(input_pkl)

    if "committee" not in df.columns:
        raise ValueError("Input DataFrame does not contain a 'committee' column")

    # 문자열로 안전하게 변환하고 공백 정리
    s = df["committee"].dropna().astype(str).str.strip()
    s = s.str.replace(r"\s+", " ", regex=True)

    # 고유값과 빈도 계산
    counts = s.value_counts(dropna=True).reset_index()
    counts.columns = ["committee", "count"]

    os.makedirs(os.path.dirname(output_csv) or ".", exist_ok=True)
    counts.to_csv(output_csv, index=False, encoding="utf-8-sig")
    print(f"Saved unique committees with counts to: {output_csv}")

    if only_names:
        names_path = os.path.splitext(output_csv)[0] + "_names.csv"
        counts[["committee"]].to_csv(names_path, index=False, encoding="utf-8-sig")
        print(f"Saved committee names to: {names_path}")


def build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Extract unique committee names from pickle and save to CSV")
    p.add_argument("--input", "-i", default="./output_committee/all_committee.pkl", help="Input pickle file path")
    p.add_argument("--output", "-o", default="./output_committee/unique_committees.csv", help="Output CSV path")
    p.add_argument("--only-names", action="store_true", help="Also write a names-only CSV (suffix _names.csv)")
    return p


if __name__ == "__main__":
    parser = build_arg_parser()
    args = parser.parse_args()

    try:
        extract_unique_committees(args.input, args.output, only_names=args.only_names)
    except Exception as e:
        print(f"Error: {e}")
        raise
