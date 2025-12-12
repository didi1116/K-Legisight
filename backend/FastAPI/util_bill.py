# util_bill.py
# ---------------------------------------------------------
# bill_review 문자열을 안정적으로 파싱하여
#  1) bill_name_clean  (법안명만)
#  2) bill_proposer    (대표발의자 등 정보)
#  3) bill_number      (의안번호)
# 형태로 분리하는 유틸리티.
#
# JSON 원문 형태 예시:
#   "5. 뇌 산업 육성 및 지원에 관한 법률안(홍석준 의원 대표발의)(의안번호 2106445)"
#
# 특징:
#  - 숫자 prefix (ex: "5.") 자동 제거
#  - 의안번호 (2106445) 자동 감지
#  - 대표발의 정보 (홍석준 의원...) 자동 추출
#  - 괄호 중첩/순서/유무에 관계없이 robust 파싱
#  - 번호나 제안자가 없는 경우도 안전 처리
# ---------------------------------------------------------

import re


# ---------------------------------------------------------
# 숫자 prefix "1. " 같은 부분 제거
# ---------------------------------------------------------
def _remove_prefix(s):
    return re.sub(r"^\s*\d+\.\s*", "", s).strip()


# ---------------------------------------------------------
# 괄호 내용 추출 (여러 개 있을 수 있음)
# ---------------------------------------------------------
def _extract_parentheses_parts(s):
    """
    ex)
      "법률안(홍석준 의원 대표발의)(의안번호 2106445)"
        → ["홍석준 의원 대표발의", "의안번호 2106445"]
    """
    return re.findall(r"\((.*?)\)", s)


# ---------------------------------------------------------
# 의안번호 추출
# ---------------------------------------------------------
def _extract_bill_number(parts):
    """
    괄호 안의 문구들 중에서 의안번호가 포함된 항목을 탐지.
    예: "의안번호 2106445" 또는 "의안번호:2106445"
    """
    for p in parts:
        match = re.search(r"(\d{6,})", p)
        if match:
            return match.group(1)
    return None


# ---------------------------------------------------------
# 대표발의자 정보 추출
# ---------------------------------------------------------
def _extract_proposer(parts, bill_number):
    """
    의안번호와 무관한 괄호 속 문구들은 대표발의 정보로 간주.
    여러 개일 수도 있으나 보통 1개.
    """
    proposers = []
    for p in parts:
        if bill_number and bill_number in p:
            continue
        # 의안번호가 아닌 괄호 정보는 대표발의자로 처리
        proposers.append(p.strip())
    if not proposers:
        return None
    return " / ".join(proposers)


# ---------------------------------------------------------
# 메인 파싱 함수
# ---------------------------------------------------------
def parse_bill_string(raw_str):
    """
    bill_review의 원본 문자열을 받아, 아래 3개 데이터를 반환:
      - bill_name_clean
      - bill_proposer
      - bill_number
    """
    if raw_str is None or not isinstance(raw_str, str):
        return None, None, None

    s = raw_str.strip()

    # 1) 앞의 "5." 같은 prefix 제거
    s = _remove_prefix(s)

    # 2) 괄호 안의 요소들 모두 추출
    parts = _extract_parentheses_parts(s)

    # 3) 의안번호 분리
    bill_number = _extract_bill_number(parts)

    # 4) 대표발의자 분리
    bill_proposer = _extract_proposer(parts, bill_number)

    # 5) 법안명만 남기기 (괄호 제거)
    bill_name_clean = re.sub(r"\(.*?\)", "", s).strip()

    # 6) 혹시 법안명이 완전히 비어버리면 raw 전체를 사용
    if bill_name_clean == "":
        bill_name_clean = s

    return bill_name_clean, bill_proposer, bill_number
