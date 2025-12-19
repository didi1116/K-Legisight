// src/pages/BillPrediction.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Search, FileText, TrendingUp, AlertCircle, CheckCircle2, XCircle, Gavel, Brain, Calendar, ArrowRight, BarChart3, Loader2, Send } from "lucide-react";

const API_BASE = "http://localhost:8000";

export function BillPrediction() {
  const [keyword, setKeyword] = useState("");
  const [predictionData, setPredictionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedEvidenceBillId, setSelectedEvidenceBillId] = useState(null);

  // API 호출 함수
  const handleSearch = async () => {
    if (!keyword.trim()) {
      setError("법안 키워드를 입력해주세요.");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_BASE}/api/predict/bill-pass`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim() })
      });

      if (!res.ok) {
        throw new Error(`API 호출 실패: ${res.status}`);
      }

      const data = await res.json();
      setPredictionData(data);
      
      // 첫 번째 근거 법안을 기본 선택
      if (data.evidence_bills && data.evidence_bills.length > 0) {
        setSelectedEvidenceBillId(data.evidence_bills[0].bill_number);
      }
    } catch (err) {
      console.error("Error fetching prediction:", err);
      setError("법안 예측 데이터를 불러오는데 실패했습니다.");
      setPredictionData(null);
    } finally {
      setLoading(false);
    }
  };

  // 선택된 근거 법안
  const selectedEvidenceBill = predictionData?.evidence_bills?.find(
    b => b.bill_number === selectedEvidenceBillId
  ) || predictionData?.evidence_bills?.[0];

  // 통과 가능성에 따른 결과 텍스트
  const getPredictionResult = (probability) => {
    if (probability >= 0.7) return "가결 유력";
    if (probability >= 0.5) return "가결 가능";
    if (probability >= 0.3) return "보류 예상";
    return "부결 예상";
  };

  // 통과 가능성에 따른 색상
  const getProbabilityColor = (probability) => {
    if (probability >= 0.7) return { 
      text: 'text-green-600', 
      hex: '#22c55e',  // green-500
      bgClass: 'bg-green-500',
      border: 'border-green-500' 
    };
    if (probability >= 0.5) return { 
      text: 'text-yellow-600', 
      hex: '#eab308',  // yellow-500
      bgClass: 'bg-yellow-500', 
      border: 'border-yellow-500' 
    };
    return { 
      text: 'text-red-600', 
      hex: '#ef4444',  // red-500
      bgClass: 'bg-red-500', 
      border: 'border-red-500' 
    };
  };

  return (
    <div className="h-screen bg-slate-50 font-sans flex flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">
        
        {/* --- SIDEBAR: 검색 & 근거 법안 --- */}
        <aside className="w-[400px] flex flex-col border-r border-slate-200 bg-white shadow-lg z-10">
          
          {/* 검색 헤더 */}
          <div className="p-4 border-b border-slate-100 bg-gradient-to-br from-blue-50 to-white space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-slate-800">법안명 검색</h2>
            </div>
            
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input 
                  placeholder="법안 키워드 입력..." 
                  className="pl-9 bg-white border-slate-200 h-9 text-sm"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  disabled={loading}
                />
              </div>
              <Button 
                onClick={handleSearch}
                disabled={loading || !keyword.trim()}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 h-9"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>

            {error && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                {error}
              </div>
            )}
          </div>

          {/* 근거 법안 리스트 */}
          <div className="flex-1 overflow-y-auto">
            {!predictionData ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
                <FileText className="w-12 h-12 text-slate-300" />
                <div>
                  <p className="text-sm font-medium text-slate-600">법안 키워드를 입력하세요</p>
                  <p className="text-xs text-slate-400 mt-1">과거 유사 법안을 분석하여<br/>법안의 가결 가능성을 분석합니다.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="p-3 bg-slate-50 border-b border-slate-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-500 uppercase">근거 법안</span>
                    <Badge variant="secondary" className="bg-white text-slate-600 text-xs">
                      {predictionData.evidence_bills?.length || 0}건
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-400">유사도 순으로 정렬됨</p>
                </div>

                <div className="p-2 space-y-1">
                  {predictionData.evidence_bills?.map((bill, idx) => (
                    <div 
                      key={bill.bill_number}
                      onClick={() => setSelectedEvidenceBillId(bill.bill_number)}
                      className={`p-3 rounded-lg cursor-pointer border transition-all duration-200 ${
                        selectedEvidenceBillId === bill.bill_number
                          ? 'bg-blue-50 border-blue-300 shadow-sm ring-1 ring-blue-200' 
                          : 'bg-white border-slate-200 hover:border-blue-200 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            idx < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-500'
                          }`}>
                            #{idx + 1}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">{bill.bill_number}</span>
                        </div>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-200 text-blue-600">
                          유사도 {(bill.similarity * 100).toFixed(0)}%
                        </Badge>
                      </div>
                      
                      <h3 className="font-semibold text-xs mb-2 line-clamp-2 leading-snug text-slate-800">
                        {bill.bill_name}
                      </h3>
                      
                      <div className="flex items-center justify-between text-[10px] border-t border-slate-100 pt-2">
                        <span className="text-slate-500">{bill.n_speeches}회 발언</span>
                        <Badge className={`text-[10px] px-2 py-0 ${
                          bill.stance === '협력' ? 'bg-green-50 text-green-700 hover:bg-green-50' :
                          bill.stance === '비협력' ? 'bg-red-50 text-red-700 hover:bg-red-50' :
                          'bg-slate-100 text-slate-600 hover:bg-slate-100'
                        }`}>
                          {bill.stance}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </aside>

        {/* --- MAIN CONTENT: 예측 결과 상세 --- */}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-8">
          {!predictionData ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4 max-w-md">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Brain className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800">법안 예측 보조 분석 시스템</h2>
                <p className="text-slate-500 text-sm leading-relaxed">
                  법안 키워드를 입력하면 과거 유사 법안 데이터를 분석하여<br/>
                  법안의 통과 가능성을 분석해드립니다.
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto space-y-6">

              {/* 첫 번째 행: 검색 키워드 + AI 예측 결과 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 검색 키워드 및 요약 정보 */}
                <Card className="lg:col-span-2 border-slate-200 shadow-sm">
                  <CardHeader className="pb-2 border-b border-slate-50">
                    <CardTitle className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-500" /> 검색 키워드
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <h1 className="text-2xl font-bold text-slate-900">{predictionData.query}</h1>
                    
                    <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-700 leading-relaxed">
                      {predictionData.explanation}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 text-xs uppercase font-bold block mb-1">분석 법안 수</span>
                        <span className="font-bold text-lg text-slate-800">{predictionData.evidence_bills?.length || 0}건</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs uppercase font-bold block mb-1">입법 괴리 수준</span>
                        <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 font-bold">
                          {predictionData.legislative_gap?.level} ({(predictionData.legislative_gap?.score * 100).toFixed(1)}%)
                        </Badge>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs uppercase font-bold block mb-1">AI 신뢰도</span>
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 font-bold">
                          {predictionData.confidence?.level} ({(predictionData.confidence?.score * 100).toFixed(1)}%)
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* 입법 예측 보조 분석 결과 */}
                <Card className="lg:col-span-1 border-slate-200 shadow-sm overflow-hidden relative">
                  <div className={`absolute top-0 left-0 w-full h-1.5 ${
                    getProbabilityColor(predictionData.predicted_pass_probability).bgClass
                  }`}></div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-500" /> 법안의 가결 가능성
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-center mt-20">
                    <div className="inline-flex items-center justify-center w-32 h-32 rounded-full mb-4 relative">
                      {/* 배경 원 */}
                      <div className="absolute inset-0 rounded-full bg-slate-100"></div>
                      
                      {/* 진행률 원 (conic-gradient 사용) */}
                      <div 
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: `conic-gradient(
                            from -90deg,
                            ${getProbabilityColor(predictionData.predicted_pass_probability).hex} 0deg,
                            ${getProbabilityColor(predictionData.predicted_pass_probability).hex} ${predictionData.predicted_pass_probability * 360}deg,
                            #e2e8f0 ${predictionData.predicted_pass_probability * 360}deg,
                            #e2e8f0 360deg
                          )`
                        }}
                      ></div>
                      
                      {/* 내부 흰색 원 (도넛 모양 만들기) */}
                      <div className="absolute inset-2 rounded-full bg-white shadow-inner"></div>
                      
                      {/* 텍스트 */}
                      <div className="flex flex-col items-center z-10">
                        <span className="text-3xl font-black text-slate-800">
                          {(predictionData.predicted_pass_probability * 100).toFixed(1)}%
                        </span>

                      </div>
                    </div>
                    <div className={`text-xl font-bold ${
                      getProbabilityColor(predictionData.predicted_pass_probability).text
                    }`}>
                      <span>Pass Rate</span>
                    </div>
                    {/* <p className="text-xs text-slate-400 mt-2">
                      신뢰도: {predictionData.confidence?.level} ({(predictionData.confidence?.score * 100).toFixed(0)}%)
                    </p> */}
                  </CardContent>
                </Card>
              </div>

              {/* 두 번째 행: 선택된 근거 법안 분석 */}
              <Card className="border-slate-200 shadow-sm flex flex-col">
                  <CardHeader className="pb-2 border-b border-slate-50">
                    <CardTitle className="text-sm font-bold text-slate-500 uppercase flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-500" /> 선택된 근거 법안 분석
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4 flex-1">
                    {selectedEvidenceBill ? (
                      <>
                        {/* 법안 정보 */}
                        <div>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline" className="font-mono text-xs">
                                  {selectedEvidenceBill.bill_number}
                                </Badge>
                                <Badge className={`text-xs ${
                                  selectedEvidenceBill.stance === '협력' ? 'bg-green-100 text-green-700 hover:bg-green-100' :
                                  selectedEvidenceBill.stance === '비협력' ? 'bg-red-100 text-red-700 hover:bg-red-100' :
                                  'bg-slate-100 text-slate-600 hover:bg-slate-100'
                                }`}>
                                  {selectedEvidenceBill.stance}
                                </Badge>
                              </div>
                              <h3 className="font-bold text-slate-800 leading-snug">
                                {selectedEvidenceBill.bill_name}
                              </h3>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-100">
                            <div>
                              <span className="text-xs text-slate-400 block mb-1">유사도</span>
                              <span className="font-bold text-blue-600">
                                {(selectedEvidenceBill.similarity * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-xs text-slate-400 block mb-1">발언 횟수</span>
                              <span className="font-bold text-slate-800">{selectedEvidenceBill.n_speeches}회</span>
                            </div>
                            <div>
                              <span className="text-xs text-slate-400 block mb-1">협력도 평균</span>
                              <span className={`font-bold ${
                                selectedEvidenceBill.avg_score_prob > 0 ? 'text-green-600' : 
                                selectedEvidenceBill.avg_score_prob < 0 ? 'text-red-600' : 'text-slate-600'
                              }`}>
                                {selectedEvidenceBill.avg_score_prob > 0 ? '+' : ''}
                                {selectedEvidenceBill.avg_score_prob.toFixed(3)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 법안 통과 여부 */}
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-2">
                            {selectedEvidenceBill.label === 1 ? (
                              <>
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                <span className="font-bold text-green-700">이 법안은 국회를 통과했습니다</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-5 h-5 text-red-600" />
                                <span className="font-bold text-red-700">이 법안은 부결되었습니다</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* AI 인사이트 */}
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-slate-700 leading-relaxed">
                          <p className="font-medium flex items-start gap-2">
                            <Brain className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                            <span>
                              이 근거 법안은 검색 키워드와 <strong className="text-blue-700">
                                {(selectedEvidenceBill.similarity * 100).toFixed(0)}% 유사
                              </strong>하며, 
                              총 <strong>{selectedEvidenceBill.n_speeches}회</strong>의 발언에서 평균 
                              <strong className={
                                selectedEvidenceBill.avg_score_prob > 0 ? 'text-green-700' : 
                                selectedEvidenceBill.avg_score_prob < 0 ? 'text-red-700' : 'text-slate-700'
                              }>
                                {' '}{selectedEvidenceBill.stance}적
                              </strong> 분위기가 형성되었습니다.
                            </span>
                          </p>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        근거 법안을 선택해주세요
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
          )}
        </main>
      </div>
    </div>
  );
}