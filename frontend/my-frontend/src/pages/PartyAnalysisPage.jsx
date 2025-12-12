import React, { useState } from 'react';
import { 
  Users, TrendingUp, AlertCircle, 
  ThumbsUp, ThumbsDown, BarChart3 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from 'react-router-dom';

const PARTIES = [
  { id: 106, name: "국민의힘", color: "red" },       // Bảo thủ (Red)
  { id: 101, name: "더불어민주당", color: "blue" },   // Dân chủ (Blue)
  { id: 111, name: "조국혁신당", color: "blue" },     // Dân chủ (Blue - Trong hình thuộc nhóm Minju)
  { id: 110, name: "개혁신당", color: "orange" },     // Cải cách (Orange - Có ô cam riêng trong hình)
  { id: 107, name: "정의당", color: "yellow" },      // Tiến bộ (Yellow)
  { id: 100, name: "무소속", color: "slate" },
  { id: 109, name: "새로운미래", color: "blue" },     // Dân chủ (Blue - Trong hình là 새미래민주당 thuộc nhóm Minju)
  { id: 113, name: "기본소득당", color: "teal" },     // Tiến bộ (Teal - Trong hình có ô màu Cyan/Mint)
  { id: 114, name: "진보당", color: "red" },         // Tiến bộ (Red - Trong hình có ô màu Đỏ)
  { id: 104, name: "미래통합당", color: "red" }, 
  { id: 102, name: "더불어시민당", color: "blue" },
  { id: 103, name: "열린민주당", color: "blue" },
  { id: 112, name: "자유통일당", color: "indigo" },   // Cực hữu (Indigo - Trong hình có ô màu Xanh đậm/Navy)
  { id: 115, name: "시대전환", color: "slate" },
  { id: 108, name: "국민의당", color: "orange" },
  { id: 105, name: "미래한국당", color: "red" },
  { id: 116, name: "새진보연합", color: "teal" },
];

// Helper lấy màu theme (Tailwind classes) - Giữ nguyên không đổi
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

// --- MOCK DATA ---
const MOCK_PARTY_DETAIL = {
  totalScore: 78.5,
  memberCount: 108,
  unityRate: 82,
  topMembers: {
    coop: [
      { name: "김철수", score: 95 }, { name: "이민수", score: 92 }, { name: "박영희", score: 88 }
    ],
    nonCoop: [
      { name: "홍길동", score: 30 }, { name: "강감찬", score: 35 }
    ]
  },
  topBills: {
    agree: [
      { id: 1, title: "AI 산업 육성 및 신뢰 기반 조성에 관한 법률안", score: 98, date: "2024.02.15" },
      { id: 2, title: "반도체 메가 클러스터 지원 특별법", score: 95, date: "2024.01.20" }
    ],
    disagree: [
      { id: 10, title: "노란봉투법 (노동조합법 개정안)", score: 12, date: "2024.02.20" },
      { id: 11, title: "방송 3법 개정안", score: 15, date: "2024.01.30" }
    ]
  }
};

export default function PartyAnalysisPage() {
  // Default: 국민의힘 (106)
  const [selectedPartyId, setSelectedPartyId] = useState("106"); 
  const [term, setTerm] = useState("22");
  
  // Tìm thông tin đảng hiện tại từ list config
  const currentPartyInfo = PARTIES.find(p => p.id.toString() === selectedPartyId) || PARTIES[0];
  const theme = getTheme(currentPartyInfo.color);
  
  // FIX BUG: Gán dữ liệu trực tiếp từ Mock Data (vì code cũ gọi MOCK_DATA không tồn tại)
  // Trong thực tế, bạn sẽ fetch API dựa trên selectedPartyId ở đây
  const data = MOCK_PARTY_DETAIL;

  const navigate = useNavigate();

   const handleMemberClick = (member) => {
      navigate('/analysis/person-view', { state: { memberProfile: member } });
   };

   const handleBillClick = (billTitle) => {
    navigate('/sentiment/bill', { state: { bill_name: billTitle } });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* --- 1. HEADER & FILTER --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
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
      
         {/* Card 1: Total Score - Chiếm 2 cột (md:col-span-2) cho cân đối */}
         <Card className={`md:col-span-2 border-l-4 ${theme.border.replace('border-', 'border-l-')} shadow-sm overflow-hidden relative bg-white`}>
            {/* Decoration background mờ mờ */}
            <div className={`absolute top-0 right-0 w-40 h-40 ${theme.bg} rounded-full blur-3xl -mr-10 -mt-10 opacity-60 pointer-events-none`}></div>

            <CardHeader className="pb-2 relative z-10">
               <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
               <BarChart3 className={`w-4 h-4 ${theme.text}`} /> 정당 총 협력도 점수
               </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
               <div className="flex items-end gap-3">
               <div className={`text-5xl font-bold ${theme.text} tracking-tight`}>
                  {data.totalScore}
               </div>
               <span className="text-lg text-slate-400 font-medium mb-1.5"></span>
               </div>
               
               {/* Thanh Progress Bar */}
               <div className="w-full bg-slate-100 h-2.5 mt-4 rounded-full overflow-hidden">
               <div 
                  className={`h-full ${theme.bar} rounded-full transition-all duration-1000 ease-out`} 
                  style={{ width: `${data.totalScore}%` }}
               ></div>
               </div>
               
               <p className="text-xs text-slate-400 mt-2">
               발언을 종합적으로 분석한 평균 지표입니다.
               </p>
            </CardContent>
         </Card>

         {/* Card 2: Info Card - Giữ nguyên 1 cột (md:col-span-1) */}
         <Card className="md:col-span-1 shadow-sm bg-slate-900 text-white border-none relative overflow-hidden">
            {/* Decoration */}
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <CardHeader className="pb-2 relative z-10">
               <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
               <Users className="w-4 h-4 text-slate-400"/> 분석 대상 의원수
               </CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
               <div className="text-4xl font-bold flex items-end gap-2 mt-2">
               {data.memberCount} <span className="text-lg text-slate-400 font-normal mb-1">명</span>
               </div>
               <p className="text-xs text-slate-500 mt-4">
               현재 국회 등록된 해당 정당 의원 수
               </p>
            </CardContent>
         </Card>

         </div>

        {/* --- 3. MEMBER RANKINGS (Split View) --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           
           {/* Left: Top Cooperative (High Score) */}
           <Card className="h-full shadow-sm border border-slate-200">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                 <div className="flex justify-between items-center">
                    <div>
                       <CardTitle className="flex items-center gap-2 text-lg">
                          <ThumbsUp className={`w-5 h-5 ${theme.text}`} />
                          협력파 의원 
                       </CardTitle>
                       <CardDescription>법안에 가장 긍정적인 발언을 한 의원</CardDescription>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="pt-6">
                 <div className="space-y-4">
                    {data.topMembers.coop.map((member, idx) => (
                       <div key={idx} 
                        className="flex items-center justify-between group p-2 rounded-lg hover:bg-slate-100 cursor-pointer transition-all duration-200"
                        onClick={() => handleMemberClick(member)}
                        >  
                          <div className="flex items-center gap-3">
                             <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>
                                {idx + 1}
                             </div>
                             <Avatar className="h-10 w-10 border border-slate-200">
                                <AvatarFallback>{member.name[0]}</AvatarFallback>
                             </Avatar>
                             <span className="font-semibold text-slate-800">{member.name}</span>
                          </div>
                          <Badge variant="outline" className={`${theme.bg} ${theme.text} ${theme.border} font-bold px-3 py-1`}>
                             {member.score}
                          </Badge>
                       </div>
                    ))}
                 </div>
              </CardContent>
           </Card>

           {/* Right: Top Non-Cooperative (Low Score) */}
           <Card className="h-full shadow-sm border border-slate-200">
              <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                 <div className="flex justify-between items-center">
                    <div>
                       <CardTitle className="flex items-center gap-2 text-lg">
                          <AlertCircle className="w-5 h-5 text-slate-500" />
                          비협력/소신파 의원 
                       </CardTitle>
                       <CardDescription>당론과 다르거나 비판적인 의견을 제시한 의원</CardDescription>
                    </div>
                 </div>
              </CardHeader>
              <CardContent className="pt-6">
                 <div className="space-y-4">
                    {data.topMembers.nonCoop.map((member, idx) => (
                       <div key={idx}
                        className="flex items-center justify-between group p-2 rounded-lg hover:bg-slate-100 cursor-pointer transition-all duration-200"
                        onClick={() => handleMemberClick(member)}
                        >
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-sm">
                                {idx + 1}
                             </div>
                             <Avatar className="h-10 w-10 border border-slate-200">
                                <AvatarFallback>{member.name[0]}</AvatarFallback>
                             </Avatar>
                             <span className="font-semibold text-slate-800">{member.name}</span>
                          </div>
                          <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold px-3 py-1">
                             {member.score}
                          </Badge>
                       </div>
                    ))}
                    {data.topMembers.nonCoop.length === 0 && (
                       <div className="text-center py-10 text-slate-400">
                          비협력 의원 데이터가 없습니다.
                       </div>
                    )}
                 </div>
              </CardContent>
           </Card>

        </div>

        {/* --- 4. TOP BILLS SECTION --- */}
        <div className="space-y-6">
           <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-slate-700"/>
              <h2 className="text-2xl font-bold text-slate-900">정당별 주요 쟁점 법안 Top 10</h2>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* 찬성/추진 법안 */}
              <div className="space-y-4">
                 <h3 className={`font-bold text-lg flex items-center gap-2 ${theme.text}`}>
                    <ThumbsUp className="w-5 h-5"/> 적극 추진 (찬성 우세)
                 </h3>
                 {data.topBills.agree.map((bill) => (
                    <Card key={bill.id} 
                    onClick={()=>handleBillClick(bill.title)}
                    className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-transparent hover:border-l-blue-500">
                       <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex-1 pr-4">
                             <h4 className="font-semibold text-slate-800 line-clamp-1 mb-1">{bill.title}</h4>
                             <p className="text-xs text-slate-400">{bill.date}</p>
                          </div>
                          <div className="text-right">
                             <span className={`block font-bold text-lg ${theme.text}`}>{bill.score}점</span>
                             <span className="text-[10px] text-slate-400">협력도</span>
                          </div>
                       </CardContent>
                    </Card>
                 ))}
              </div>

              {/* 반대/비판 법안 */}
              <div className="space-y-4">
                 <h3 className="font-bold text-lg flex items-center gap-2 text-slate-600">
                    <ThumbsDown className="w-5 h-5"/> 주요 반대 (비협력 우세)
                 </h3>
                 {data.topBills.disagree.map((bill) => (
                    <Card key={bill.id} 
                   onClick={()=>handleBillClick(bill.title)}
                    className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-transparent hover:border-l-slate-500">
                       <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex-1 pr-4">
                             <h4 className="font-semibold text-slate-800 line-clamp-1 mb-1">{bill.title}</h4>
                             <p className="text-xs text-slate-400">{bill.date}</p>
                          </div>
                          <div className="text-right">
                             <span className="block font-bold text-lg text-slate-600">{bill.score}점</span>
                             <span className="text-[10px] text-slate-400">협력도</span>
                          </div>
                       </CardContent>
                    </Card>
                 ))}
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}