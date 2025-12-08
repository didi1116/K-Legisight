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

  // ---------------- STATE ----------------
  const [fullProfile, setFullProfile] = useState(memberProfile || null); 
  
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

    const memberId = memberProfile.member_id ?? memberProfile.id;
    if (!memberId) return;

    const fetchData = async () => {
      try {
        // A. Gọi API lấy thông tin chi tiết nghị sĩ (để lấy cái list committees)
        // Giả sử bạn có endpoint này, hoặc bạn phải bảo Backend viết thêm
        const profileRes = await fetch(`http://localhost:8000/api/legislators/${memberId}`);
        if (profileRes.ok) {
          const profileData = await profileRes.json();
          // Merge dữ liệu cũ với dữ liệu mới fetch được (chứa committees)
          setFullProfile(prev => ({ ...prev, ...profileData, type: 'person' }));
        }

        // B. Gọi API lấy danh sách bill (như cũ)
        const billsRes = await fetch(`http://localhost:8000/api/legislators/${memberId}/bills`);
        if (billsRes.ok) {
          const billsData = await billsRes.json();
          setOriginalBills(billsData.bills || []);
          setBills(billsData.bills || []);
          setAiSummary(billsData.ai_summary || "");
          
          // Cập nhật số lượng bill vào profile luôn
          setFullProfile(prev => ({ ...prev, total_bills: billsData.bills?.length || 0 }));
        }

      } catch (err) {
        console.error("Failed to load data:", err);
      }
    };

    fetchData();
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
  if (!fullProfile) {
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
        legislatorName: memberProfile.name,
        // đảm bảo có type và giữ nguyên member_id / id
        legislatorProfile: { ...memberProfile, type: 'person' },
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
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sticky">
            <LegislatorProfile
              profile={{ ...memberProfile, type: 'person', total_bills: bills.length }}
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
