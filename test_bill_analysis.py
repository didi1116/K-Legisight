#!/usr/bin/env python3
"""
/api/bills/analysis 엔드포인트 테스트
bill_member_score 테이블에서 데이터를 가져오는지 확인
"""

import requests
import json

# FastAPI 서버 URL
BASE_URL = "http://localhost:8000"

def test_bill_analysis():
    """
    법안 검색 및 분석 API 테스트
    """
    print("=" * 80)
    print("테스트: POST /api/bills/analysis")
    print("=" * 80)
    
    # 테스트 케이스 1: bill_number로 검색 (2101823)
    test_cases = [
        {
            "name": "인공지능법 검색",
            "payload": {
                "bill_number": "2101823",
                "bill_name": None,
                "proposer": None,
                "proposer_type": None
            }
        },
        {
            "name": "인공지능 법안 검색 (부분)",
            "payload": {
                "bill_number": None,
                "bill_name": "인공지능",
                "proposer": None,
                "proposer_type": None
            }
        }
    ]
    
    for test_case in test_cases:
        print(f"\n📋 테스트: {test_case['name']}")
        print(f"요청: {test_case['payload']}")
        
        try:
            response = requests.post(
                f"{BASE_URL}/api/bills/analysis",
                json=test_case['payload'],
                timeout=30
            )
            
            print(f"상태 코드: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                print(f"\n✅ 응답 성공!")
                print(f"  - 총 검색된 법안: {data.get('total_count')}")
                print(f"  - 분석된 법안: {data.get('analyzed_count')}")
                print(f"  - 메시지: {data.get('message')}")
                
                # 각 법안의 상세 정보 출력
                results = data.get('results', [])
                for i, result in enumerate(results[:3]):  # 최대 3개만 출력
                    bill_info = result.get('bill_info', {})
                    stats = result.get('stats', {})
                    
                    print(f"\n  📌 법안 #{i+1}: {bill_info.get('bill_name')} (ID: {bill_info.get('bill_id')})")
                    print(f"     - 총 발언: {stats.get('total_speeches')}")
                    print(f"     - 평균 협력도: {stats.get('total_cooperation'):.4f}")
                    
                    # 정당별 분석
                    party_breakdown = stats.get('party_breakdown', [])
                    if party_breakdown:
                        print(f"     - 정당별 분석: {len(party_breakdown)}개 정당")
                        for party in party_breakdown:
                            print(f"       • {party.get('party_name')}: 협력도 {party.get('avg_score'):.4f}, 발언 {party.get('speech_count')}회")
                    
                    # 개인별 분석 (TOP 5)
                    individual_members = stats.get('individual_members', [])
                    if individual_members:
                        print(f"     - 협력 의원 TOP 5:")
                        for member in individual_members[:5]:
                            print(f"       • {member.get('member_name')} ({member.get('party_name')}): 협력도 {member.get('score'):.4f}, 발언 {member.get('n_speeches')}회")
                    else:
                        print(f"     ⚠️  개인 데이터 없음 (bill_member_score 미존재)")
            else:
                print(f"❌ 오류: {response.status_code}")
                print(f"응답: {response.text}")
        
        except requests.exceptions.ConnectionError:
            print(f"❌ 연결 오류: FastAPI 서버가 {BASE_URL}에서 실행 중이 아닙니다.")
            print("다음 명령으로 서버를 시작하세요:")
            print("  cd backend/FastAPI")
            print("  uvicorn main:app --reload --port 8000")
            return False
        
        except Exception as e:
            print(f"❌ 예외 발생: {str(e)}")
            return False
    
    print("\n" + "=" * 80)
    print("✅ 모든 테스트 완료!")
    print("=" * 80)
    return True

if __name__ == "__main__":
    test_bill_analysis()
