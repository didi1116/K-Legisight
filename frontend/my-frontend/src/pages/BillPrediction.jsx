// src/pages/BillPrediction.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Search, FileText, TrendingUp, AlertCircle, CheckCircle2, XCircle, Gavel, Brain, Calendar, ArrowRight, BarChart3 } from "lucide-react";

export function BillPrediction() {
  const [selectedBillId, setSelectedBillId] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");

  // --- MOCK DATA CHUYÊN NGHIỆP ---
  const bills = [
    {
      id: 1,
      number: "2214531",
      title: "인공지능(AI) 산업 육성 및 신뢰 기반 조성에 관한 법률안 (대안)",
      proposer: "과학기술정보방송통신위원장",
      date: "2024-05-30",
      status: "review", // review, pending, passed, rejected
      prediction: {
        result: "가결 유력",
        probability: 87.5,
        trend: "up", // up, down, stable
        sentiment_ratio: { pro: 65, con: 25, neutral: 10 },
        reason: "여야 모두 AI 산업 육성의 필요성에 공감하고 있으며, 독소 조항이 수정되어 합의 가능성이 매우 높음.",
        key_factors: [
          { type: "pos", text: "국가 경쟁력 강화 필요성 대두" },
          { type: "pos", text: "여야 간사 간 합의 도출" },
          { type: "neg", text: "시민단체의 개인정보 침해 우려" }
        ]
      }
    },
    {
      id: 2,
      number: "2214532",
      title: "온라인 플랫폼 독점 규제에 관한 법률안",
      proposer: "박민수 의원 등 10인",
      date: "2024-06-02",
      status: "pending",
      prediction: {
        result: "부결 예상",
        probability: 34.2,
        trend: "down",
        sentiment_ratio: { pro: 30, con: 60, neutral: 10 },
        reason: "산업계의 반발이 거세고, 과도한 규제라는 의견이 지배적이어서 통과가 불투명함.",
        key_factors: [
          { type: "neg", text: "스타트업 성장 저해 우려" },
          { type: "neg", text: "주요 기업들의 강력한 반대" },
          { type: "pos", text: "소상공인 보호 필요성" }
        ]
      }
    },
    {
      id: 3,
      number: "2214533",
      title: "기후위기 대응을 위한 탄소세 도입안",
      proposer: "김영희 의원 등 15인",
      date: "2024-06-10",
      status: "review",
      prediction: {
        result: "보류",
        probability: 51.8,
        trend: "stable",
        sentiment_ratio: { pro: 45, con: 45, neutral: 10 },
        reason: "취지에는 공감하나 세금 부과 방식에 대한 이견이 팽팽하여 추가적인 공청회가 필요할 것으로 예측됨.",
        key_factors: [
          { type: "pos", text: "국제적 탄소중립 흐름 부합" },
          { type: "neg", text: "기업 비용 부담 증가" },
          { type: "neutral", text: "추가 공청회 예정" }
        ]
      }
    },
    {
      id: 4,
      number: "2214534",
      title: "반도체 산업 세액공제 확대법",
      proposer: "기획재정위원장",
      date: "2024-06-15",
      status: "passed",
      prediction: {
        result: "가결 확실",
        probability: 98.1,
        trend: "up",
        sentiment_ratio: { pro: 90, con: 5, neutral: 5 },
        reason: "경제 안보 차원에서 여야가 만장일치에 가까운 찬성 입장을 보임.",
        key_factors: [
          { type: "pos", text: "국가 전략 산업 지원" },
          { type: "pos", text: "초당적 협력 분위기" }
        ]
      }
    }
  ];

  // Filter logic
  const filteredBills = bills.filter(b => 
    (filter === 'all' || b.status === filter) &&
    b.title.includes(searchTerm)
  );

  const selectedBill = bills.find(b => b.id === selectedBillId) || bills[0];

  return (
    <div className="h-screen bg-slate-50 font-sans flex flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        
        {/* --- SIDEBAR: DANH SÁCH DỰ LUẬT (List) --- */}
        <aside className="w-[400px] flex flex-col border-r border-slate-200 bg-white shadow-lg z-10">
          
          {/* Search & Filter Header */}
          <div className="p-4 border-b border-slate-100 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" /> 분석 대상 법안
              </h2>
              <Badge variant="secondary" className="bg-slate-100 text-slate-600">{filteredBills.length}</Badge>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="법안명 검색..." 
                className="pl-9 bg-slate-50 border-slate-200 h-9 text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Tabs defaultValue="all" className="w-full" onValueChange={setFilter}>
              <TabsList className="w-full grid grid-cols-3 h-8 bg-slate-100">
                <TabsTrigger value="all" className="text-xs">전체 (All)</TabsTrigger>
                <TabsTrigger value="review" className="text-xs">심사중</TabsTrigger>
                <TabsTrigger value="passed" className="text-xs">가결</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Scrollable List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-slate-50/50">
            {filteredBills.map((bill) => (
              <div 
                key={bill.id}
                onClick={() => setSelectedBillId(bill.id)}
                className={`p-3 rounded-lg cursor-pointer border transition-all duration-200 group ${
                  selectedBillId === bill.id 
                    ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500/20 relative z-10' 
                    : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] text-slate-400 font-mono">{bill.number}</span>
                  <span className="text-[10px] text-slate-400">{bill.date}</span>
                </div>
                <h3 className={`font-bold text-sm mb-2 line-clamp-2 leading-snug ${selectedBillId === bill.id ? 'text-slate-900' : 'text-slate-700'}`}>
                  {bill.title}
                </h3>
                <div className="flex items-center justify-between border-t border-slate-50 pt-2 mt-1">
                   <span className="text-xs text-slate-500 truncate max-w-[120px]">{bill.proposer}</span>
                   <div className={`flex items-center gap-1 text-xs font-bold ${
                      bill.prediction.probability >= 70 ? 'text-green-600' : 
                      bill.prediction.probability <= 40 ? 'text-red-600' : 'text-yellow-600'
                   }`}>
                      {bill.prediction.probability}%
                      {bill.prediction.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                   </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* --- MAIN CONTENT: CHI TIẾT DỰ ĐOÁN (Detail) --- */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-8">
          <div className="max-w-5xl mx-auto space-y-6">

            {/* 1. Bill Header Info */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex items-center gap-3 mb-4">
                  <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 font-mono">
                    {selectedBill.number}
                  </Badge>
                  <Badge className={`
                    ${selectedBill.status === 'passed' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 
                      selectedBill.status === 'review' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' : 
                      'bg-slate-100 text-slate-700 hover:bg-slate-100'}
                  `}>
                    {selectedBill.status === 'review' ? '위원회 심사중' : selectedBill.status === 'passed' ? '본회의 가결' : '계류'}
                  </Badge>
               </div>
               <h1 className="text-3xl font-bold text-slate-900 leading-tight mb-6">{selectedBill.title}</h1>
               
               <div className="grid grid-cols-3 gap-4 text-sm border-t border-slate-100 pt-4">
                  <div>
                    <span className="text-slate-400 text-xs uppercase font-bold block mb-1">제안자</span>
                    <span className="font-medium text-slate-700">{selectedBill.proposer}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs uppercase font-bold block mb-1">제안일자</span>
                    <span className="font-medium text-slate-700">{selectedBill.date}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-xs uppercase font-bold block mb-1">소관위</span>
                    <span className="font-medium text-slate-700">과학기술정보방송통신위원회</span>
                  </div>
               </div>
            </div>

            {/* 2. AI Prediction Dashboard (Quan trọng nhất) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Cột Trái: Điểm số Dự đoán */}
              <Card className="lg:col-span-1 border-slate-200 shadow-sm overflow-hidden relative">
                 <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                 <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-500" /> AI 예측 결과
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="text-center py-6">
                    <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-8 border-slate-50 bg-white shadow-inner mb-4 relative">
                       <div className={`absolute inset-0 rounded-full border-8 border-t-transparent transform -rotate-45 ${
                          selectedBill.prediction.probability >= 70 ? 'border-green-500' : 
                          selectedBill.prediction.probability <= 40 ? 'border-red-500' : 'border-yellow-500'
                       }`}></div>
                       <div className="flex flex-col items-center z-10">
                          <span className="text-3xl font-black text-slate-800">{selectedBill.prediction.probability}%</span>
                          <span className="text-[10px] text-slate-400 uppercase font-bold">Pass Rate</span>
                       </div>
                    </div>
                    <div className={`text-xl font-bold ${
                       selectedBill.prediction.probability >= 70 ? 'text-green-600' : 
                       selectedBill.prediction.probability <= 40 ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                       {selectedBill.prediction.result}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">AI Confidence: High</p>
                 </CardContent>
              </Card>

              {/* Cột Phải: Phân tích chi tiết */}
              <Card className="lg:col-span-2 border-slate-200 shadow-sm flex flex-col">
                 <CardHeader className="pb-2 border-b border-slate-50">
                    <CardTitle className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-500" /> AI 분석 리포트
                    </CardTitle>
                 </CardHeader>
                 <CardContent className="p-6 space-y-6 flex-1">
                    
                    {/* Thanh Sentiment */}
                    <div className="space-y-2">
                       <div className="flex justify-between text-sm font-medium">
                          <span className="text-slate-600">원내 논의 분위기</span>
                       </div>
                       <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
                          <div className="h-full bg-green-500" style={{ width: `${selectedBill.prediction.sentiment_ratio.pro}%` }} title="긍정"></div>
                          <div className="h-full bg-slate-300" style={{ width: `${selectedBill.prediction.sentiment_ratio.neutral}%` }} title="중립"></div>
                          <div className="h-full bg-red-500" style={{ width: `${selectedBill.prediction.sentiment_ratio.con}%` }} title="부정"></div>
                       </div>
                       <div className="flex justify-between text-xs text-slate-400 px-1">
                          <span className="text-green-600 font-bold">긍정 {selectedBill.prediction.sentiment_ratio.pro}%</span>
                          <span>중립 {selectedBill.prediction.sentiment_ratio.neutral}%</span>
                          <span className="text-red-600 font-bold">부정 {selectedBill.prediction.sentiment_ratio.con}%</span>
                       </div>
                    </div>

                    {/* Lý do & Yếu tố */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-sm text-slate-700 leading-relaxed">
                       <p className="mb-3 font-medium">💡 <span className="text-blue-700">AI Insight:</span> {selectedBill.prediction.reason}</p>
                       
                       <div className="space-y-2 border-t border-slate-200 pt-3 mt-3">
                          <span className="text-xs font-bold text-slate-400 uppercase">주요 영향 요인</span>
                          <ul className="space-y-1.5">
                             {selectedBill.prediction.key_factors.map((factor, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-xs">
                                   {factor.type === 'pos' ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : 
                                    factor.type === 'neg' ? <XCircle className="w-4 h-4 text-red-500 shrink-0" /> : 
                                    <Activity className="w-4 h-4 text-slate-400 shrink-0" />}
                                   <span className="text-slate-600">{factor.text}</span>
                                </li>
                             ))}
                          </ul>
                       </div>
                    </div>

                 </CardContent>
              </Card>

            </div>
            
          </div>
        </main>
      </div>
    </div>
  );
}