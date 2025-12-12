import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, MessageSquare, BarChart3,Users } from "lucide-react";

export function BillSearchPage() {
const location = useLocation(); // 1. Lấy dữ liệu được gửi từ trang chủ

  // --- STATE ---
  const [filters, setFilters] = useState({
    bill_name: '',
    bill_number: '',
    proposer: '',
    submission_type: 'all'
  });
  
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  // 2. Tách hàm gọi API ra riêng để tái sử dụng
  const performSearch = async (searchParams) => {
    setLoading(true);
    setSearched(true);
    setResult(null);
    try {
        const payload = {
            bill_name: searchParams.bill_name || null,
            bill_number: searchParams.bill_number || null,
            proposer: searchParams.proposer || null,
            submission_type: searchParams.submission_type === 'all' ? null : searchParams.submission_type
        };

        const res = await axios.post('http://localhost:8000/api/bills/analysis', payload);
        setResult(res.data);
    } catch (error) {
        console.error("Search error:", error);
    } finally {
        setLoading(false);
    }
  };

  // 3. Hàm xử lý khi bấm nút "Tìm kiếm" thủ công
  const handleManualSearch = () => {
    performSearch(filters);
  };

  // 4. useEffect: Tự động chạy khi mới vào trang nếu có dữ liệu gửi sang
  useEffect(() => {
    // Kiểm tra xem có bill_name được gửi từ trang chủ không
    if (location.state?.bill_name) {
      const targetBillName = location.state.bill_name;
      
      // Cập nhật ô input để người dùng thấy mình đang tìm cái gì
      setFilters(prev => ({ ...prev, bill_name: targetBillName }));
      
      // Gọi API ngay lập tức
      performSearch({
        bill_name: targetBillName,
        bill_number: '',
        proposer: '',
        submission_type: 'all'
      });
      
      // Xóa state để tránh gọi lại khi refresh (tùy chọn)
      window.history.replaceState({}, document.title);
    }
  }, [location.state]); // Chỉ chạy khi location.state thay đổi

  const getScoreColor = (score) => {
    if (score >= 60) return "bg-blue-500"; 
    if (score <= 40) return "bg-red-500";  
    return "bg-slate-400";                 
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div>
           <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
             <FileText className="w-8 h-8 text-blue-600" />
             법안 중심 검색 (Bill Analysis)
           </h1>
           <p className="text-slate-500 mt-1">법안별 발언 수, 전체 및 정당별 협력도 분석</p>
        </div>

        {/* 1. FILTER BAR */}
        <Card className="p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                {/* Tên Bill */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">법안명</label>
                    <Input 
                        placeholder="예: AI 기본법" 
                        value={filters.bill_name}
                        onChange={(e) => setFilters({...filters, bill_name: e.target.value})}
                    />
                </div>
                
                {/* Số hiệu Bill */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">의안번호</label>
                    <Input 
                        placeholder="예: 2200123" 
                        value={filters.bill_number}
                        onChange={(e) => setFilters({...filters, bill_number: e.target.value})}
                    />
                </div>

                {/* Người phát ý */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">발의자</label>
                    <Input 
                        placeholder="의원명 입력" 
                        value={filters.proposer}
                        onChange={(e) => setFilters({...filters, proposer: e.target.value})}
                    />
                </div>

                {/* Loại (Chính phủ / Nghị sĩ) */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">제출유형</label>
                    <Select 
                        value={filters.submission_type} 
                        onValueChange={(val) => setFilters({...filters, submission_type: val})}
                    >
                        <SelectTrigger className="bg-white">
                            <SelectValue placeholder="선택" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">전체 </SelectItem>
                            <SelectItem value="의원">의원발의</SelectItem>
                            <SelectItem value="정부">정부제출</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
            
            <div className="mt-6 flex justify-end">
                <Button onClick={handleManualSearch} disabled={loading} className="w-full md:w-auto px-8 bg-blue-600 hover:bg-blue-700">
                    {loading ? "분석 중..." : <><Search className="w-4 h-4 mr-2" /> 검색 및 분석</>}
                </Button>
            </div>
        </Card>

        {searched && !loading && result && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                    
                    {/* 1. INFO CARD & SUMMARY */}
                    <div className="text-center pb-6 border-b border-slate-200">
                        <Badge variant="outline" className="mb-2 border-blue-200 text-blue-600 bg-blue-50">
                            {result.bill_info.bill_no || "의안번호 없음"}
                        </Badge>
                        <h2 className="text-3xl font-bold text-slate-800 mb-2">{result.bill_info.bill_name}</h2>
                        <div className="flex justify-center gap-6 text-slate-500 text-sm">
                             <span className="flex items-center gap-1"><FileText className="w-4 h-4"/> 발의자: {result.bill_info.proposer}</span>
                             <span className="flex items-center gap-1"><MessageSquare className="w-4 h-4"/> 총 발언: {result.stats.total_speeches}회</span>
                             <span className="flex items-center gap-1"><Users className="w-4 h-4"/> 전체 협력도: {result.stats.total_cooperation}점</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* LEFT COLUMN: PARTY ANALYSIS (Chi tiết Đảng) */}
                        <div className="lg:col-span-1 space-y-6">
                            <Card className="shadow-md h-full">
                                <CardHeader className="bg-slate-50/50 border-b pb-4">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <BarChart3 className="w-5 h-5 text-purple-600" />
                                        정당별 분석 
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-6">
                                    {result.stats.party_breakdown.map((party, idx) => (
                                        <div key={idx} className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <span className="font-bold text-slate-800">{party.party_name}</span>
                                                    <span className="text-xs text-slate-500 ml-2">({party.member_count}명 참여)</span>
                                                </div>
                                                <Badge className={`${getScoreColor(party.avg_score)} border-0`}>
                                                    평균 {party.avg_score}점
                                                </Badge>
                                            </div>
                                            {/* Progress Bar */}
                                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full transition-all duration-1000 ${
                                                        party.avg_score >= 60 ? 'bg-blue-500' : 
                                                        party.avg_score <= 40 ? 'bg-red-500' : 'bg-slate-400'
                                                    }`} 
                                                    style={{ width: `${party.avg_score}%` }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                    {result.stats.party_breakdown.length === 0 && (
                                        <div className="text-center text-slate-400 py-10">데이터가 없습니다.</div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        {/* RIGHT COLUMN: INDIVIDUAL MEMBER LIST (Chi tiết từng người) */}
                        <div className="lg:col-span-2">
                            <Card className="shadow-md h-full flex flex-col">
                                <CardHeader className="bg-slate-50/50 border-b pb-4 flex flex-row justify-between items-center">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Users className="w-5 h-5 text-blue-600" />
                                        참여 의원 목록 
                                    </CardTitle>
                                    <Badge variant="secondary">{result.stats.member_details?.length || 0}명</Badge>
                                </CardHeader>
                                
                                <div className="flex-1 overflow-auto max-h-[600px]"> {/* Scrollable List */}
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                                            <tr>
                                                <th className="px-6 py-3">의원명 </th>
                                                <th className="px-6 py-3">정당 </th>
                                                <th className="px-6 py-3 text-center">발언 수</th>
                                                <th className="px-6 py-3 text-right">협력도 </th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {result.stats.member_details?.map((member, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-6 py-4 font-medium text-slate-900">
                                                        {member.name}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600">
                                                        {member.party}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                                                            {member.n_speeches}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Badge variant="outline" className={`${getScoreColor(member.score)}`}>
                                                            {member.score}점 ({member.stance})
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!result.stats.member_details || result.stats.member_details.length === 0) && (
                                                <tr>
                                                    <td colSpan="4" className="text-center py-10 text-slate-400">
                                                        참여한 의원 데이터가 없습니다.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>

                    </div>
                </div>
            )}

      </div>
    </div>
  );
}