#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
predict_bill_pass_probability.py
========================================================================
📌 PURPOSE

이 스크립트는 사용자가 입력한 법안 키워드를 기준으로:

1️⃣ 임베딩 기반 의미 유사도 검색을 통해
    과거의 "구조적으로 유사한 법안들"을 선별하고

2️⃣ 해당 법안들의
    - 발언 기반 협력도(avg_score_prob)
    - 발언 수(n_speeches)
    - 실제 의결 결과(label: 통과=1 / 불통과=0)

3️⃣ 를 **완전히 설명 가능한 규칙 기반 수식**으로 결합하여

👉 다음 4가지 지표를 동시에 산출한다.

────────────────────────────────────────────────────────
① 가결 확률 (Pass Probability)
② 입법 괴리율 (Legislative Gap)
③ 신뢰도 (Confidence)
④ 자연어 설명 + 근거 법안 목록
────────────────────────────────────────────────────────

⚠️ 핵심 전제
- 이 모델은 "미래 예측 모델"이 아니다.
- 과거 입법 패턴을 구조적으로 분석하여
  "이런 유형의 법안은 보통 어떻게 귀결되는가"를 보여주는 도구다.

⚠️ 기술적 원칙
- 블랙박스 ML 사용 ❌
- 모든 계산은 사람이 추적·설명 가능한 규칙 기반 ✔
========================================================================
"""

# ======================================================================
# IMPORTS
# ======================================================================
import os
import math
import numpy as np
import pandas as pd
from typing import Dict

from dotenv import load_dotenv
from openai import OpenAI

# 임베딩 기반 유사 법안 검색 함수
from search_similar_bills import search_similar_bills


# ======================================================================
# PATH CONFIG
# ======================================================================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TRAIN_PKL = os.path.join(BASE_DIR, "FastAPI", "data", "processed", "bill_training_table.pkl")


# ======================================================================
# OPENAI CLIENT (임베딩 전용)
# ======================================================================
# ❗ 자연어 생성 모델 사용 금지
# ❗ 학습 단계와 동일한 임베딩 모델만 사용
load_dotenv()
client = OpenAI()


# ======================================================================
# QUERY EMBEDDING
# ======================================================================
def embed_query(text: str) -> np.ndarray:
    """
    사용자 입력 법안 키워드를
    학습 단계와 동일한 임베딩 모델로 벡터화한다.

    반환:
    - shape: (1, embedding_dim)
    """
    res = client.embeddings.create(
        model="text-embedding-3-large",
        input=text
    )
    return np.array(res.data[0].embedding).reshape(1, -1)


# ======================================================================
# WEIGHT FUNCTION
# ======================================================================
def compute_weight(
    similarity: float,
    n_speeches: int,
    avg_score_prob: float,
    alpha: float = 1.5
) -> float:
    """
    하나의 과거 법안이
    현재 법안 예측에 얼마나 신뢰할 만한 근거인지를 결정하는 가중치.

    --------------------------------------------------------------
    weight =
        (의미 유사도)
      × (논의 충분성)
      × (정치적 신호 강도)
    --------------------------------------------------------------

    ⚠️ 중요:
    - 이 weight는 "확률"을 만들지 않는다.
    - 오직 '이 법안을 얼마나 믿을 것인가'만 결정한다.
    """

    # 발언 수가 많을수록 신뢰 ↑ (log로 완만화)
    speech_factor = math.log(1 + max(n_speeches, 1))

    # 협력/비협력의 강도(|값|)만 반영, 방향은 제외
    signal_strength = 1 + alpha * abs(avg_score_prob)

    return similarity * speech_factor * signal_strength


# ======================================================================
# MAIN PREDICTION FUNCTION
# ======================================================================
def predict_bill_pass_probability(query_text: str) -> Dict:
    """
    단일 법안 키워드 입력 →
    가결 확률 + 입법 괴리율 + 신뢰도 + 설명 + 근거 반환
    """

    # --------------------------------------------------
    # 1) 학습 데이터 로드
    # --------------------------------------------------
    bill_df = pd.read_pickle(TRAIN_PKL)

    # --------------------------------------------------
    # 2) 쿼리 임베딩
    # --------------------------------------------------
    query_embedding = embed_query(query_text)

    # --------------------------------------------------
    # 3) 유사 법안 검색
    # --------------------------------------------------
    candidates = search_similar_bills(
        query_embedding=query_embedding,
        bill_df=bill_df,
        strict_threshold=0.60,
        soft_threshold=0.45,
        min_evidence=5
    )

    if candidates.empty:
        return {
            "query": query_text,
            "predicted_pass_probability": None,
            "legislative_gap": None,
            "confidence": None,
            "explanation": "유사한 과거 법안을 찾을 수 없습니다.",
            "evidence_bills": []
        }

    # --------------------------------------------------
    # 4) 근거 법안 정리 + 가중합
    # --------------------------------------------------
    weighted_sum = 0.0
    weight_total = 0.0
    evidence = []

    for _, r in candidates.iterrows():
        w = compute_weight(
            r.similarity,
            r.n_speeches,
            r.avg_score_prob
        )

        weighted_sum += w * r.label
        weight_total += w

        evidence.append({
            "bill_number": r.bill_number,
            "bill_name": r.bill_name,
            "avg_score_prob": r.avg_score_prob,
            "n_speeches": int(r.n_speeches),
            "label": int(r.label),
            "similarity": round(r.similarity, 4),
            "stance": (
                "협력" if r.avg_score_prob > 0.05 else
                "비협력" if r.avg_score_prob < -0.05 else
                "중립"
            )
        })

    # --------------------------------------------------
    # 5) 가결 확률 계산 (⭐ 최종 설계)
    # --------------------------------------------------

    # (A) 실제 과거 성과 기반 확률
    data_pass_prob = weighted_sum / weight_total if weight_total > 0 else 0.5

    # (B) 논의 분위기 기반 기대치
    avg_coop = np.mean([e["avg_score_prob"] for e in evidence])
    coop_expectation = (avg_coop + 1) / 2   # -1~1 → 0~1

    # (C) 논의 신뢰도 (발언 수 기반)
    total_speeches = sum(e["n_speeches"] for e in evidence)

    # 발언 0 → 0 / 발언 충분 → 1
    speech_confidence = min(
        math.log(1 + total_speeches) / math.log(1 + 1000),
        1.0
    )

    # (D) 논의 기반 확률
    # 발언이 적으면 중립(0.5)로 회귀
    discussion_based_prob = (
        speech_confidence * coop_expectation +
        (1 - speech_confidence) * 0.5
    )

    # (E) ⭐ 최종 가결 확률
    # 발언이 많을수록:
    # - 실제 성과(60%)
    # - 논의 분위기(40%)
    pass_prob = (
        (1 - speech_confidence) * 0.5 +
        speech_confidence * (
            0.6 * data_pass_prob +
            0.4 * discussion_based_prob
        )
    )

    # 안전 클리핑 (0% / 100% 방지)
    pass_prob = max(0.01, min(pass_prob, 0.99))

    # --------------------------------------------------
    # 6) 입법 괴리율 계산 (⭐ 최종 철학 반영 - 연속 방향 모델)
    # --------------------------------------------------
    # 핵심 철학 요약:
    # 1) 괴리는 "논의 기대 vs 실제 결과의 거리"에서 출발한다
    # 2) 하지만 그 거리가 의미를 가지려면,
    #    - 논의 방향이 얼마나 명확했는지가 중요하다
    # 3) 따라서 괴리율은 아래 3요소의 곱으로 정의된다
    #
    #   괴리율 =
    #     |논의 기대치 - 실제 결과|
    #     × 논의 신뢰도(발언량)
    #     × 방향 명확도(협력 vs 비협력의 분명함)
    #
    # ※ 중립이 많으면 → 방향 명확도 ↓ → 괴리 자동 감소
    # ※ 발언이 많으면 → 논의 신뢰도 ↑ → 괴리 증폭 가능
    # --------------------------------------------------

    # (0) 실제 통과 비율 (0~1)
    real_pass_rate = np.mean([e["label"] for e in evidence])

    # (1) 기본 괴리 크기: 기대와 결과의 거리
    # - 협력 기대(coop_expectation)와 실제 결과가 얼마나 어긋났는가
    raw_gap = abs(coop_expectation - real_pass_rate)

    # --------------------------------------------------
    # (2) 방향 명확도 계산 (⭐ 핵심 개선 포인트)
    # --------------------------------------------------
    # 협력/비협력 발언이
    # "얼마나 분명하게 한쪽으로 기울어 있었는가?"를 수치화한다.

    coop_strength = sum(
        e["n_speeches"] * abs(e["avg_score_prob"])
        for e in evidence
        if e["avg_score_prob"] > 0.05
    )

    noncoop_strength = sum(
        e["n_speeches"] * abs(e["avg_score_prob"])
        for e in evidence
        if e["avg_score_prob"] < -0.05
    )

    direction_total = coop_strength + noncoop_strength

    if direction_total == 0:
        # 전부 중립에 가까운 경우 → 방향성 거의 없음
        direction_confidence = 0.0
    else:
        # 0 ~ 1
        # 1에 가까울수록 한쪽 방향이 매우 명확
        direction_confidence = abs(coop_strength - noncoop_strength) / direction_total

    # --------------------------------------------------
    # (3) 최종 입법 괴리율
    # --------------------------------------------------
    legislative_gap = (
        raw_gap *
        speech_confidence *
        direction_confidence
    )

    # --------------------------------------------------
    # 6-1) 괴리 수준 구간화 (의미 기반)
    # --------------------------------------------------
    if legislative_gap < 0.08:
        gap_level = "최하"   # 논의와 결과가 거의 일치
    elif legislative_gap < 0.18:
        gap_level = "하"     # 약한 불일치
    elif legislative_gap < 0.30:
        gap_level = "중"     # 의미 있는 괴리
    elif legislative_gap < 0.45:
        gap_level = "상"     # 구조적 괴리
    else:
        gap_level = "최상"   # 심각한 입법 괴리


    # --------------------------------------------------
    # 7) 신뢰도 계산
    # --------------------------------------------------
    avg_similarity = np.mean([e["similarity"] for e in evidence])

    confidence_score = round(
        0.4 * min(len(evidence) / 10, 1.0) +
        0.4 * avg_similarity +
        0.2 * min(weight_total / 5.0, 1.0),
        3
    )

    confidence_level = (
        "높음" if confidence_score >= 0.7 else
        "보통" if confidence_score >= 0.4 else
        "낮음"
    )

    # --------------------------------------------------
    # 8) 설명 생성
    # --------------------------------------------------
    stance = (
        "협력 우세" if avg_coop > 0.03 else
        "비협력 우세" if avg_coop < -0.03 else
        "중립"
    )

    explanation = (
        f"입력된 법안 '{query_text}'은(는) "
        f"과거 유사 법안 {len(evidence)}건, "
        f"총 {total_speeches}회의 발언을 기준으로 분석되었습니다. "
        f"전체 논의 분위기는 '{stance}'이며, "
        f"입법 괴리 수준은 '{gap_level}'로 평가됩니다."
    )

    # --------------------------------------------------
    # 9) 반환
    # --------------------------------------------------
    return {
        "query": query_text,
        "predicted_pass_probability": round(pass_prob, 4),
        "legislative_gap": {
            "score": round(legislative_gap, 4),
            "level": gap_level
        },
        "confidence": {
            "score": confidence_score,
            "level": confidence_level
        },
        "explanation": explanation,
        "evidence_bills": evidence
    }


# ======================================================================
# CLI INTERFACE
# ======================================================================
if __name__ == "__main__":

    print("\n======================================")
    print("📊 법안 통과 가능성 분석기")
    print("종료하려면 'exit' 입력")
    print("======================================\n")

    while True:
        query = input("🔍 법안 키워드 입력 > ").strip()

        if query.lower() in ("exit", "quit"):
            print("종료합니다.")
            break

        result = predict_bill_pass_probability(query)

        print("\n[예측 결과]")
        print(f"가결 확률: {result['predicted_pass_probability']}")
        print(f"입법 괴리율: {result['legislative_gap']}")
        print(f"신뢰도: {result['confidence']}")

        print("\n[설명]")
        print(result["explanation"])

        print("\n[근거 법안]")
        for i, e in enumerate(result["evidence_bills"], 1):
            result_str = "통과" if e["label"] == 1 else "불통과"
            print(
                f"{i}. {e['bill_name']} "
                f"(의안번호: {e['bill_number']}) | "
                f"논의태도: {e['stance']} | "
                f"의결결과: {result_str} | "
                f"법안유사도 {e['similarity']}"
            )

        print("\n--------------------------------------\n")
