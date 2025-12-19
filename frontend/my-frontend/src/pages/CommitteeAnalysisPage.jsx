import React, { useState, useEffect } from 'react';
import { 
  Search, Users, TrendingUp, AlertTriangle, 
  MessageSquare, Gavel, Calendar
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';

// 위원회 목록 (백엔드 ID와 일치시켜야 함)
const COMMITTEES = [
  { id: "1", name: "과학기술정보방송통신위원회-과학기술원자력법안심사소위원회" },
  { id: "2", name: "과학기술정보방송통신위원회-정보통신방송법안심사소위원회" },
  { id: "3", name: "교육위원회-법안심사소위원회" },
  { id: "4", name: "국방위원회-법률안심사소위원회" },
  { id: "5", name: "국토교통위원회-교통법안심사소위원회" },
  { id: "6", name: "국토교통위원회-국토법안심사소위원회" },
  { id: "7", name: "국토교통위원회-예산결산기금심사소위원회" },
  { id: "8", name: "국토교통위원회-청원심사소위원회" },
  { id: "9", name: "기획재정위원회-경제재정소위원회" },
  { id: "10", name: "기획재정위원회-조세소위원회" },
  { id: "11", name: "농림축산식품해양수산위원회-농림축산식품법안심사소위원회" },
  { id: "12", name: "농림축산식품해양수산위원회-해양수산법안심사소위원회" },
  { id: "13", name: "문화체육관광위원회-문화예술법안심사소위원회" },
  { id: "14", name: "문화체육관광위원회-청원심사소위원회" },
  { id: "15", name: "문화체육관광위원회-체육관광법안심사소위원회" },
  { id: "16", name: "법제사법위원회-법안심사제1소위원회" },
  { id: "17", name: "법제사법위원회-법안심사제2소위원회" },
  { id: "18", name: "보건복지위원회-제1법안심사소위원회" },
  { id: "19", name: "보건복지위원회-제2법안심사소위원회" },
  { id: "20", name: "보건복지위원회-청원심사소위원회" },
  { id: "21", name: "산업통상자원중소벤처기업위원회-산업통상자원특허소위원회" },
  { id: "22", name: "산업통상자원중소벤처기업위원회-중소벤처기업소위원회" },
  { id: "23", name: "산업통상자원중소벤처기업위원회-청원소위원회" },
  { id: "24", name: "여성가족위원회-법안심사소위원회" },
  { id: "25", name: "외교통일위원회-법안심사소위원회" },
  { id: "26", name: "외교통일위원회-청원심사소위원회" },
  { id: "27", name: "정무위원회-법안심사제1소위원회" },
  { id: "28", name: "정무위원회-법안심사제2소위원회" },
  { id: "29", name: "정보위원회-법안심사소위원회" },
  { id: "30", name: "행정안전위원회-법안심사제1소위원회" },
  { id: "31", name: "행정안전위원회-법안심사제2소위원회" },
  { id: "32", name: "환경노동위원회-고용노동법안심사소위원회" },
  { id: "33", name: "환경노동위원회-예산결산기금심사소위원회" },
  { id: "34", name: "환경노동위원회-청원심사소위원회" },
  { id: "35", name: "환경노동위원회-환경법안심사소위원회" }
];

// 정당 색상 매핑 헬퍼
const getPartyColor = (partyName) => {
  if (partyName?.includes("국민의힘")) return "text-red-600 bg-red-100 border-red-200";
  if (partyName?.includes("민주당")) return "text-blue-600 bg-blue-100 border-blue-200";
  return "text-slate-600 bg-slate-100 border-slate-200";
};

export default function CommitteeAnalysisPage() {
  const navigate = useNavigate();

  // --- State ---
  const [selectedCommittee, setSelectedCommittee] = useState("1"); // 기본값 ID 1
  const [session, setSession] = useState("21");
  
  // API 데이터 상태
  const [analysisData, setAnalysisData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // 현재 선택된 위원회 이름 표시용
  const currentCommitteeName = COMMITTEES.find(c => c.id === selectedCommittee)?.name || "위원회";

  // --- API 호출 (useEffect) ---
  useEffect(() => {
    if (!selectedCommittee) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:8000/api/committee-summary/${selectedCommittee}`);
        
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        setAnalysisData(data);
      } catch (err) {
        console.error("데이터 로딩 실패:", err);
        setError("데이터를 불러오는 중 오류가 발생했습니다.");
        setAnalysisData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedCommittee]);

  // --- [수정됨] 핸들러: LegislatorDashboard로 이동 ---
  const handleMemberClick = (member) => {
    console.log("Clicked member raw:", member);

    // LegislatorDashboard가 기대하는 데이터 형식으로 변환 (Mapping)
    const profileToPass = {
        member_id: member.member_id || member.id, // ID 필수
        name: member.member_name || member.name,  // 이름 필수
        party: member.party_name || member.party, // 정당 필수
        speech_count: member.speech_count,        // (옵션) 발언 수
        type: 'person'                            // 아이콘 표시용
    };

    // key를 'memberProfile'로 설정해야 LegislatorDashboard에서 받음
    navigate('/analysis/person-view', { state: { memberProfile: profileToPass } });
  };

  const handleBillClick = (billTitle) => {
    navigate('/sentiment/bill', { state: { bill_name: billTitle } });
  };

  // --- 렌더링 준비 ---
  if (loading && !analysisData) {
    return <div className="min-h-screen flex items-center justify-center">데이터 분석 중...</div>;
  }

  const safeData = analysisData || {
    bayesian_score: 0,
    members_top5: [],
    bills_top5: []
  };

  const rawScore = safeData.bayesian_score ?? 0; 
  
  // Progress Bar (Map -1~1 score to 0~100%)
  const progressPercent = Math.min(100, Math.max(0, (rawScore + 1) * 50));

  // 1. Label Logic: 백엔드에서 stance를 주면 그걸 쓰고, 아니면 점수 기반 계산
  let statusLabel = safeData.stance || safeData.adjusted_stance || "중립";

  let badgeStyle = "bg-slate-100 text-slate-700 border-slate-200";
  let StatusIcon = Users;

  if (statusLabel === "협력") {
    badgeStyle = "bg-blue-100 text-blue-700 border-blue-200";
    StatusIcon = TrendingUp;
  } else if (statusLabel === "비협력") {
    badgeStyle = "bg-red-100 text-red-700 border-red-200";
    StatusIcon = AlertTriangle;
  }
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
              해당 위원회의 평균협력도, 발언량, 그리고 논쟁 법안을 분석합니다.
            </p>
          </div>

          {/* Filter Bar */}
          <Card className="p-4 shadow-sm border border-slate-200 bg-white">
            <div className="flex flex-col md:flex-row gap-4 items-end md:items-center">
              
              {/* Filter 1: 위원회 선택 */}
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

              <div className="w-full md:w-[150px] space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">회기</label>
                <Select value={session} onValueChange={setSession}>
                  <SelectTrigger><SelectValue placeholder="회기" /></SelectTrigger>
                  <SelectContent>          
                    <SelectItem value="21">제21대</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full md:w-auto bg-slate-900 hover:bg-slate-800">
                <Search className="w-4 h-4 mr-2"/> 조회
              </Button>
            </div>
          </Card>
        </div>

        {/* --- 2. MAIN CONTENT --- */}
        {error ? (
            <div className="text-center text-red-500 py-10">{error}</div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* 2.1 Total Cooperation Score Card */}
            <Card className="bg-white shadow-sm border-l-4 border-l-indigo-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-500 flex items-center gap-2">
                  <Users className="w-4 h-4"/> {safeData.committee || currentCommitteeName} 총 협력도
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* 점수 텍스트 표시 */}
                <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                    <span className="text-5xl font-bold text-slate-900 tracking-tight">
                    {Number(rawScore).toFixed(8)}
                    </span>
                    <div className={`px-4 py-2 rounded-full border ${badgeStyle} flex items-center gap-2 shadow-sm`}>
                    {/* Icon */}
                    <StatusIcon className="w-4 h-4" />
                    {/* Status Text */}
                    <span className="text-sm font-bold">
                      {statusLabel}
                    </span>
                </div>
                </div>

                
                </div>

                {/* Progress Bar 영역 */}
                <div className="relative pt-2">
                  {/* 중앙(0점) 기준선 표시 */}
                  <div className="absolute top-0 left-1/2 w-px h-full bg-slate-300 -translate-x-1/2 z-10 border-l border-dashed border-slate-400"></div>
                  
                  {/* Progress Bar */}
                  <Progress 
                    value={progressPercent} 
                    className="h-4 bg-slate-100 border border-slate-200" 
                    indicatorClassName="bg-indigo-500 transition-all duration-500"
                  />

                  {/* 눈금 라벨 (-1, 0, 1) */}
                  <div className="flex justify-between text-xs text-slate-500 mt-2 font-medium">
                    <span>-1 (비협력)</span>
                    <span className="relative z-20 bg-white px-1">0 (중립)</span>
                    <span>1 (협력)</span>
                  </div>
                </div>

                <p className="text-xs text-slate-400 mt-4">
                   * -1에 가까울수록 비협력적, 1에 가까울수록 협력적입니다.
                </p>
              </CardContent>
            </Card>

            {/* 2.2 Active Speakers Ranking */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-indigo-600"/> 
                  발언량이 많은 의원 순위 (Top 5)
                </CardTitle>
                <CardDescription> 법안 심사 중 질의 및 토론 참여도가 높은 의원입니다.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-5">
                  {safeData.members_top5.map((member, idx) => {
                    // 1등 발언수 기준 비율 계산
                    const maxSpeech = safeData.members_top5[0]?.speech_count || 1;
                    const percentage = (member.speech_count / maxSpeech) * 100;
                    
                    return (
                      <div key={idx} onClick={() => handleMemberClick(member)} className="cursor-pointer hover:bg-slate-50 p-2 rounded transition-colors space-y-1">
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-3">
                            <div className="font-bold text-slate-400 w-4">{idx + 1}</div>
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="bg-slate-100 text-xs">{member.member_name ? member.member_name[0] : "?"}</AvatarFallback>
                            </Avatar>
                            <div>
                              <span className="font-semibold text-slate-800">{member.member_name}</span>
                              <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded border ${getPartyColor(member.party_name || "무소속")}`}>
                                {member.party_name || "정당정보없음"}
                              </span>
                            </div>
                          </div>
                          <div className="font-bold text-slate-700">{member.speech_count}회</div>
                        </div>
                        <div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden ml-7 max-w-[90%]">
                          <div className="h-full bg-indigo-500 opacity-80" style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                  {safeData.members_top5.length === 0 && <p className="text-slate-400 text-center py-4">데이터가 없습니다.</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Bills */}
          <div className="lg:col-span-1">
            <Card className="h-full shadow-sm border border-red-100 bg-red-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertTriangle className="w-5 h-5"/> 주요 논쟁 법안 Top 5
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {safeData.bills_top5.map((bill, idx) => (
                  <div key={idx} 
                       onClick={()=> handleBillClick(bill.bill_name)}
                       className="bg-white p-3 rounded-lg border border-red-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="secondary" className="bg-red-100 text-red-600">No. {idx + 1}</Badge>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 group-hover:text-red-600 transition-colors line-clamp-2 mb-2">
                      {bill.bill_name}
                    </h4>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">활동 지수</span>
                      <span className="font-bold text-red-600 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3"/> 
                        {(bill.bill_activity_score || 0) .toFixed(8)}
                      </span>
                    </div>
                    <Progress value={(bill.bill_activity_score || 0) * 100} className="h-1.5 mt-2 bg-red-100" indicatorClassName="bg-red-500"/>
                  </div>
                ))}
                {safeData.bills_top5.length === 0 && <p className="text-slate-400 text-center py-4">데이터가 없습니다.</p>}
              </CardContent>
            </Card>
          </div>

        </div>
        )}
      </div>
    </div>
  );
}