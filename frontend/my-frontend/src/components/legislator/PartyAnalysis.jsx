// src/components/legislator/PartyAnalysisResult.jsx
import React from 'react';
import { Bot, Sparkles, Users, Vote, Target, FileText, TrendingUp } from "lucide-react";
import { LegislatorBillTable } from './LegislatorBillTable';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function PartyAnalysis({ profile, bills, aiSummary, onBillClick }) {
  if (!profile || profile.type !== 'party') return null;

  // Xác định màu chủ đạo dựa trên tên đảng
  const isBlue = profile.name.includes("민주"); // Đảng Dân chủ (Xanh)
  const themeColor = isBlue ? "blue" : "red";
  
  // Style động
  const bgSoft = isBlue ? "bg-blue-50" : "bg-red-50";
  const textDark = isBlue ? "text-blue-900" : "text-red-900";
  const textPrimary = isBlue ? "text-blue-600" : "text-red-600";
  const borderTheme = isBlue ? "border-blue-200" : "border-red-200";

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* --- 1. PARTY DASHBOARD HEADER (GIAO DIỆN MỚI CHO ĐẢNG) --- */}
      <div className={`rounded-xl border ${borderTheme} ${bgSoft} overflow-hidden shadow-sm`}>
        <div className="p-8 flex flex-col md:flex-row justify-between items-center gap-6">
           
           {/* Bên trái: Định danh Đảng */}
           <div className="flex items-center gap-6 w-full md:w-auto">
              <div className={`w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-md border-4 ${isBlue ? 'border-blue-100' : 'border-red-100'}`}>
                 {/* Logo giả lập bằng chữ cái đầu */}
                 <span className={`text-4xl font-black ${textPrimary}`}>
                    {profile.name.charAt(0)}
                 </span>
              </div>
              <div>
                 <div className="flex items-center gap-3 mb-1">
                    <h2 className={`text-3xl font-black ${textDark}`}>{profile.name}</h2>
                    <Badge className={`${isBlue ? 'bg-blue-600' : 'bg-red-600'} hover:none border-0 text-white px-3 py-1 text-sm`}>
                      {profile.party} {/* 원내교섭단체 */}
                    </Badge>
                 </div>
                 <p className="text-slate-600 font-medium text-lg">대한민국 제{isBlue ? '1' : '2'}당</p>
              </div>
           </div>

           {/* Bên phải: Các chỉ số vĩ mô (Big Stats) */}
           <div className="grid grid-cols-3 gap-8 md:gap-12 border-t md:border-t-0 md:border-l border-slate-200/60 pt-6 md:pt-0 md:pl-12 w-full md:w-auto">
              <div className="text-center">
                 <div className="flex items-center justify-center gap-2 text-slate-500 text-sm font-bold uppercase mb-1">
                    <Users className="w-4 h-4" /> 의석수 
                 </div>
                 <div className={`text-4xl font-black ${textPrimary}`}>{profile.count}</div>
              </div>
              <div className="text-center">
                 <div className="flex items-center justify-center gap-2 text-slate-500 text-sm font-bold uppercase mb-1">
                    <FileText className="w-4 h-4" /> 발의 법안
                 </div>
                 <div className={`text-4xl font-black ${textPrimary}`}>{profile.total_bills}</div>
              </div>
              <div className="text-center">
                 <div className="flex items-center justify-center gap-2 text-slate-500 text-sm font-bold uppercase mb-1">
                    <Target className="w-4 h-4" /> 당론 일치도
                 </div>
                 <div className={`text-4xl font-black ${textPrimary}`}>98%</div>
              </div>
           </div>
        </div>

        {/* Thanh trạng thái bổ sung */}
        <div className="bg-white/60 px-8 py-3 flex justify-between items-center text-sm border-t border-slate-200/50">
           <div className="flex gap-6 text-slate-600">
              <span className="flex items-center gap-2">
                 <TrendingUp className="w-4 h-4 text-slate-400" /> 
                 주요 관심 분야: <span className="font-bold text-slate-800">경제, 민생, IT</span>
              </span>
           </div>
           <div className="text-slate-400 text-xs font-mono">Last Updated: Today</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- 2. DANH SÁCH LUẬT (Chiếm 2/3) --- */}
        <div className="lg:col-span-2">
           <LegislatorBillTable bills={bills} onBillClick={onBillClick} />
        </div>

        {/* --- 3. AI STRATEGY REPORT (Cột phải - Phân tích chiến lược) --- */}
        <div className="lg:col-span-1 space-y-6">
            
            {/* AI Summary Card */}
            <Card className="bg-slate-900 text-white border-0 shadow-xl overflow-hidden relative">
                <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                <CardHeader className="pb-2 relative z-10">
                    <CardTitle className="flex items-center gap-2 text-purple-300 text-lg">
                        <Bot className="w-6 h-6" /> AI 정당 분석
                    </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                    <p className="text-slate-300 leading-relaxed text-sm">
                        {aiSummary}
                    </p>
                    <div className="mt-4 pt-4 border-t border-slate-800 flex gap-2">
                        <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">#당론강화</Badge>
                        <Badge variant="outline" className="text-xs border-slate-700 text-slate-400">#민생우선</Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Card phụ: Phân bố phiếu bầu (Giả lập) */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                        <Vote className="w-4 h-4" /> 최근 표결 성향 (Voting Trend)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium">찬성 (Agree)</span>
                                <span>85%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className={`h-full ${isBlue ? 'bg-blue-600' : 'bg-red-600'}`} style={{width: '85%'}}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium">반대 (Disagree)</span>
                                <span>10%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="h-full bg-slate-400" style={{width: '10%'}}></div>
                            </div>
                        </div>
                         <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium">기권 (Abstain)</span>
                                <span>5%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div className="h-full bg-slate-300" style={{width: '5%'}}></div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

        </div>
      </div>
    </div>
  );
}