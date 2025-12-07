# util_common.py

def compute_score_prob(prob_coop, prob_noncoop):
    return prob_coop- prob_noncoop


def compute_speech_length(text):
    if text is None:
        return 0
    return len(text.strip())