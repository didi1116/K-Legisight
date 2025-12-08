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