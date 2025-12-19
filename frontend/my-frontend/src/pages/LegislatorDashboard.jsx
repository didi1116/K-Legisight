// src/pages/LegislatorDashboard.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bot } from "lucide-react";

import { LegislatorProfile } from '@/components/legislator/LegislatorProfile';
import { LegislatorBillTable } from '@/components/legislator/LegislatorBillTable';
import { LegislatorFilter } from '@/components/legislator/LegislatorFilter';
import { DISTRICTS } from '@/lib/constants';

export function LegislatorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 데이터 수신
  const { memberProfile } = location.state || {};

  // 초기 상태를 null로 설정하여 API 응답 후에만 렌더링
  const [profileData, setProfileData] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  // ---------------- STATE ----------------
  const [bills, setBills] = useState([]);
  const [originalBills, setOriginalBills] = useState([]);
  const [aiSummary, setAiSummary] = useState("");

  // ---------------- FILTER STATE ----------------
  const [filterName, setFilterName] = useState("");
  const [filterBill, setFilterBill] = useState("");
  const [selectedParty, setSelectedParty] = useState("all");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [selectedCommittee, setSelectedCommittee] = useState("all");
  const [selectedGender, setSelectedGender] = useState("all");
  const [selectedAge, setSelectedAge] = useState("all");
  const [selectedCount, setSelectedCount] = useState("all");
  const [selectedMethod, setSelectedMethod] = useState("all");

  const currentDistricts = DISTRICTS[selectedCity] || [];

  // 통계 계산
  const stats = { coop: 0, nonCoop: 0, neutral: 0 };
  if (bills && bills.length > 0) {
    bills.forEach(bill => {
      const sentimentVal = bill.sentiment || bill.score || "";
      if (sentimentVal === "협력") stats.coop += 1;
      else if (sentimentVal === "비협력") stats.nonCoop += 1;
      else stats.neutral += 1;
    });
  }

  // ------------- 1. LOAD DATA -------------
  useEffect(() => {
    if (!memberProfile) return;

    const memberId = memberProfile.member_id ?? memberProfile.id;
    
    if (!memberId) {
      console.error("No member_id found");
      return;
    }

    // A. Fetch Bills
    const fetchBills = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/legislators/${memberId}/bills`);
        if (res.ok) {
          const data = await res.json();
          setOriginalBills(data.bills || []);
          setBills(data.bills || []); 
          setAiSummary(data.ai_summary || "");
        }
      } catch (err) {
        console.error("Failed to load bills:", err);
      }
    };

    // B. Fetch Detail
    const fetchDetail = async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/legislators/${memberId}/detail`);
        
        if (res.ok) {
          const data = await res.json();
          const backendProfile = data.profile || {};
          
          console.log("🔥 CHECK BACKEND DATA:", backendProfile); 

          // 1. 당선횟수 포맷팅 (숫자 -> "N선")
          let finalElectionCount = "초선";
          const rawCount = backendProfile.elected_count;
          if (rawCount) {
             finalElectionCount = (typeof rawCount === 'number') ? `${rawCount}선` : rawCount;
          }

          // 2. 위원회 이력 포맷팅
          const formattedCommittees = data.history?.committees?.map(c => ({
             name: c.committee,       
             startDate: c.start_date, 
             endDate: c.end_date      
          })) || [];

          // 3. State 업데이트
          setProfileData({
              ...backendProfile, 
              
              // === [핵심] LegislatorProfile이 원하는 변수명으로 데이터 저장 ===
              
              // (0) member_id 추가 (필수!)
              member_id: memberId,
              
              // (1) 지역구 -> region
              region: backendProfile.district || "지역구 없음",

              // (2) 당선횟수 -> count
              count: finalElectionCount, 
              // (혹시 몰라 백업용으로 다른 이름들도 저장)
              election_count: finalElectionCount,
              elected_count: finalElectionCount,

              // (3) 유형 -> method
              method: backendProfile.elected_type || "국회의원",
              // (백업용)
              type_display: backendProfile.elected_type || "국회의원",
              
              // (4) 기타
              image: backendProfile.image_url || backendProfile.img || null,
              gender: backendProfile.gender,
              party: backendProfile.party,
              
              type: 'person', 
              committees: formattedCommittees,
              total_bills_count: data.representative_bills_count || 0 
          });
        }
      } catch (err) {
        console.error("Failed to load details:", err);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchBills();
    fetchDetail();

  }, [memberProfile]); 
  
  // ------------- 2. HANDLERS -------------
  const handleSearch = () => {
    const filtersToPass = {
       name: filterName, party: selectedParty, city: selectedCity, district: selectedDistrict,
       committee: selectedCommittee, gender: selectedGender, age: selectedAge,
       count: selectedCount, method: selectedMethod
    };
    navigate('/sentiment/member', { state: { incomingFilters: filtersToPass } });
  };
 
  const handleReset = () => {
    setFilterName(""); setFilterBill(""); setSelectedParty("all"); setSelectedCity("all");
    setSelectedDistrict("all"); setSelectedCommittee("all"); setSelectedGender("all");
    setSelectedAge("all"); setSelectedCount("all"); setSelectedMethod("all");
    setBills(originalBills);
  };

  if (!memberProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <p className="text-slate-500 mb-4">의원 정보를 찾을 수 없습니다.</p>
        <Button onClick={() => navigate('/legislators')}>목록으로 돌아가기</Button>
      </div>
    );
  }

  const goToDetail = (bill) => {
    navigate('/analysis/detail', { 
      state: { 
        legislatorName: profileData?.name || memberProfile.name,
        legislatorProfile: profileData, 
        billInfo: bill,
        aiSummary,   
        billsentiment: bill.sentiment || bill.score || "",        
      } 
    });
  };

  // ------------- 3. RENDER -------------
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-slate-200">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
            <h1 className="text-2xl font-bold text-slate-900">의원 상세 정보</h1>
          </div>
        </div>

        {/* Filter */}
        <LegislatorFilter 
          legislatorName={filterName} billName={filterBill} selectedParty={selectedParty}
          selectedCity={selectedCity} selectedDistrict={selectedDistrict} selectedCommittee={selectedCommittee}
          selectedGender={selectedGender} selectedAge={selectedAge} selectedCount={selectedCount} selectedMethod={selectedMethod}
          currentDistricts={currentDistricts}
          setLegislatorName={setFilterName} setBillName={setFilterBill} setSelectedParty={setSelectedParty}
          setSelectedCity={(val) => { setSelectedCity(val); setSelectedDistrict("all"); }}
          setSelectedDistrict={setSelectedDistrict} setSelectedCommittee={setSelectedCommittee}
          setSelectedGender={setSelectedGender} setSelectedAge={setSelectedAge} setSelectedCount={setSelectedCount}
          setSelectedMethod={setSelectedMethod}
          onSearch={handleSearch} onReset={handleReset}
        />

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
              {aiSummary || "AI 요약 정보가 없습니다."}
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {isLoadingProfile ? (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1 h-fit shadow-sm border border-slate-200 rounded-lg p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-12 bg-slate-200 rounded"></div>
                  <div className="h-8 bg-slate-200 rounded"></div>
                  <div className="h-8 bg-slate-200 rounded"></div>
                  <div className="h-8 bg-slate-200 rounded"></div>
                </div>
              </div>
              <div className="lg:col-span-3 h-[700px] shadow-sm border border-slate-200 rounded-lg p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-8 bg-slate-200 rounded"></div>
                  <div className="h-20 bg-slate-200 rounded"></div>
                  <div className="h-20 bg-slate-200 rounded"></div>
                </div>
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
           
           {/* === 여기가 수정된 부분입니다 === */}
           {/* LegislatorProfile이 원하는 props 이름(count, method)으로 데이터를 넘겨줍니다 */}
           <LegislatorProfile
             profile={{ 
               ...profileData, 
               
               // 1. LegislatorProfile.jsx는 'count'를 당선횟수로 사용합니다.
               count: profileData?.count || profileData?.election_count || profileData?.elected_count || "초선",
               
               // 2. LegislatorProfile.jsx는 'method'를 유형으로 사용합니다.
               method: profileData?.method || profileData?.type_display || profileData?.elected_type || "국회의원",

               // 3. 지역구
               region: profileData?.region || profileData?.district || "지역구 없음",

               // 4. 통계 및 기타
               total_bills: profileData?.total_bills_count ?? bills.length,
               count_coop: stats.coop,
               count_non_coop: stats.nonCoop,
               count_neutral: stats.neutral,
               image: profileData?.image || null
             }}
            />
            
            <LegislatorBillTable 
              bills={bills}
              onBillClick={goToDetail}
              showProposer={false}
            />
          </div>
          )}

        </div>
      </div>
    </div>
  );
}