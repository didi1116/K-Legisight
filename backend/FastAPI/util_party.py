# util_party.py
import pandas as pd

def safe_prob_extract(prob_dict, key):
    """sentiment_prob dict 에서 안전하게 확률 추출"""
    if isinstance(prob_dict, dict):
        return prob_dict.get(key, 0.0)
    # fallback: dict 아님 → neutral=1
    return 1.0 if key == "neutral" else 0.0


def compute_score(prob_coop, prob_noncoop):
    """협력도 = coop - noncoop"""
    return prob_coop - prob_noncoop


def bayesian_adjusted_score(score_mean, n, K=30):
    """
    베이시안 보정 점수.
    - n이 적으면 평균이 낮아지고,
    - n이 충분히 크면 원래 score_mean에 수렴
    """
    return (n / (n + K)) * score_mean
