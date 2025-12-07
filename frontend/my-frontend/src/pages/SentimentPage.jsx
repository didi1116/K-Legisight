import React, { useState } from 'react';
import { 
  Search, Filter, User, Users, Scale, FileText, 
  ChevronRight, BarChart3, TrendingUp, AlertCircle 
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// --- MOCK DATA (Dữ liệu giả để hiển thị UI) ---
const MOCK_MEMBERS = [
  { id: 1, name: "김철수", party: "국민의힘", region: "서울 종로구", score: 85, img: "https://github.com/shadcn.png" },
  { id: 2, name: "이영희", party: "더불어민주당", region: "부산 해운대구", score: 42, img: "" },
  { id: 3, name: "박민수", party: "조국혁신당", region: "비례대표", score: 60, img: "" },
  { id: 4, name: "최수진", party: "국민의힘", region: "경기 성남", score: 92, img: "" },
];

const MOCK_PARTY_STATS = {
  name: "국민의힘",
  totalScore: 78,
  memberCount: 108,
  topBill: "AI 산업 육성법",
  ranking: [
    { name: "최수진", score: 92, type: "coop" },
    { name: "김철수", score: 85, type: "coop" },
    { name: "홍길동", score: 30, type: "non-coop" },
  ]
};

export default function SentimentPage() {
  const [activeTab, setActiveTab] = useState("member");
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      
      {/* --- HEADER SECTION --- */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm backdrop-blur-md bg-white/80">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-blue-600" />
                감성 분석 인사이트
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                국회 회의록 데이터를 기반으로 의원과 정당의 성향을 분석합니다.
              </p>
            </div>
            {/* Global Date Filter could go here */}
            <div className="flex items-center gap-2">
               <Badge variant="outline" className="px-3 py-1 bg-slate-100 text-slate-600">제22대 국회</Badge>
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-6 py-8">
        
        {/* --- MAIN TABS --- */}
        <Tabs defaultValue="member" className="w-full" onValueChange={setActiveTab}>
          
          <div className="flex justify-center mb-8">
            <TabsList className="grid w-full max-w-3xl grid-cols-4 bg-white/60 p-1 rounded-2xl border border-slate-200 shadow-sm h-14">
              <TabsTrigger value="member" className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white text-base transition-all duration-300">
                👤 의원 (Member)
              </TabsTrigger>
              <TabsTrigger value="party" className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white text-base transition-all duration-300">
                🏛️ 정당 (Party)
              </TabsTrigger>
              <TabsTrigger value="committee" className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white text-base transition-all duration-300">
                ⚖️ 위원회 (Committee)
              </TabsTrigger>
              <TabsTrigger value="bill" className="rounded-xl data-[state=active]:bg-blue-600 data-[state=active]:text-white text-base transition-all duration-300">
                📜 법안 (Bill)
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ======================= TAB 1: MEMBER ======================= */}
          <TabsContent value="member" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
            
            {/* 1. Filter Toolbar */}
            <Card className="border-none shadow-md bg-white">
              <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="의원 이름 또는 지역구를 검색하세요..." 
                    className="pl-10 h-11 text-base border-slate-200 focus-visible:ring-blue-500"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                  <Select>
                    <SelectTrigger className="w-[140px] h-11"><SelectValue placeholder="정당 선택" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ppp">국민의힘</SelectItem>
                      <SelectItem value="dp">더불어민주당</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger className="w-[140px] h-11"><SelectValue placeholder="위원회" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="leg">법제사법위</SelectItem>
                      <SelectItem value="edu">교육위</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" className="h-11 px-4 gap-2 border-dashed border-slate-300 text-slate-600 hover:text-blue-600 hover:border-blue-300">
                    <Filter className="w-4 h-4" /> 상세 필터
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 2. Members Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {MOCK_MEMBERS.map((member) => (
                <Card key={member.id} className="group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 overflow-hidden border-slate-100">
                  <div className={`h-2 w-full ${member.party === '국민의힘' ? 'bg-red-500' : (member.party === '더불어민주당' ? 'bg-blue-500' : 'bg-slate-500')}`} />
                  
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <Avatar className="h-14 w-14 border-2 border-white shadow-sm">
                      <AvatarImage src={member.img} />
                      <AvatarFallback className="bg-slate-100 text-slate-400 font-bold">{member.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-lg">{member.name} 의원</CardTitle>
                      <CardDescription className="text-xs font-medium bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-1">
                        {member.party}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pb-2">
                    <div className="text-sm text-slate-500 mb-4 flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-400"></div>
                      {member.region}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-slate-600">협력도 (Cooperation)</span>
                        <span className={`font-bold ${member.score > 70 ? 'text-blue-600' : 'text-slate-600'}`}>
                          {member.score}%
                        </span>
                      </div>
                      <Progress value={member.score} className="h-2" indicatorClassName={member.score > 70 ? 'bg-blue-500' : 'bg-slate-400'} />
                    </div>
                  </CardContent>
                  
                  <CardFooter className="pt-2">
                    <Button className="w-full bg-slate-50 text-slate-900 hover:bg-blue-50 hover:text-blue-700 border border-slate-200 shadow-sm group-hover:border-blue-200">
                      상세 분석 보기 <ChevronRight className="w-4 h-4 ml-1 opacity-60" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ======================= TAB 2: PARTY ======================= */}
          <TabsContent value="party" className="space-y-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-500">
            
            {/* Party Selector Header */}
            <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
               <div className="flex gap-3">
                  <Button className="rounded-full px-6 bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-200">
                    국민의힘
                  </Button>
                  <Button variant="ghost" className="rounded-full px-6 text-slate-500 hover:bg-blue-50 hover:text-blue-600">
                    더불어민주당
                  </Button>
                  <Button variant="ghost" className="rounded-full px-6 text-slate-500 hover:bg-slate-100">
                    기타 정당
                  </Button>
               </div>
               <Select defaultValue="22">
                  <SelectTrigger className="w-[120px] border-none bg-slate-100 rounded-full h-9">
                    <SelectValue placeholder="대수" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="22">제22대</SelectItem>
                    <SelectItem value="21">제21대</SelectItem>
                  </SelectContent>
               </Select>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-gradient-to-br from-white to-red-50 border-red-100 shadow-sm">
                 <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">당내 총 협력도 점수</CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div className="text-4xl font-bold text-red-600 flex items-end gap-2">
                       {MOCK_PARTY_STATS.totalScore} <span className="text-lg text-red-400 mb-1">점</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">지난 회기 대비 +2.4% 상승</p>
                 </CardContent>
              </Card>

              <Card className="bg-white border-slate-100 shadow-sm">
                 <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">분석 대상 의원 수</CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div className="text-4xl font-bold text-slate-800 flex items-end gap-2">
                       {MOCK_PARTY_STATS.memberCount} <span className="text-lg text-slate-400 mb-1">명</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2">전체 의석수의 36%</p>
                 </CardContent>
              </Card>

              <Card className="bg-white border-slate-100 shadow-sm">
                 <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-slate-500">가장 핫한 이슈 법안</CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div className="text-xl font-bold text-slate-800 line-clamp-2">
                       {MOCK_PARTY_STATS.topBill}
                    </div>
                    <Badge className="mt-2 bg-red-100 text-red-700 hover:bg-red-200 border-none">찬성 우세</Badge>
                 </CardContent>
              </Card>
            </div>

            {/* Split View: Ranking vs Bills */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[500px]">
               {/* Left: Member Ranking */}
               <Card className="h-full flex flex-col border-slate-200 shadow-sm">
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-yellow-500"/>
                        소속 의원 협력도 순위
                     </CardTitle>
                     <CardDescription>가장 당론과 일치하거나 협력적인 의원 Top 5</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-auto pr-2">
                     <div className="space-y-4">
                        {MOCK_PARTY_STATS.ranking.map((rank, index) => (
                           <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                              <div className="flex items-center gap-3">
                                 <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${index < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-200 text-slate-600'}`}>
                                    {index + 1}
                                 </div>
                                 <span className="font-medium">{rank.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                 <Badge variant={rank.type === 'coop' ? 'default' : 'destructive'} className="uppercase text-[10px]">
                                    {rank.type}
                                 </Badge>
                                 <span className="font-bold text-slate-700">{rank.score}점</span>
                              </div>
                           </div>
                        ))}
                     </div>
                  </CardContent>
               </Card>

               {/* Right: Top Bills */}
               <Card className="h-full flex flex-col border-slate-200 shadow-sm">
                  <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500"/>
                        주요 쟁점 법안 (Top 5)
                     </CardTitle>
                     <CardDescription>정당 내에서 찬성/반대 토론이 가장 활발한 법안</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex items-center justify-center text-slate-400 bg-slate-50/50 m-6 rounded-xl border border-dashed border-slate-300">
                     <div className="text-center">
                        <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
                        <p>법안 데이터를 불러오는 중입니다...</p>
                     </div>
                  </CardContent>
               </Card>
            </div>

          </TabsContent>

          {/* ======================= TAB 3 & 4 (Placeholders) ======================= */}
          <TabsContent value="committee">
             <div className="flex flex-col items-center justify-center h-[400px] text-slate-400 bg-white rounded-xl shadow-sm border border-slate-100">
                <Scale className="w-16 h-16 mb-4 text-slate-200" />
                <h3 className="text-lg font-medium text-slate-600">위원회 분석 준비 중</h3>
                <p>상임위별 회의록 분석 기능을 개발하고 있습니다.</p>
             </div>
          </TabsContent>

          <TabsContent value="bill">
             <div className="flex flex-col items-center justify-center h-[400px] text-slate-400 bg-white rounded-xl shadow-sm border border-slate-100">
                <FileText className="w-16 h-16 mb-4 text-slate-200" />
                <h3 className="text-lg font-medium text-slate-600">법안 중심 분석 준비 중</h3>
                <p>특정 법안의 입법 과정을 추적하는 기능입니다.</p>
             </div>
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
}