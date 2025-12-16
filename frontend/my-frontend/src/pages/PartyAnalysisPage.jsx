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
import { useNavigate } from 'react-router-dom';

const PARTIES = [
  { id: 106, name: "국민의힘", color: "red" },       
  { id: 101, name: "더불어민주당", color: "blue" },   
  { id: 107, name: "정의당", color: "yellow" },      
  { id: 100, name: "무소속", color: "slate" },
  { id: 109, name: "새로운미래", color: "blue" },    
  { id: 113, name: "기본소득당", color: "teal" },    
  { id: 104, name: "미래통합당", color: "red" }, 
  { id: 103, name: "열린민주당", color: "blue" },  
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
  const [selectedPartyId, setSelectedPartyId] = useState("106"); 
  
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
      const profileToPass = {

            member_id: member.member_id, 
            id: member.member_id,        
            name: member.member_name, 
            party: currentPartyInfo.name, // Lấy tên đảng hiện tại
            score: member.cooperation_score,
            total_speeches: member.total_speeches,
            type: 'person' 
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
            <h1 className="text-3xl font-bold text-slate-900">정당 분석 대시보드</h1>
            <p className="text-slate-500 mt-1">
              <span className={`font-bold ${theme.text}`}>{currentPartyInfo.name}</span>의 단합도와 주요 쟁점을 분석합니다.
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
        <Card className={`md:col-span-2 border-l-4 ${theme.border.replace('border-', 'border-l-')} shadow-sm overflow-hidden relative bg-white`}>
            <div className={`absolute top-0 right-0 w-40 h-40 ${theme.bg} rounded-full blur-3xl -mr-10 -mt-10 opacity-60 pointer-events-none`}></div>

            <CardHeader className="pb-2 relative z-10">
               <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
               <BarChart3 className={`w-4 h-4 ${theme.text}`} /> 정당 총 협력도 점수 
               </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
               {(() => {
                   const rawScore = partyData.total_cooperation ?? 0;
                   const clampedScore = Math.max(-1, Math.min(1, rawScore));
                   // Chuyển đổi -1~1 sang 0~100%
                   const percentage = ((clampedScore + 1) / 2) * 100;

                   return (
                    <>
                        {/* Hiển thị số liệu thực (Raw Data) */}
                        <div className="flex items-end gap-3">
                            <div className={`text-5xl font-bold tracking-tight ${
                                rawScore > 0 ? theme.text : (rawScore < 0 ? 'text-slate-600' : 'text-slate-400')
                            }`}>
                                {/* Giữ nguyên rawScore, chỉ thêm dấu + nếu dương */}
                                {rawScore > 0 ? `+${rawScore}` : rawScore}
                            </div>
                            <span className="text-lg text-slate-400 font-medium mb-1.5">/ 1.0</span>
                        </div>
                        
                        {/* Thanh Bar (Left-to-Right) */}
                        <div className="relative w-full h-6 mt-6">
                            <div className="absolute top-0 left-0 w-full h-full bg-slate-100 rounded-full overflow-hidden">
                                <div className="absolute top-0 left-1/2 w-0.5 h-full bg-white/50 z-10 border-l border-slate-300 border-dashed"></div>
                            </div>
                            
                            <div 
                                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-1 ${theme.bar}`}
                                style={{ width: `${percentage}%` }}
                            >
                                <div className="w-2 h-2 bg-white rounded-full shadow-sm opacity-80"></div>
                            </div>
                        </div>
                        
                        <div className="flex justify-between text-[10px] text-slate-400 mt-2 font-mono px-1">
                            <span>-1.0 (비협력)</span>
                            <span className="pl-2">0 (중립)</span>
                            <span>+1.0 (협력)</span>
                        </div>
                        
                        <p className="text-xs text-slate-400 mt-2">
                        소속 의원들의 발언을 종합적으로 분석한 평균 지표입니다.
                        </p>
                    </>
                   );
               })()}
            </CardContent>
         </Card>

         {/* Card 2: Analyzed Count */}
         <Card className="md:col-span-1 shadow-sm bg-slate-900 text-white border-none relative overflow-hidden">
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <CardHeader className="pb-2 relative z-10">
               <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
               <Users className="w-4 h-4 text-slate-400"/> 분석 대상 의원수
               </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
               <div className="text-4xl font-bold flex items-end gap-2 mt-2">
               {partyData.analyzed_members} <span className="text-lg text-slate-400 font-normal mb-1">명</span>
               </div>
               <p className="text-xs text-slate-500 mt-4">
               현재 국회 등록된 해당 정당 의원 수
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
                       <CardDescription>법안에 가장 긍정적인 발언을 한 의원</CardDescription>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="pt-6">
                 <div className="space-y-4">
                    {partyData.member_top5 && partyData.member_top5.map((member, idx) => (
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
                          {member.cooperation_score}
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
                       <CardDescription>당론과 다르거나 비판적인 의견을 제시한 의원</CardDescription>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="pt-6">
                 <div className="space-y-4">
                    {partyData.member_bottom5 && partyData.member_bottom5.map((member, idx) => (
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
                          {member.cooperation_score}
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
                    <ThumbsUp className="w-5 h-5"/> 적극 추진 (찬성 우세)
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
                             <span className={`block font-bold text-lg ${theme.text}`}>{bill.cooperation_score}</span>
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
                    <ThumbsDown className="w-5 h-5"/> 주요 반대 (비협력 우세)
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
                             <span className="block font-bold text-lg text-slate-600">{bill.cooperation_score}</span>
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