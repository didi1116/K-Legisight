# build_member_stats.py
"""
의원(member_id) 단위의 전체 요약 통계를 생성하는 모듈.

- speeches 테이블(or all_speeches.pkl)에서 가져온 DataFrame을 입력으로 받아
  member_id 기준 집계 통계를 계산한다.
"""

import ast
from typing import Optional

import pandas as pd
from util_common import compute_score_prob, compute_speech_length

# 기존 CLI 실행용 경로 (원하면 계속 사용)
INPUT_PICKLE = "./output_member/all_speeches.pkl"
OUTPUT_CSV   = "./output_member/member_stats.csv"


def _ensure_prob_columns(df: pd.DataFrame) -> pd.DataFrame:
    """
    prob_noncoop / prob_coop / prob_neutral 이 없으면 sentiment_prob(dict)에서 채우거나,
    그래도 없으면 0으로 채운다.
    """
    df = df.copy()

    has_all_prob_cols = all(col in df.columns for col in [
        "prob_noncoop", "prob_coop", "prob_neutral"
    ])

    if not has_all_prob_cols and "sentiment_prob" in df.columns:
        # 예전 구조: sentiment_prob = {"noncoop": ..., "coop": ..., "neutral": ...}
        def get_prob(x, key: str) -> float:
            if isinstance(x, dict):
                return float(x.get(key, 0.0))
            # 확률 정보가 없으면 neutral=1 로 간주
            return 1.0 if key == "neutral" else 0.0

        df["prob_noncoop"] = df.get("prob_noncoop",
                                    pd.Series(dtype=float)).fillna(
                                        df["sentiment_prob"].apply(lambda x: get_prob(x, "noncoop"))
                                    )
        df["prob_coop"] = df.get("prob_coop",
                                 pd.Series(dtype=float)).fillna(
                                     df["sentiment_prob"].apply(lambda x: get_prob(x, "coop"))
                                 )
        df["prob_neutral"] = df.get("prob_neutral",
                                    pd.Series(dtype=float)).fillna(
                                        df["sentiment_prob"].apply(lambda x: get_prob(x, "neutral"))
                                    )
    else:
        # 최소한 컬럼은 존재하도록 보장
        for col in ["prob_noncoop", "prob_coop", "prob_neutral"]:
            if col not in df.columns:
                df[col] = 0.0
        df[["prob_noncoop", "prob_coop", "prob_neutral"]] = (
            df[["prob_noncoop", "prob_coop", "prob_neutral"]].fillna(0.0)
        )

    return df


def _parse_bill_numbers(val) -> list[str]:
    """
    bill_numbers 예시: "['2116990', '2119796']" (TEXT) → ['2116990', '2119796']
    """
    if val is None:
        return []
    if isinstance(val, list):
        return [str(x) for x in val]

    if isinstance(val, str):
        # literal_eval 시도
        try:
            parsed = ast.literal_eval(val)
            if isinstance(parsed, list):
                return [str(x) for x in parsed]
        except Exception:
            pass
        # 실패하면 쉼표 기준 fallback
        return [v.strip() for v in val.split(",") if v.strip()]

    return []


def build_member_stats(df: pd.DataFrame) -> pd.DataFrame:
    """
    speeches 형식의 DataFrame을 입력으로 받아,
    의원(member_id) 단위 통계를 계산해서 DataFrame으로 반환한다.

    기대 컬럼 (있으면 사용, 없으면 가능한 범위 내에서 계산):
    - member_id, member_name
    - speech_id
    - speech_length
    - prob_noncoop, prob_coop, prob_neutral
    - sentiment_label (0,1,2)
    - score_prob
    - speech_text
    - bill_numbers (TEXT, 예: "['2116990', '2119796']")
    """
    if df is None or df.empty:
        return pd.DataFrame()

    df = df.copy()

    # 1) 확률 컬럼 정리
    df = _ensure_prob_columns(df)

    # 2) score_prob, speech_length 보정
    if "score_prob" not in df.columns or df["score_prob"].isna().all():
        df["score_prob"] = df.apply(
            lambda r: compute_score_prob(float(r["prob_coop"]), float(r["prob_noncoop"])),
            axis=1,
        )

    if "speech_length" not in df.columns or df["speech_length"].isna().all():
        df["speech_length"] = df["speech_text"].apply(compute_speech_length)

    # 3) 의원 이름 통일 (member_id 기준으로 가장 많이 등장한 이름 사용)
    name_map = (
        df.groupby("member_id")["member_name"]
          .agg(lambda x: x.mode()[0] if len(x) > 0 else None)
          .to_dict()
    )

    # 4) 의원 단위 기본 통계
    basic_stats = df.groupby("member_id").agg(
        total_speeches=("speech_id", "count"),
        total_speech_length=("speech_length", "sum"),
        avg_speech_length=("speech_length", "mean"),
        avg_prob_coop=("prob_coop", "mean"),
        avg_prob_noncoop=("prob_noncoop", "mean"),
        avg_prob_neutral=("prob_neutral", "mean"),
        cooperation_score_prob=("score_prob", "mean"),
    ).reset_index()

    # 5) 고유 법안 수(bills_count)
    if "bill_numbers" in df.columns:
        df_bills = df.copy()
        df_bills["__bill_list"] = df_bills["bill_numbers"].apply(_parse_bill_numbers)
        bills_count = (
            df_bills.groupby("member_id")["__bill_list"]
            .apply(lambda x: len(set(sum(x.tolist(), []))))
            .reset_index(name="bills_count")
        )
    elif "bill_review" in df.columns:
        # 예전 구조 호환: bill_review 가 list[list[str]] 형태라고 가정
        def _as_list(val):
            return val if isinstance(val, list) else []

        df_bills = df.copy()
        df_bills["__bill_list"] = df_bills["bill_review"].apply(_as_list)
        bills_count = (
            df_bills.groupby("member_id")["__bill_list"]
            .apply(lambda x: len(set(sum(x.tolist(), []))))
            .reset_index(name="bills_count")
        )
    else:
        bills_count = pd.DataFrame({
            "member_id": df["member_id"].unique(),
            "bills_count": 0
        })

    # 6) sentiment_label 카운트 (0,1,2)
    if "sentiment_label" in df.columns:
        label_counts = (
            df.groupby(["member_id", "sentiment_label"])["speech_id"]
              .count()
              .unstack(fill_value=0)
        )
        # 컬럼 이름을 count_label_0,1,2 형태로 변경
        label_counts = label_counts.rename(
            columns={c: f"count_label_{c}" for c in label_counts.columns}
        )
    else:
        label_counts = pd.DataFrame()

    # 7) 병합
    result = (
        basic_stats
        .merge(bills_count, on="member_id", how="left")
    )

    result["member_name"] = result["member_id"].map(name_map)
    result["controversy_rate"] = (
        result["avg_prob_coop"] + result["avg_prob_noncoop"]
    )

    if not label_counts.empty:
        result = result.merge(label_counts, on="member_id", how="left")

    # 정렬
    result = result.sort_values("member_id").reset_index(drop=True)

    return result


if __name__ == "__main__":
    """
    예전처럼 단독 실행 시:
    - all_speeches.pkl 을 읽어 전체 의원 통계를 CSV로 저장
    """
    try:
        df_all = pd.read_pickle(INPUT_PICKLE)
    except FileNotFoundError:
        raise FileNotFoundError(
            f"[ERROR] all_speeches.pkl 을 찾을 수 없습니다: {INPUT_PICKLE}"
        )

    result_all = build_member_stats(df_all)

    # Excel 지수표기 방지를 원할 때만 문자열 포맷 적용
    for col in [
        "avg_prob_coop",
        "avg_prob_noncoop",
        "avg_prob_neutral",
        "cooperation_score_prob",
    ]:
        if col in result_all.columns:
            result_all[col] = result_all[col].apply(
                lambda x: f'="{float(x):.20f}"'
            )

    result_all.to_csv(OUTPUT_CSV, index=False, encoding="utf-8-sig")

    print("==============================================")
    print("[SUCCESS] member_stats.csv 생성 완료")
    print(" → 저장 위치:", OUTPUT_CSV)
    print(" → 총 의원 수:", len(result_all))
    print("==============================================")
