// src/pages/LegislatorDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Bot } from "lucide-react";

import { LegislatorProfile } from '@/components/legislator/LegislatorProfile';
import { LegislatorBillTable } from '@/components/legislator/LegislatorBillTable';
import { LegislatorFilter } from '@/components/legislator/LegislatorFilter';
import { DISTRICTS } from '@/lib/constants';

export function LegislatorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const { memberProfile } = location.state || {};

  const [profileData, setProfileData] = useState(memberProfile || null);
  // ---------------- STATE ----------------
  const [originalBills, setOriginalBills] = useState([]);
  const [bills, setBills] = useState([]);
  const [aiSummary, setAiSummary] = useState("");

  const [filterName, setFilterName] = useState("");
  const [filterBill, setFilterBill] = useState("");
  const [selectedParty, setSelectedParty] = useState("all");
  const [selectedCity, setSelectedCity] = useState('all');
  const currentDistricts = DISTRICTS[selectedCity] || [];

  // ------------- 1. LOAD BILL DATA -------------
useEffect(() => {
    if (!memberProfile) return;

    // Ưu tiên member_id, fallback sang id
    const memberId = memberProfile.member_id ?? memberProfile.id;
    
    if (!memberId) {
      console.error("No member_id / id in memberProfile");
      return;
    }

    // 1. Hàm lấy danh sách Bill (Giữ nguyên)
    const fetchBills = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/legislators/${memberId}/bills`);
        if (!res.ok) throw new Error("Bills API error");
        const data = await res.json();

        setOriginalBills(data.bills || []);
        setBills(data.bills || []);
        setAiSummary(data.ai_summary || "");
      } catch (err) {
        console.error("Failed to load bills:", err);
      }
    };

    // 2. [MỚI] Hàm lấy chi tiết Profile + Lịch sử Ủy ban
    const fetchDetail = async () => {
      try {
        // Gọi endpoint detail bạn đã viết trong backend
        const res = await fetch(`http://localhost:8000/api/legislators/${memberId}/detail`);
        
        if (res.ok) {
          const data = await res.json();
          // data bao gồm: { profile: {...}, history: { committees: [...] }, ... }

          // Mapping dữ liệu lịch sử ủy ban cho khớp với Component Frontend
          const formattedCommittees = data.history?.committees?.map(c => ({
             name: c.committee,       // DB: committee -> UI: name
             startDate: c.start_date, // DB: start_date -> UI: startDate
             endDate: c.end_date      // DB: end_date -> UI: endDate
          })) || [];

          // Cập nhật state profileData
          setProfileData(prev => ({
            ...prev,            // Giữ lại các trường cũ nếu cần
            ...data.profile,    // Ghi đè bằng thông tin mới nhất từ DB
            type: 'person',     // Đảm bảo type là person
            committees: formattedCommittees // 🔥 Gắn danh sách lịch sử vào đây
          }));
        }
      } catch (err) {
        console.error("Failed to load details:", err);
      }
    };

    // Chạy cả 2 hàm song song
    fetchBills();
    fetchDetail();

  }, [memberProfile]);

  // ------------- 2. FILTER / SEARCH -------------
  const handleSearch = () => {
    let filtered = [...originalBills];

    if (filterBill) {
      filtered = filtered.filter(b => b.billName?.includes(filterBill));
    }

    // (filterName, selectedParty, selectedCity hiện chưa dùng – có thể bổ sung sau)
    setBills(filtered);
  };

  const handleReset = () => {
    setFilterName("");
    setFilterBill("");
    setSelectedParty("all");
    setSelectedCity("all");
    setBills(originalBills);
  };

  // ------------- 3. GUARD NẾU KHÔNG CÓ PROFILE -------------
  if (!memberProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <p className="text-slate-500 mb-4">의원 정보를 찾을 수 없습니다.</p>
        <Button onClick={() => navigate('/legislators')}>목록으로 돌아가기</Button>
      </div>
    );
  }

  // ------------- 4. NAVEGATE TỚI TRANG DETAIL -------------
  const goToDetail = (bill) => {
    console.log("DEBUG goToDetail bill:", bill);

    navigate('/analysis/detail', { 
      state: { 
        legislatorName: profileData?.name || memberProfile.name,
        legislatorProfile: profileData, // Truyền profile mới nhất
        billInfo: bill,
        aiSummary,           // ✅ truyền AI summary sang LegislatorBillDetail
      } 
    });
  };

  // ------------- 5. RENDER -------------
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full hover:bg-slate-200"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
            <h1 className="text-2xl font-bold text-slate-900">
              의원 상세 정보
            </h1>
          </div>
          <Button variant="outline" className="text-slate-600">
            <Download className="w-4 h-4 mr-2" /> 프로필 다운로드
          </Button>
        </div>

        {/* Filter */}
        <LegislatorFilter 
          legislatorName={filterName} setLegislatorName={setFilterName}
          billName={filterBill} setBillName={setFilterBill}
          setSelectedParty={setSelectedParty} setSelectedCity={setSelectedCity}
          currentDistricts={currentDistricts}
          onSearch={handleSearch}
          onReset={handleReset}
        />

        {/* Main content */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Profile + Bill table */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
           <LegislatorProfile
              profile={{ 
                ...profileData, 
                total_bills: bills.length // Cập nhật số lượng bill thực tế
              }}
            />
            
            <LegislatorBillTable 
              bills={bills}
              onBillClick={goToDetail}
              showProposer={false}
            />
          </div>

          {/* AI Summary */}
          <div className="bg-slate-900 text-white rounded-xl p-6 shadow-lg flex gap-4 items-start">
            <div className="p-3 bg-blue-600 rounded-full shrink-0 shadow-lg shadow-blue-900/50">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-blue-300 mb-2 flex items-center gap-2">
                AI 요약 리포트 (AI Report)
              </h3>
              <p className="text-slate-300 leading-relaxed text-sm md:text-base">
                {aiSummary}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
