from pydantic import BaseModel, EmailStr, Field
from typing import Any, Dict, List, Optional

# --- AI / ANALYSIS ---
class AnalysisInput(BaseModel):
    speech_text: str

class SentimentOutput(BaseModel):
    label: str
    confidence_score: float

class PredictionOutput(BaseModel):
    label: str
    probability: float

# --- AUTH ---
class UserCreate(BaseModel):
    email: EmailStr         
    username: str           
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    
    class Config:
        from_attributes = True 

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- SEARCH & PROFILE ---

# 1. Schema cho lịch sử ủy ban (MỚI)
class CommitteeHistoryItem(BaseModel):
    name: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None

# 2. Schema cho thông tin Nghị sĩ (MỚI)
class LegislatorProfile(BaseModel):
    id: int
    member_id: int
    type: str = "person"
    name: str
    party: Optional[str] = None
    committee: Optional[str] = None      # Ủy ban hiện tại
    committees: List[CommitteeHistoryItem] = [] # 🔥 Danh sách lịch sử ủy ban
    region: Optional[str] = None
    gender: Optional[str] = None
    count: Optional[Any] = None          # Có thể là int hoặc str ("초선")
    method: Optional[str] = None
    total_bills: Optional[int] = 0
    img: Optional[str] = None

# 3. Schema cho Bill (kết quả bên dưới Profile)
class BillInfo(BaseModel):
    id: int
    billNumber: Optional[str] = None
    billName: Optional[str] = None
    date: Optional[str] = None
    sentiment: Optional[str] = None
    score: Optional[float] = None
    role: Optional[str] = None
    proposer: Optional[str] = None
    # Các trường bổ sung nếu cần
    nSpeeches: Optional[int] = 0
    totalSpeechLength: Optional[int] = 0
    meetingId: Optional[int] = None

# 4. Input tìm kiếm (Cập nhật để khớp với main.py)
class SearchInput(BaseModel):
    query: Optional[str] = None 
    
    # Flatten filters ra để main.py gọi được data.party, data.committee
    party: Optional[str] = None
    committee: Optional[str] = None
    city: Optional[str] = None
    gender: Optional[str] = None
    count: Optional[str] = None # Số lần đắc cử
    method: Optional[str] = None # Cách thức bầu cử

# 5. Output tìm kiếm (Cập nhật cấu trúc)
class SearchResponse(BaseModel):
    profile: Optional[LegislatorProfile] = None
    results: List[BillInfo] = []  # Danh sách các bill liên quan
    ai_summary: Optional[str] = None

# --- BILL ANALYSIS ---

class BillSearchInput(BaseModel):
    """법안 검색 입력 (4개 조건 지원)"""
    bill_name: Optional[str] = None      # 법안명
    bill_number: Optional[str] = None    # 의안번호
    proposer: Optional[str] = None       # 대표발의자
    proposer_type: Optional[str] = None  # 제안 유형 (의원/정부 등)

class PartyScoreItem(BaseModel):
    party_name: str
    avg_score: float
    member_count: int
    speech_count: int  # 발언 수 (명확한 라벨)
    stance: Optional[str] = "중립"  # 협력/중립/비협력

class BillStatsDetail(BaseModel):
    """개별 법안의 통계 정보"""
    total_speeches: int = 0
    total_cooperation: float = 0.0
    party_breakdown: List[PartyScoreItem] = []
    individual_members: List[dict] = []  # 개인별 협력도 정보

class BillAnalysisItem(BaseModel):
    """개별 법안 분석 결과"""
    bill_info: dict
    stats: BillStatsDetail

class BillAnalysisResponse(BaseModel):
    """법안 검색 및 분석 응답 (복수 결과 지원)"""
    total_count: int = 0
    search_conditions: dict = {}  # 사용된 검색 조건
    results: List[BillAnalysisItem] = []  # 검색된 법안 목록
    message: Optional[str] = None


# ==========================================
# 🔥 [MỚI] SCHEMAS CHO DASHBOARD
# ==========================================

# 1. Input để ghi Log hoạt động (POST /api/log/activity)
class UserLogInput(BaseModel):
    activity_type: str  # 'search', 'view_bill', 'view_person'
    target_name: str    # 'Luật AI', 'Kim Uiyen'
    details: Optional[str] = None

# 2. Input để Bookmark (POST /api/bookmark)
class BookmarkInput(BaseModel):
    item_type: str # 'bill', 'legislator'
    item_id: str
    title: str
    score: Optional[float] = 0.0

# 3. Output cho Dashboard (GET /api/dashboard/me)
class DashboardData(BaseModel):
    user_info: Dict[str, Any]
    stats: Dict[str, Any]
    recent_activities: List[Dict[str, Any]]
    saved_bills: List[Dict[str, Any]]


