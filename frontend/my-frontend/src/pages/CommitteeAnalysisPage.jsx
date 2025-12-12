import React, { useState } from 'react';
import { 
  Search, Filter, Users, TrendingUp, AlertTriangle, 
  MessageSquare, Gavel, Calendar, BarChart2 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';

// --- DANH SÁCH ỦY BAN (MOCK) ---
const COMMITTEES = [
  { id: "c1", name: "법제사법위원회" }, // Ủy ban Pháp chế Tư pháp
  { id: "c2", name: "정무위원회" },     // Ủy ban Chính trị
  { id: "c3", name: "기획재정위원회" }, // Ủy ban Tài chính & Chiến lược
  { id: "c4", name: "교육위원회" },     // Ủy ban Giáo dục
  { id: "c5", name: "과학기술정보방송통신위원회" }, // Ủy ban KHCN & TT
];

// --- MOCK DATA (Dữ liệu giả lập) ---
const MOCK_DATA = {
  totalCoopScore: 65.4, // Điểm hợp tác trung bình của ủy ban
  activeMembers: [
    { name: "정청래", party: "더불어민주당", color: "blue", speechCount: 142 },
    { name: "유상범", party: "국민의힘", color: "red", speechCount: 128 },
    { name: "전현희", party: "더불어민주당", color: "blue", speechCount: 98 },
    { name: "조정훈", party: "시대전환", color: "slate", speechCount: 85 },
    { name: "박주민", party: "더불어민주당", color: "blue", speechCount: 76 },
  ],
  controversialBills: [
    { id: 1, title: "채상병 특검법 (순직 해병 수사 방해 의혹)", disagreementRate: 98, date: "2024.05.02" },
    { id: 2, title: "전세사기 피해자 지원 특별법 개정안", disagreementRate: 85, date: "2024.04.28" },
    { id: 3, title: "양곡관리법 개정안 (쌀값 안정화)", disagreementRate: 82, date: "2024.04.15" },
    { id: 4, title: "민주유공자 예우법", disagreementRate: 79, date: "2024.04.10" },
    { id: 5, title: "가맹사업거래공정화법 (가맹점주 권익)", disagreementRate: 75, date: "2024.03.22" },
  ]
};

// Helper màu sắc đảng
const getPartyColor = (color) => {
  const map = {
    red: "text-red-600 bg-red-100 border-red-200",
    blue: "text-blue-600 bg-blue-100 border-blue-200",
    slate: "text-slate-600 bg-slate-100 border-slate-200",
  };
  return map[color] || map.slate;
};

export default function CommitteeAnalysisPage() {
const navigate = useNavigate();

  // State cho bộ lọc
  const [selectedCommittee, setSelectedCommittee] = useState("c1");
  const [session, setSession] = useState("22");
  const [date, setDate] = useState(""); // YYYY-MM-DD

  // Giả lập loading khi đổi filter
  const currentCommitteeName = COMMITTEES.find(c => c.id === selectedCommittee)?.name;

  const handleMemberClick = (member) => {
    // Chuyển hướng và gửi kèm dữ liệu member sang trang mới (để bên đó biết hiển thị ai)
    navigate('/analysis/person-view', { state: { memberData: member } });
  };

  const handleBillClick = (billTitle) => {
    // Chuyển sang trang sentiment/bill và gửi kèm bill_name
    navigate('/sentiment/bill', { state: { bill_name: billTitle } });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* --- 1. HEADER & FILTERS --- */}
        <div className="space-y-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                    <Gavel className="w-8 h-8 text-slate-700"/> 위원회 활동 분석
                </h1>
                <p className="text-slate-500">
                    특정 위원회의 협력도, 주요 발언자, 그리고 논쟁 법안을 분석합니다.
                </p>
            </div>

            {/* Filter Bar */}
            <Card className="p-4 shadow-sm border border-slate-200 bg-white">
                <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
                    
                    {/* Filter 1: Chọn Ủy Ban */}
                    <div className="flex-1 w-full md:w-auto space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase">위원회</label>
                        <Select value={selectedCommittee} onValueChange={setSelectedCommittee}>
                            <SelectTrigger>
                                <SelectValue placeholder="위원회 선택" />
                            </SelectTrigger>
                            <SelectContent>
                                {COMMITTEES.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Filter 2: Chọn Kỳ họp (Session) */}
                    <div className="w-full md:w-[150px] space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase">회기</label>
                        <Select value={session} onValueChange={setSession}>
                            <SelectTrigger>
                                <SelectValue placeholder="회기" />
                            </SelectTrigger>
                            <SelectContent>           
                                <SelectItem value="21">제21대</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Filter 3: Chọn Ngày (Date) */}
                    <div className="w-full md:w-[200px] space-y-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase">회의일자 (Date)</label>
                        <div className="relative">
                            <Input 
                                type="date" 
                                className="pl-10" 
                                value={date} 
                                onChange={(e) => setDate(e.target.value)}
                            />
                            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none"/>
                        </div>
                    </div>

                    {/* Search Button */}
                    <Button className="w-full md:w-auto bg-slate-900 hover:bg-slate-800">
                        <Search className="w-4 h-4 mr-2"/> 조회
                    </Button>
                </div>
            </Card>
        </div>

        {/* --- 2. MAIN CONTENT --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LEFT COLUMN (2/3 width): Stats & Rankings */}
            <div className="lg:col-span-2 space-y-6">
                
                {/* 2.1 Total Cooperation Score */}
                <Card className="bg-white shadow-sm border-l-4 border-l-indigo-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-slate-500 flex items-center gap-2">
                            <Users className="w-4 h-4"/> {currentCommitteeName} 총 협력도
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-end gap-3">
                            <span className="text-5xl font-bold text-slate-800">{MOCK_DATA.totalCoopScore}</span>
                            <span className="text-sm font-medium text-slate-500 mb-2">/ 100점</span>
                        </div>
                        <Progress value={MOCK_DATA.totalCoopScore} className="h-3 mt-4 bg-slate-100" indicatorClassName="bg-indigo-500"/>
                        <p className="text-xs text-slate-400 mt-2">
                            * 점수가 높을수록 위원회 내 여야 합의 처리가 원활함을 의미합니다.
                        </p>
                    </CardContent>
                </Card>

                {/* 2.2 Active Speakers Ranking */}
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5 text-indigo-600"/> 
                            발언 활발 의원 순위 (Top 5)
                        </CardTitle>
                        <CardDescription>
                            회의 중 질의 및 토론 참여도가 가장 높은 의원입니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-5">
                            {MOCK_DATA.activeMembers.map((member, idx) => (
                                <div key={idx} 
                                onClick={() => handleMemberClick(member)}
                                className="space-y-1">
                                    <div className="flex justify-between items-center text-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="font-bold text-slate-400 w-4">{idx + 1}</div>
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback className="bg-slate-100 text-xs">
                                                    {member.name[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <span className="font-semibold text-slate-800">{member.name}</span>
                                                <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded border ${getPartyColor(member.color)}`}>
                                                    {member.party}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="font-bold text-slate-700">{member.speechCount}회</div>
                                    </div>
                                    {/* Thanh bar thể hiện tỷ lệ so với người nói nhiều nhất */}
                                    <div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden ml-7 max-w-[90%]">
                                        <div 
                                            className="h-full bg-indigo-500 opacity-80" 
                                            style={{ width: `${(member.speechCount / MOCK_DATA.activeMembers[0].speechCount) * 100}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* RIGHT COLUMN (1/3 width): Controversial Bills */}
            <div className="lg:col-span-1">
                <Card className="h-full shadow-sm border border-red-100 bg-red-50/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-red-700">
                            <AlertTriangle className="w-5 h-5"/> 
                            논쟁 법안 Top 5
                        </CardTitle>
                        <CardDescription>
                            이견율이 높은 법안입니다.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {MOCK_DATA.controversialBills.map((bill, idx) => (
                            <div key={bill.id} 
                            onClick={()=> handleBillClick(bill.title)}
                            className="bg-white p-3 rounded-lg border border-red-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                                <div className="flex justify-between items-start mb-2">
                                    <Badge variant="secondary" className="bg-red-100 text-red-600 hover:bg-red-200">
                                        No. {idx + 1}
                                    </Badge>
                                    <span className="text-xs text-slate-400">{bill.date}</span>
                                </div>
                                <h4 className="text-sm font-bold text-slate-800 group-hover:text-red-600 transition-colors line-clamp-2 mb-2">
                                    {bill.title}
                                </h4>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500">논쟁 지수</span>
                                    <span className="font-bold text-red-600 flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3"/> {bill.disagreementRate}%
                                    </span>
                                </div>
                                <Progress value={bill.disagreementRate} className="h-1.5 mt-2 bg-red-100" indicatorClassName="bg-red-500"/>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

        </div>
      </div>
    </div>
  );
}