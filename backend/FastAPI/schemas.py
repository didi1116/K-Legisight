from pydantic import BaseModel, EmailStr
from typing import Any, Dict, List, Optional

class AnalysisInput(BaseModel):
    speech_text: str

class SentimentOutput(BaseModel):
    label: str
    confidence_score: float

class PredictionOutput(BaseModel):
    label: str
    probability: float

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
        # orm_mode = True # (Bà giữ nguyên dòng này nếu code cũ có)
        from_attributes = True # (Hoặc dùng from_attributes = True cho Pydantic V2)

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None


class SearchInput(BaseModel):
    type: str             # 'legislator' (tìm người) hoặc 'party' (tìm đảng)
    query: Optional[str] = None # Tên người (nếu có)
    
    # Thêm cái này để chứa các bộ lọc (Đảng, Khu vực...)
    filters: Optional[Dict[str, Any]] = {}

class SearchResponse(BaseModel):
    # Đây là ví dụ, bà sửa lại field cho đúng với dữ liệu thật nha
    results: List[dict]  # Hoặc List[LegislatorSchema] nếu bà đã định nghĩa object Legislator
    total_count: int
    message: Optional[str] = None