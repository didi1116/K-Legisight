// src/pages/BillPrediction.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Search, FileText, TrendingUp, AlertCircle, CheckCircle2, XCircle, Gavel, Brain } from "lucide-react";

export function BillPrediction() {
  const navigate = useNavigate();
  const [selectedBillId, setSelectedBillId] = useState(1); // Mặc định chọn luật đầu tiên
  const [searchTerm, setSearchTerm] = useState("");

  // --- MOCK DATA: Danh sách các dự luật & Kết quả dự đoán ---
  const bills = [
    {
      id: 1,
      number: "2214531",
      title: "인공지능(AI) 산업 육성 및 신뢰 기반 조성에 관한 법률안",
      proposer: "김철수 의원 등 12인",
      date: "2024-05-30",
      status: "Reviewing",
      prediction: {
        result: "가결 유력",
        probability: 87,
        sentiment_ratio: { pro: 65, con: 25, neutral: 10 },
        reason: "여야 모두 AI 산업 육성의 필요성에 공감하고 있으며, 독소 조항이 수정되어 합의 가능성이 매우 높음."
      }
    },
    {
      id: 2,
      number: "2214532",
      title: "디지털 플랫폼 독점 규제법",
      proposer: "이영희 의원 등 10인",
      date: "2024-06-02",
      status: "Pending",
      prediction: {
        result: "부결 예상",
        probability: 34,
        sentiment_ratio: { pro: 30, con: 60, neutral: 10 },
        reason: "산업계의 반발이 거세고, 여당 내에서도 과도한 규제라는 의견이 지배적이어서 통과가 불투명함."
      }
    },
    {
      id: 3,
      number: "2214533",
      title: "기후위기 대응을 위한 탄소세 도입안",
      proposer: "박민수 의원 등 15인",
      date: "2024-06-10",
      status: "Debating",
      prediction: {
        result: "보류",
        probability: 51,
        sentiment_ratio: { pro: 45, con: 45, neutral: 10 },
        reason: "취지에는 공감하나 세금 부과 방식에 대한 이견이 팽팽하여 추가적인 공청회가 필요할 것으로 예측됨."
      }
    }
  ];

  // Lấy thông tin luật đang được chọn
  const selectedBill = bills.find(b => b.id === selectedBillId);

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-8 max-w-7xl">
        
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-8 h-8 text-blue-600" /> 입법 예측 AI (Bill Prediction)
            </h1>
            <p className="text-slate-500 mt-1">AI가 분석한 법안의 통과 확률과 쟁점을 확인하세요.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)] min-h-[600px]">
          
          {/* --- CỘT TRÁI: DANH SÁCH DỰ LUẬT (List) --- */}
          <Card className="lg:col-span-4 flex flex-col border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="법안명 검색..." 
                  className="pl-9 bg-slate-50 border-slate-200"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto bg-slate-50/50 p-2 space-y-2">
              {bills.map((bill) => (
                <div 
                  key={bill.id}
                  onClick={() => setSelectedBillId(bill.id)}
                  className={`p-4 rounded-lg cursor-pointer border transition-all duration-200 ${
                    selectedBillId === bill.id 
                      ? 'bg-white border-blue-500 shadow-md ring-1 ring-blue-500' 
                      : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="bg-slate-50 text-xs text-slate-500">{bill.number}</Badge>
                    <span className="text-xs text-slate-400">{bill.date}</span>
                  </div>
                  <h3 className={`font-bold text-sm mb-2 line-clamp-2 ${selectedBillId === bill.id ? 'text-blue-700' : 'text-slate-700'}`}>
                    {bill.title}
                  </h3>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 truncate max-w-[120px]">{bill.proposer}</span>
                    <Badge className={`text-[10px] px-1.5 py-0 ${
                      bill.prediction.probability >= 70 ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                      bill.prediction.probability <= 40 ? 'bg-red-100 text-red-700 hover:bg-red-100' :
                      'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
                    }`}>
                      {bill.prediction.probability}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* --- CỘT PHẢI: CHI TIẾT DỰ ĐOÁN (Detail) --- */}
          <div className="lg:col-span-8 flex flex-col gap-6 overflow-y-auto pr-1">
            
            {/* 1. Header Thông tin luật */}
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-slate-100 rounded-xl">
                    <Gavel className="w-8 h-8 text-slate-600" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900 leading-tight mb-2">{selectedBill.title}</h2>
                    <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                      <span className="flex items-center gap-1"><FileText className="w-4 h-4" /> {selectedBill.number}</span>
                      <span>|</span>
                      <span>{selectedBill.proposer}</span>
                      <span>|</span>
                      <span>{selectedBill.date} 제안</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. AI Prediction Box (Quan trọng nhất) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Ô Tỉ lệ thành công */}
              <Card className={`border-l-4 shadow-sm ${
                selectedBill.prediction.probability >= 70 ? 'border-l-green-500' :
                selectedBill.prediction.probability <= 40 ? 'border-l-red-500' : 'border-l-yellow-500'
              }`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <Brain className="w-4 h-4" /> AI 예측 결과
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className={`text-4xl font-black ${
                       selectedBill.prediction.probability >= 70 ? 'text-green-600' :
                       selectedBill.prediction.probability <= 40 ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {selectedBill.prediction.probability}%
                    </span>
                    <span className="text-lg font-bold text-slate-700">
                      {selectedBill.prediction.result}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mt-2">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        selectedBill.prediction.probability >= 70 ? 'bg-green-500' :
                        selectedBill.prediction.probability <= 40 ? 'bg-red-500' : 'bg-yellow-500'
                      }`} 
                      style={{ width: `${selectedBill.prediction.probability}%` }}
                    ></div>
                  </div>
                </CardContent>
              </Card>

              {/* Ô Phân tích lý do */}
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-slate-500 uppercase tracking-wider flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> AI 분석 근거
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    "{selectedBill.prediction.reason}"
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* 3. Biểu đồ tranh luận (Sentiment Chart) */}
            <Card className="border-slate-200 shadow-sm flex-1">
              <CardHeader>
                <CardTitle className="text-lg text-slate-800">원내 논의 분위기</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Pro */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="flex items-center gap-2 text-slate-700"><CheckCircle2 className="w-4 h-4 text-green-600" /> 긍정/찬성</span>
                      <span className="text-green-600">{selectedBill.prediction.sentiment_ratio.pro}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
                      <div className="bg-green-500 h-full rounded-full" style={{ width: `${selectedBill.prediction.sentiment_ratio.pro}%` }}></div>
                    </div>
                  </div>

                  {/* Con */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="flex items-center gap-2 text-slate-700"><XCircle className="w-4 h-4 text-red-600" /> 부정/반대</span>
                      <span className="text-red-600">{selectedBill.prediction.sentiment_ratio.con}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
                      <div className="bg-red-500 h-full rounded-full" style={{ width: `${selectedBill.prediction.sentiment_ratio.con}%` }}></div>
                    </div>
                  </div>

                  {/* Neutral */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm font-medium">
                      <span className="flex items-center gap-2 text-slate-700"><Activity className="w-4 h-4 text-slate-400" /> 중립/유보 (Trung lập)</span>
                      <span className="text-slate-500">{selectedBill.prediction.sentiment_ratio.neutral}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
                      <div className="bg-slate-400 h-full rounded-full" style={{ width: `${selectedBill.prediction.sentiment_ratio.neutral}%` }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>

      </main>
    </div>
  );
}