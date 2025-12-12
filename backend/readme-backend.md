# **K-LegiSight Backend 🏛️**

K-LegiSight는 대한민국 국회의원들의 입법 활동, 회의 발언, 법안 심사 데이터를 분석하여 \*\*협력/비협력 성향(Cooperation Score)\*\*을 산출하고 시각화하는 플랫폼의 백엔드 서비스입니다.

이 프로젝트는 **FastAPI** 프레임워크를 기반으로 구축되었으며, **Supabase**를 데이터베이스로 사용하고 **Pandas**를 통해 발언 데이터를 분석합니다.

## **🛠 Tech Stack**

* **Language**: Python 3.12+  
* **Framework**: FastAPI  
* **Database**: Supabase (PostgreSQL)  
* **Data Analysis**: Pandas, NumPy  
* **Authentication**: JWT (JSON Web Tokens)  
* **Server**: Uvicorn

## **📂 Project Structure**

FastAPI/  
├── main.py                     \# API 엔드포인트 진입점 및 설정  
├── database.py                 \# Supabase 클라이언트 연결 설정  
├── auth.py                     \# JWT 인증 및 패스워드 해싱 로직  
├── schemas.py                  \# Pydantic 데이터 모델 (Request/Response 스키마)  
├── util\_common.py              \# 공통 유틸리티 (점수 계산, 텍스트 길이 계산 등)  
├── build\_member\_stats.py       \# 의원별 전체 통계 집계 로직  
├── build\_member\_bill\_stats.py  \# 의원 x 법안별 상세 통계 집계 로직  
└── build\_member\_speech\_detail.py \# 의원 발언 상세 데이터 생성 로직

## **🚀 Installation & Setup**

### **1\. 레포지토리 클론**

git clone \[https://github.com/your-repo/K-Legisight.git\](https://github.com/your-repo/K-Legisight.git)  
cd K-Legisight

### **2\. 가상환경 생성 및 활성화**

\# 가상환경 생성  
python \-m venv venv

\# Windows  
venv\\Scripts\\activate  
\# Mac/Linux  
source venv/bin/activate

### **3\. 패키지 설치**

pip install \-r requirements.txt

*(requirements.txt가 없다면 다음 패키지들을 설치하세요: fastapi, uvicorn, pandas, supabase, python-jose, passlib, bcrypt, sqlalchemy)*

### **4\. 환경 변수 설정 (.env)**

프로젝트 루트 경로에 .env 파일을 생성하고 Supabase 접속 정보를 입력하세요.

SUPABASE\_URL="your\_supabase\_url"  
SUPABASE\_KEY="your\_supabase\_anon\_key"  
SECRET\_KEY="your\_jwt\_secret\_key"

### **5\. 서버 실행**

\# 프로젝트 루트 디렉토리에서 실행  
uvicorn FastAPI.main:app \--reload

서버가 정상적으로 실행되면 http://localhost:8000 (또는 설정된 포트)에서 접속 가능합니다.

* **Swagger UI (API 문서)**: http://localhost:8000/docs  
* **ReDoc**: http://localhost:8000/redoc

## **🔑 Key Features & API**

### **1\. 국회의원 데이터 (Legislators)**

* **전체 의원 조회**: /api/legislators  
* **상세 정보 조회**: /api/legislators/{member\_id}/detail  
  * 의원 프로필, 상임위 활동 이력, 정당 이력, 대표 발의 법안 등 조회.  
* **필터링 옵션 제공**: /api/filters (정당, 지역구, 상임위 등)

### **2\. 검색 및 분석 (Search & Analysis)**

* **통합 검색**: /api/search  
  * 의원 이름, 정당, 상임위, 지역구 등 다양한 조건으로 검색 가능.  
  * 검색 결과에 대한 AI 요약 메시지 제공.

### **3\. 법안 및 발언 분석 (Bills & Speeches)**

* **의원별 법안 통계**: /api/member\_bill\_stat/{member\_id}  
  * 특정 의원이 심사한 법안 목록과 각 법안에 대한 태도(협력/중립/비협력) 분석.  
* **발언 상세 조회**: /api/speeches  
  * 특정 회의, 법안에 대한 의원의 실제 발언 텍스트 조회.  
* **법안별 발언 분석**: /api/legislators/{member\_id}/bills/{bill\_id}/speeches

### **4\. 데이터 분석 로직 (Analysis Logic)**

발언 데이터를 기반으로 다음과 같은 지표를 산출합니다.

* **협력도 점수 (Score Prob)**: prob\_coop \- prob\_noncoop 공식을 통해 \-1 \~ 1 사이의 점수 산출.  
* **성향 판단 (Stance)**: 점수 기반으로 협력/비협력/중립 태도 분류.

## **🛡️ Security**

* **CORS 설정**: 로컬 개발 환경(localhost:5173, 5174)에서의 접근을 허용합니다.  
* **JWT 인증**: /register, /token 엔드포인트를 통해 사용자 회원가입 및 로그인을 처리합니다.

## **📝 License**

This project is licensed under the MIT License.