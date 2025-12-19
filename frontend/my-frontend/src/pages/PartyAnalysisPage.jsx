// src/pages/PartyAnalysisPage.jsx
import React, { useEffect, useState } from 'react';
import { 
  Users, TrendingUp, AlertCircle, 
  ThumbsUp, ThumbsDown, BarChart3, RefreshCw 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Landmark } from "lucide-react"
import { useLocation, useNavigate } from 'react-router-dom';

const PARTIES = [
  { id: 106, name: "국민의힘", color: "red" },       
  { id: 101, name: "더불어민주당", color: "blue" },   
  { id: 107, name: "정의당", color: "yellow" },      
  { id: 100, name: "무소속", color: "slate" },
  { id: 109, name: "새로운미래", color: "blue" },    
  { id: 113, name: "기본소득당", color: "teal" },    
  { id: 104, name: "미래통합당", color: "red" }, 
 // { id: 103, name: "열린민주당", color: "blue" },  
  { id: 115, name: "시대전환", color: "slate" },
  { id: 108, name: "국민의당", color: "orange" },
  { id: 105, name: "미래한국당", color: "red" },
];

// Helper lấy màu theme
const getTheme = (color) => {
  const themes = {
    red:    { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', bar: 'bg-red-600', badge: 'bg-red-100 text-red-700' },
    blue:   { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', bar: 'bg-blue-600', badge: 'bg-blue-100 text-blue-700' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-200', bar: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', bar: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700' },
    sky:    { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200', bar: 'bg-sky-600', badge: 'bg-sky-100 text-sky-700' },
    slate:  { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', bar: 'bg-slate-500', badge: 'bg-slate-200 text-slate-700' },
    teal:   { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', bar: 'bg-teal-600', badge: 'bg-teal-100 text-teal-700' },
    emerald:{ bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', bar: 'bg-emerald-600', badge: 'bg-emerald-100 text-emerald-700' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', bar: 'bg-indigo-600', badge: 'bg-indigo-100 text-indigo-700' },
  };
  return themes[color] || themes['slate']; 
};


export default function PartyAnalysisPage() {
  const location = useLocation(); 

  const [selectedPartyId, setSelectedPartyId] = useState(() => {
      if (location.state?.partyId) {
          return location.state.partyId.toString();
      }
      return "101";
  });

  
  // State quản lý dữ liệu API
  const [partyData, setPartyData] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentPartyInfo = PARTIES.find(p => p.id.toString() === selectedPartyId) || PARTIES[0];
  const theme = getTheme(currentPartyInfo.color);

  const navigate = useNavigate();

  // --- GỌI API BACKEND ---
  useEffect(() => {
      const fetchSummary = async () => {
         setLoading(true);
         try {
            const res = await fetch(`http://localhost:8000/api/parties/${selectedPartyId}/summary`);
            if (!res.ok) {
                  throw new Error("Failed to fetch party summary");
            }
            const data = await res.json();
            setPartyData(data);
         } catch (error) {
            console.error("Error fetching party data:", error);
            setPartyData(null);
         } finally {
            setLoading(false);
         }
      };

      fetchSummary();
   }, [selectedPartyId]);

   const handleMemberClick = (member) => {
      console.log("Member data clicked:", member); 

  
   const realId = member.member_id || member.id || member.legislator_id;

  if (!realId) {
    alert("Lỗi: Không tìm thấy ID nghị sĩ");
    return;
  }

  const profileToPass = {
    member_id: realId, 
    id: realId,         
    name: member.member_name || member.name, // Fallback tên
    party: currentPartyInfo.name, 
    score: member.bayesian_score ?? member.avg_score_prob ?? 0,
    total_speeches: member.n_speeches ?? member.total_speeches ?? 0,
    type: 'person',
    adjusted_stance: member.adjusted_stance
  };
      // Chuyển trang và gửi kèm object này
      navigate('/analysis/person-view', { state: { memberProfile: profileToPass } });
   };

   const handleBillClick = (billTitle) => {
      navigate('/sentiment/bill', { state: { bill_name: billTitle } });
   };

   // --- LOADING VIEW ---
   if (loading) {
      return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans space-y-4">
               <RefreshCw className="w-10 h-10 animate-spin text-blue-500" />
               <p className="text-slate-500">데이터를 분석 중입니다...</p>
            </div>
      );
   }

   // --- NẾU KHÔNG CÓ DỮ LIỆU ---
   if (!partyData) {
      return (
         <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <p className="text-slate-500">데이터를 불러올 수 없습니다.</p>
         </div>
      );
   }

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* --- 1. HEADER & FILTER --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 px-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
               <Landmark className="w-8 h-8 text-slate-700" />
               정당분석
            </h1>
            <p className="text-slate-500 mt-1">
              <span className={`font-bold ${theme.text}`}>{currentPartyInfo.name}</span>의 평균협력도와 주요 찬반 법안을 분석합니다.
            </p>
          </div>
          
          <div className="flex gap-3 bg-white p-2 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-center w-[120px] h-10 bg-slate-100 text-slate-900 rounded-lg text-sm font-medium cursor-default">
                제21대 국회
            </div>
             
             {/* 🌟 Chọn Đảng */}
             <Select value={selectedPartyId} onValueChange={setSelectedPartyId}>
               <SelectTrigger className={`w-[200px] font-bold ${theme.text} ${theme.bg} border-${theme.border}`}>
                 <SelectValue placeholder="정당 선택" />
               </SelectTrigger>
               <SelectContent className="max-h-[300px]">
                 {PARTIES.map((party) => (
                   <SelectItem key={party.id} value={party.id.toString()}>
                     {party.name}
                   </SelectItem>
                 ))}
               </SelectContent>
             </Select>        
          </div>
        </div>

         {/* --- 2. HERO CARDS (Overview) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
         {/* Card 1: Total Score (-1 ~ 1 Bar Chart) */}
         <Card className="md:col-span-2 shadow-sm border-slate-200 bg-white">
         <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
               <TrendingUp className="w-4 h-4"/> 정당 평균 협력도
            </CardTitle>
         </CardHeader>
         
         <CardContent className="relative z-10 pt-4">
            {(() => {
               // 1. Check for unavailable data
               const isUnavailable = partyData.total_cooperation?.status === '분석 불가';
               
               if (isUnavailable) {
               return (
                  <div className="flex flex-col items-center justify-center py-8 space-y-3 min-h-[140px]">
                     <AlertCircle className="w-10 h-10 text-slate-300" />
                     <div className="text-center">
                     <p className="text-base font-bold text-slate-600">분석 데이터 부족</p>
                     <p className="text-xs text-slate-400 mt-1">
                        {partyData.total_cooperation?.message || '협력도를 산출할 충분한 데이터가 없습니다.'}
                     </p>
                     </div>
                  </div>
               );
               }
               
               // 2. Data Processing (Raw Score)
               const rawScore = partyData.total_cooperation?.adjusted_score_prob ?? 
                              partyData.total_cooperation?.avg_score_prob ?? 0;
               
               // Progress Bar Calculation
               const percentage = Math.min(100, Math.max(0, (rawScore + 0.5) * 100));

               // 3. Status Label (Directly from Backend)
               const adjusted_stance = partyData.total_cooperation?.adjusted_stance || '중립';

               // 4. Color Mapping
               const COLOR_MAP = {
               '협력': {
                  badge: 'bg-blue-50 text-blue-700 border-blue-200',
                  text: 'text-blue-700',
                  bar: 'bg-blue-600'
               },
               '비협력': {
                  badge: 'bg-red-50 text-red-700 border-red-200',
                  text: 'text-red-700',
                  bar: 'bg-red-600'
               },
               '중립': {
                  badge: 'bg-slate-100 text-slate-600 border-slate-200',
                  text: 'text-slate-700',
                  bar: 'bg-slate-400'
               }
               };
               

               // FIX: Use 'adjusted_stance' here, not 'backendStance'
               const styles = COLOR_MAP[adjusted_stance] || COLOR_MAP['중립'];
               

               return (
               <div className="flex flex-col h-full justify-between">
                     
                     {/* Top: Score (Left) and Badge (Right) */}
                     <div className="flex items-start justify-between mb-6">
                     <div className="flex flex-col">
                        <div className={`text-5xl font-extrabold tracking-tight flex items-baseline ${styles.text}`}>
                           {rawScore > 0 ? `${rawScore.toFixed(8)}` : rawScore.toFixed(8)}
                           <span className="text-sm font-medium text-slate-400 ml-2 tracking-normal">/ 1.0</span>
                        </div>
                     </div>
                        
                     <div className={`px-3 py-1.5 rounded-full border text-xs font-bold shadow-sm ${styles.badge}`}>
                        {adjusted_stance}

                     </div>
                     
                     </div>
                     
                     {/* Bottom: Progress Bar */}
                     <div>
                     <div className="relative w-full h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                        {/* Center Line (0 point) */}
                        <div className="absolute top-0 left-1/2 w-px h-full bg-slate-400/50 z-10 border-l border-dashed"></div>
                        
                        {/* Data Bar */}
                        <div 
                           className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-0.5 ${styles.bar}`}
                           style={{ width: `${percentage}%` }}
                        >
                           <div className="w-1.5 h-1.5 bg-white rounded-full opacity-80 shadow-sm"></div>
                        </div>
                     </div>
                     
                     {/* Tick Labels */}
                     <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-mono px-0.5">
                        <span>-1 (비협력)</span>
                        <span className="text-slate-300">0</span>
                        <span>1 (협력)</span>
                     </div>
                     
                     <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                        * 소속 의원들의 법안에 대한 발언을 종합 분석한 평균협력도 지표입니다.
                     </p>
                     </div>
               </div>
               );
            })()}
         </CardContent>
         </Card>
  
         {/* Card 2: Analyzed Count */}
         <Card className="md:col-span-1 shadow-sm bg-slate-900 text-white border-none relative overflow-hidden flex flex-col justify-center">
            {/* 배경 장식 효과 */}
            <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
            
            <CardHeader className="pb-1 relative z-10">
               <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
               <Users className="w-4 h-4 text-slate-400"/> 조회된 의원 수
               </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10 pb-8">
               <div className="text-5xl font-bold flex items-baseline gap-2 mt-1">
               {partyData.analyzed_members} 
               <span className="text-lg text-slate-400 font-normal">명</span>
               </div>
               <div className="w-full h-1 bg-slate-800 rounded-full mt-4 mb-2 overflow-hidden">
                  <div className="h-full bg-slate-500 w-2/3 rounded-full"></div>
               </div>
               <p className="text-xs text-slate-500">
               발언 데이터 기반 의원 수
               </p>
            </CardContent>
         </Card>

         </div>

        {/* --- 3. MEMBER RANKINGS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           
           {/* Left: Top Cooperative */}
           <Card className="h-full shadow-sm border border-slate-200">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                 <div className="flex justify-between items-center">
                    <div>
                       <CardTitle className="flex items-center gap-2 text-lg">
                          <ThumbsUp className={`w-5 h-5 ${theme.text}`} />
                          협력파 의원 Top 5
                       </CardTitle>
                       <CardDescription>법안심사 중 가장 협력적인 발언을 한 의원</CardDescription>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="pt-6">
                 <div className="space-y-4">
                    {partyData.member_top5 && partyData.member_top5
                        
                        .filter(member => (member.bayesian_score ?? member.avg_score_prob ?? 0) > 0.01)
                        .map((member, idx) => (
                       <div key={idx} 
                        className="flex items-center justify-between group p-2 rounded-lg hover:bg-slate-100 cursor-pointer transition-all duration-200"
                        onClick={() => handleMemberClick(member)}
                        >  
                          <div className="flex items-center gap-3">
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
                                {idx + 1}
                             </div>
                          <span className="font-semibold text-slate-800">{member.member_name}</span>
                          </div>
                          {/* Điểm thô */}
                          <Badge variant="outline" className={`${theme.bg} ${theme.text} ${theme.border} font-bold px-3 py-1`}>
                          {(member.bayesian_score ?? member.avg_score_prob ?? 0).toFixed(3)}
                          </Badge>
                       </div>
                    ))}
                    {(!partyData.member_top5 || partyData.member_top5.length === 0) && <div className="text-center py-10 text-slate-400">데이터가 없습니다.</div>}
                 </div>
              </CardContent>
           </Card>

           {/* Right: Top Non-Cooperative */}
           <Card className="h-full shadow-sm border border-slate-200">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                 <div className="flex justify-between items-center">
                    <div>
                       <CardTitle className="flex items-center gap-2 text-lg">
                          <AlertCircle className="w-5 h-5 text-slate-500" />
                          비협력/소신파 의원 Top 5
                       </CardTitle>
                       <CardDescription>법안 심사 중 가장 비협력적인 발언을 한 의원</CardDescription>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="pt-6">
                 <div className="space-y-4">
                    {partyData.member_bottom5 && partyData.member_bottom5
                        
                        .filter(member => (member.bayesian_score ?? member.avg_score_prob ?? 0) < -0.02)
                        .map((member, idx) => (
                       <div key={idx}
                        className="flex items-center justify-between group p-2 rounded-lg hover:bg-slate-100 cursor-pointer transition-all duration-200"
                        onClick={() => handleMemberClick(member)}
                        >
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm">
                                {idx + 1}
                             </div>
                             <span className="font-semibold text-slate-800">{member.member_name}</span>
                          </div>
                          {/* Điểm thô */}
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold px-3 py-1">
                          {(member.bayesian_score ?? member.avg_score_prob ?? 0).toFixed(3)}
                          </Badge>
                       </div>
                    ))}
                    {(!partyData.member_bottom5 || partyData.member_bottom5.length === 0) && <div className="text-center py-10 text-slate-400">데이터가 없습니다.</div>}
                 </div>
              </CardContent>
           </Card>

        </div>

        {/* --- 4. TOP BILLS SECTION --- */}
        <div className="space-y-6">
           <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-slate-700"/>
              <h2 className="text-2xl font-bold text-slate-900">정당별 주요 쟁점 법안 Top 5</h2>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 찬성(협력) */}
              <div className="space-y-4">
                 <h3 className={`font-bold text-lg flex items-center gap-2 ${theme.text}`}>
                    <ThumbsUp className="w-5 h-5"/> 적극 찬성 (협력 우세)
                 </h3>

                 
                 {partyData.bill_top5 && partyData.bill_top5.map((bill) => (
                    <Card key={bill.bill_id} 
                   onClick={()=>handleBillClick(bill.bill_name)}
                   className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500">
                       <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex-1 pr-4">
                             <h4 className="font-semibold text-slate-800 line-clamp-1 mb-1">{bill.bill_name}</h4>
                          </div>
                          <div className="text-right">
                             {/* Điểm thô */}
                             <span className={`block font-bold text-lg ${theme.text}`}>
                                {(bill.bayesian_score ?? bill.avg_score_prob ?? 0).toFixed(3)}
                             </span>
                             <span className="text-[10px] text-slate-400">협력도</span>
                          </div>
                       </CardContent>
                    </Card>
                 ))}
                 {(!partyData.bill_top5 || partyData.bill_top5.length === 0) && <p className="text-slate-400 text-sm">데이터가 없습니다.</p>}
              </div>

              {/* 반대(비협력) */}
              <div className="space-y-4">
                 <h3 className="font-bold text-lg flex items-center gap-2 text-slate-600">
                    <ThumbsDown className="w-5 h-5"/> 적극 반대 (비협력 우세)
                 </h3>
                 {partyData.bill_bottom5 && partyData.bill_bottom5.map((bill) => (
                    <Card key={bill.bill_id} 
                   onClick={()=>handleBillClick(bill.bill_name)}
                   className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-transparent hover:border-l-slate-500">
                       <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex-1 pr-4">
                             <h4 className="font-semibold text-slate-800 line-clamp-1 mb-1">{bill.bill_name}</h4>
                     
                          </div>
                          <div className="text-right">
                             {/* Điểm thô */}
                             <span className="block font-bold text-lg text-slate-600">
                                {(bill.bayesian_score ?? bill.avg_score_prob ?? 0).toFixed(3)}
                             </span>
                             <span className="text-[10px] text-slate-400">협력도</span>
                          </div>
                       </CardContent>
                    </Card>
                 ))}
                 {(!partyData.bill_bottom5 || partyData.bill_bottom5.length === 0) && <p className="text-slate-400 text-sm">데이터가 없습니다.</p>}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}