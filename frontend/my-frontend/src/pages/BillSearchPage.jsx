import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, ArrowLeft, TrendingUp } from "lucide-react";
import { BillListTable } from '@/components/bill/BillListTable';

export function BillSearchPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // URL 쿼리 파라미터에서 query 추출
  const searchParams = new URLSearchParams(location.search);
  const queryFromURL = searchParams.get('query');

  // --- STATE ---
  const [filters, setFilters] = useState({
    bill_name: queryFromURL || '',
    bill_number: '',
    proposer: '',
    proposer_type: 'all'
  });
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // API 호출
  const performSearch = async (searchParams) => {
    setLoading(true);
    setSearched(true);
    setResult(null);
    try {
        const payload = {
            bill_name: searchParams.bill_name || null,
            bill_number: searchParams.bill_number || null,
            proposer: searchParams.proposer || null,
            proposer_type: searchParams.proposer_type === 'all' ? null : searchParams.proposer_type
        };

        const res = await axios.post('http://localhost:8000/api/bills/analysis', payload);
        console.log('=== API 응답 데이터 ===');
        console.log('전체 응답:', res.data);
        console.log('결과 수:', res.data.total_count);
        setResult(res.data);
    } catch (error) {
        console.error("Search error:", error);
    } finally {
        setLoading(false);
    }
  };

  // 수동 검색
  const handleManualSearch = () => {
    performSearch(filters);
  };

  // 자동 검색
  useEffect(() => {
    if (queryFromURL) {
      performSearch({
        bill_name: queryFromURL,
        bill_number: '',
        proposer: '',
        proposer_type: 'all'
      });
      return;
    }
    
    if (location.state?.bill_name) {
      const targetBillName = location.state.bill_name;
      setFilters(prev => ({ ...prev, bill_name: targetBillName }));
      
      performSearch({
        bill_name: targetBillName,
        bill_number: '',
        proposer: '',
        proposer_type: 'all'
      });
      
      window.history.replaceState({}, document.title);
    }
  }, [queryFromURL, location.state]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* --- HEADER --- */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-full hover:bg-slate-200">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
                법안 중심 검색
              </h1>
              <p className="text-slate-500 text-sm mt-1">법안별 발언 수, 전체 및 정당별 협력도 분석</p>
            </div>
          </div>
        </div>

        {/* --- FILTER BAR --- */}
        <Card className="p-6 shadow-sm border border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">법안명</label>
              <Input 
                placeholder="예: AI 기본법" 
                value={filters.bill_name}
                onChange={(e) => setFilters({...filters, bill_name: e.target.value})}
                onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">의안번호</label>
              <Input 
                placeholder="예: 2200123" 
                value={filters.bill_number}
                onChange={(e) => setFilters({...filters, bill_number: e.target.value})}
                onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">발의자</label>
              <Input 
                placeholder="의원명 입력" 
                value={filters.proposer}
                onChange={(e) => setFilters({...filters, proposer: e.target.value})}
                onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">제출유형</label>
              <Select 
                value={filters.proposer_type} 
                onValueChange={(val) => setFilters({...filters, proposer_type: val})}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="의원">의원발의</SelectItem>
                  <SelectItem value="정부">정부제출</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="mt-6 flex justify-end gap-2">
            <Button 
              onClick={handleManualSearch} 
              disabled={loading} 
              className="px-6 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? "분석 중..." : <><Search className="w-4 h-4 mr-2" /> 검색 및 분석</>}
            </Button>
          </div>
        </Card>

        {/* --- RESULTS SECTION --- */}
        {searched && !loading && result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* 검색 결과 요약 */}
            <div className="text-left pb-4 border-b border-slate-200">
              <h2 className="text-2xl font-bold text-slate-800 mb-1">
                검색 결과: 총 {result.total_count}건
              </h2>
              <p className="text-slate-500 text-sm">{result.message}</p>
            </div>

            {/* 법안 테이블 */}
            <div className="h-[600px]">
              <BillListTable 
                bills={result.results || []}
                onBillClick={(bill) => {
                  console.log("Bill clicked:", bill);
                  navigate('/analysis/bill-view', { 
                    state: { 
                      billData: bill,
                      searchResult: result
                    } 
                  });
                }}
              />
            </div>

          </div>
        )}

        {/* 로딩 상태 */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="text-slate-500 mt-4">법안 분석 중입니다...</p>
          </div>
        )}

        {/* 검색 전 초기 상태 */}
        {searched === false && !loading && (
          <div className="text-center py-20 text-slate-400">
            <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">위 필터에서 법안을 검색하면 분석 결과가 표시됩니다.</p>
          </div>
        )}

      </div>
    </div>
  );
}