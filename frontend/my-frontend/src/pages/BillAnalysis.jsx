// src/pages/BillAnalysis.jsx
import React, { useMemo, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Users, MessageSquare, ArrowLeft, UserPlus, Activity, Mic, Medal, TrendingUp, Loader2 } from "lucide-react"; 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function BillAnalysis() {
  const location = useLocation();
  const navigate = useNavigate();

  // State quản lý dữ liệu
  const [billData, setBillData] = useState(null);
  const [billInfo, setBillInfo] = useState(null);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true); 

  const PARTY_ID_MAP = {
    "국민의힘": 106,
    "더불어민주당": 101,
    "정의당": 107,
    "무소속": 100,
    "새로운미래": 109,
    "기본소득당": 113,
    "미래통합당": 104,
    "시대전환": 115,
    "국민의당": 108,
    "미래한국당": 105,
    // Thêm các đảng khác nếu cần
  };

  // 2. 🔥 THÊM: Hàm xử lý click
  const handlePartyClick = (partyName) => {
    const partyId = PARTY_ID_MAP[partyName];
    
    if (partyId) {
        navigate("/sentiment/party", { 
            state: { partyId: partyId } 
        });
    } else {
        alert("이 정당에 대한 상세 분석 데이터가 없습니다.");
    }
  };

  // --- 🔥 PHẦN KẾT NỐI BACKEND QUAN TRỌNG ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      // 1. Kiểm tra nếu có dữ liệu truyền qua Router (từ trang Search)
      if (location.state?.billData) {
        const data = location.state.billData;
        setBillData(data);
        setBillInfo(data.bill_info);
        setStats(data.stats);
        setIsLoading(false);
        return;
      }

      // 2. Nếu không có state (F5 refresh), lấy ID từ URL và gọi API
      // Giả sử URL là: /sentiment/bill?query=2112345
      const searchParams = new URLSearchParams(location.search);
      const queryId = searchParams.get("query"); 

      if (queryId) {
        try {
          // Gọi API Backend (Port 8000)
          const response = await fetch(`http://localhost:8000/api/bills/${queryId}/detail`);
          
          if (!response.ok) {
            throw new Error("Không tìm thấy dữ liệu pháp luật");
          }

          const data = await response.json();
          setBillData(data);
          setBillInfo(data.bill_info);
          setStats(data.stats);
        } catch (error) {
          console.error("Lỗi khi tải dữ liệu:", error);
          alert("데이터를 불러오는 중 오류가 발생했습니다.");
          navigate(-1); 
        }
      } else {
        navigate("/home");
      }
      
      setIsLoading(false);
    };

    fetchData();
  }, [location, navigate]);

  // --- Logic tính toán hiển thị (Giữ nguyên) ---
  const proposersList = useMemo(() => {
    const rawText = billInfo?.proposer || billInfo?.proposer_name || "";
    if (!rawText) return [];
    return rawText.split(/,|외\s\d+인/).map(name => name.trim()).filter(Boolean);
  }, [billInfo]);

  const topCoopMembers = useMemo(() => {
    if (!stats?.individual_members || stats.individual_members.length === 0) return [];
    // 점수 기준 내림차순 정렬 후 상위 5명
    return [...stats.individual_members]
      .filter(m => m.score != null)
      .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
      .slice(0, 5); 
  }, [stats]);

  const topActiveMembers = useMemo(() => {
    if (!stats?.individual_members || stats.individual_members.length === 0) return [];
    // 발언 횟수 기준 내림차순 정렬 후 상위 5명
    return [...stats.individual_members]
      .filter(m => m.n_speeches != null)
      .sort((a, b) => (Number(b.n_speeches) || 0) - (Number(a.n_speeches) || 0))
      .slice(0, 5);
  }, [stats]);

const handleMemberClick = (member) => {
    navigate("/analysis/detail", { 
      state: {
        legislatorName: member.member_name,
        legislatorProfile: {
          member_id: member.member_id,
          name: member.member_name,
          party: member.party_name,
        },
        // Thông tin dự luật hiện tại
        billInfo: {
          billNumber: billInfo.bill_id, // Quan trọng: dùng để gọi API lấy speeches
          billName: billInfo.bill_name,
          date: billInfo.propose_date || billInfo.date,
          scoreProbMean: member.score, // Điểm của cá nhân này
          role: "심사 참여", 
        },
        // AI Summary (nếu có trong tương lai)
        aiSummary: null 
      }
    });
  };

  const PARTY_THEME = {
    "국민의힘": { badge: "bg-red-50 text-red-700 border-red-200", text: "text-red-700", bar: "bg-red-500" },
    "더불어민주당": { badge: "bg-blue-50 text-blue-700 border-blue-200", text: "text-blue-700", bar: "bg-blue-500" },
    "정의당": { badge: "bg-yellow-50 text-yellow-700 border-yellow-200", text: "text-yellow-700", bar: "bg-yellow-500" },
    "무소속": { badge: "bg-slate-100 text-slate-700 border-slate-200", text: "text-slate-700", bar: "bg-slate-500" },
    "새로운미래": { badge: "bg-blue-50 text-blue-700 border-blue-200", text: "text-blue-700", bar: "bg-blue-500" },
    "기본소득당": { badge: "bg-teal-50 text-teal-700 border-teal-200", text: "text-teal-700", bar: "bg-teal-500" },
    "조국혁신당": { badge: "bg-blue-900 text-white border-blue-800", text: "text-blue-900", bar: "bg-blue-900" },
    "개혁신당": { badge: "bg-orange-50 text-orange-700 border-orange-200", text: "text-orange-700", bar: "bg-orange-500" },
    default: { badge: "bg-slate-100 text-slate-700 border-slate-200", text: "text-slate-700", bar: "bg-slate-500" }
  };

  const getPartyTheme = (partyName) => PARTY_THEME[partyName] || PARTY_THEME.default;

  const formatScore = (value) => {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(4) : "0.00";
  };

  const totalCoopScore = Number(stats?.total_cooperation ?? 0);
  const hasPartyData = Boolean(stats?.party_breakdown && stats.party_breakdown.length > 0);

  // Hiển thị màn hình Loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-500">데이터를 분석 중입니다...</p>
        </div>
      </div>
    );
  }

  if (!billData) return null;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* --- 🔥 NEW UNIFIED HEADER (Gom chung Tên + Thống kê) --- */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* CỘT TRÁI: Thông tin Dự luật (Chiếm 2/3) */}
                <div className="lg:col-span-2 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-3">
                        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="h-8 w-8 -ml-2 rounded-full hover:bg-slate-100">
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </Button>
                        <Badge variant="outline" className="text-slate-500">{billInfo?.bill_id || "N/A"}</Badge>
                        {billInfo?.committee && <Badge className="bg-blue-50 text-blue-700 hover:bg-blue-100">{billInfo.committee}</Badge>}
                    </div>
                    
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight mb-4">
                        {billInfo?.bill_name}
                    </h1>
                    
                    {/* Người đề xuất */}
                    <div className="flex items-start gap-2">
                        <UserPlus className="w-4 h-4 mt-1.5 text-slate-400 shrink-0" />
                        <div className="flex flex-wrap gap-2">
                            {proposersList.length > 0 ? proposersList.map((name, idx) => (
                                <span key={idx} className={`text-sm px-2 py-0.5 rounded border ${idx === 0 ? "bg-slate-800 text-white border-slate-800 font-medium" : "bg-white text-slate-600 border-slate-200"}`}>
                                    {name} {idx === 0 && "(대표)"}
                                </span>
                            )) : <span className="text-sm text-slate-400">발의자 정보 없음</span>}
                        </div>
                    </div>
                </div>

                {/* CỘT PHẢI: 2 Chỉ số thống kê (Chiếm 1/3) */}
                <div className="lg:col-span-1 grid grid-cols-2 gap-3">
                    {/* Stat 1: Speeches */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col items-center justify-center text-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                            <MessageSquare className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="text-2xl font-bold text-slate-900">{stats?.total_speeches ?? 0}</div>
                        <div className="text-xs text-slate-500 font-medium">전체 발언 (회)</div>
                    </div>

                    {/* Stat 2: Score */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col items-center justify-center text-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${totalCoopScore >= 50 ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                            <Activity className={`w-4 h-4 ${totalCoopScore >= 50 ? 'text-emerald-600' : 'text-rose-600'}`} />
                        </div>
                        <div className={`text-2xl font-bold ${totalCoopScore >= 50 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {formatScore(totalCoopScore)}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">평균 협력도</div>
                    </div>
                </div>
            </div>
        </div>

        {/* --- HÀNG 2: Grid chia đôi (Đảng phái vs Top 5 Hợp tác) --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left: Party Breakdown */}
            <Card className="shadow-sm border border-slate-200 flex flex-col h-full">
                <CardHeader className="border-b border-slate-100 pb-4">
                    <CardTitle className="text-lg text-slate-900 flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-600" />
                        정당별 협력도 
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 flex-1">
                    {hasPartyData ? (
                        <div className="space-y-5">
                            {stats.party_breakdown.map((p) => {
                                const theme = getPartyTheme(p.party_name);
                                const score = Number(p.avg_score ?? 0);
                                const percent = Math.min(100, Math.max(0, score));
                                
                                return (
                                    <div key={p.party_name} 
                                    className="relative group cursor-pointer" // 3. 🔥 Thêm cursor-pointer và group
                                    onClick={() => handlePartyClick(p.party_name)}>
                                        <div className="flex justify-between items-end mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-700 text-sm group-hover:text-blue-600 group-hover:underline transition-colors">{p.party_name}</span>
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{p.speech_count || p.member_count}회</span>
                                            </div>
                                            <div className="text-right">
                                                <span className={`font-bold ${theme.text}`}>{formatScore(score)}</span>
                                            </div>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 ${theme.bar}`} 
                                                style={{ width: `${percent}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500">데이터 부족</div>
                    )}
                </CardContent>
            </Card>

            {/* Right: Top 5 Cooperative Members */}
            <Card className="shadow-sm border border-slate-200 flex flex-col h-full">
                <CardHeader className="border-b border-slate-100 pb-4">
                    <CardTitle className="text-lg text-slate-900 flex items-center gap-2">
                        <Medal className="w-5 h-5 text-emerald-600" />
                        협력 의원 TOP 5 
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6 flex-1">
                    {topCoopMembers.length > 0 ? (
                        <div className="space-y-3">
                            {topCoopMembers.map((m, idx) => (
                                <div key={idx} 
                                onClick={() => handleMemberClick(m)}
                                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-100">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${idx === 0 ? 'bg-yellow-400 text-white shadow-sm' : 'bg-slate-200 text-slate-500'}`}>
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-slate-900">{m.member_name}</div>
                                            <div className="text-[10px] text-slate-500">{m.party_name}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-bold text-emerald-600">{formatScore(m.score)}</div>
                                        <div className="text-[10px] text-slate-400">{m.n_speeches}회 발언</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-slate-500">데이터 없음</div>
                    )}
                </CardContent>
            </Card>
        </div>

        {/* --- HÀNG 3: Top 5 Active Speakers (Những người nói nhiều nhất) --- */}
        {topActiveMembers.length > 0 && (
            <Card className="shadow-sm border border-slate-200 mt-6">
                <CardHeader className="border-b border-slate-100 pb-4 bg-orange-50/50">
                    <CardTitle className="text-lg text-slate-900 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-orange-600" /> 
                        가장 활발한 발언자 TOP 5 
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        {topActiveMembers.map((m, idx) => (
                            <div 
                            key={`${m.member_name}-${idx}`} 
                            onClick={() => handleMemberClick(m)}
                            className="flex flex-col items-center p-4 rounded-xl border border-slate-100 bg-white hover:shadow-md transition-shadow text-center">
                                <div className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm mb-2
                                    ${idx === 0 ? "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-200" : 
                                      idx === 1 ? "bg-slate-200 text-slate-700" :
                                      idx === 2 ? "bg-orange-100 text-orange-800" : "bg-slate-50 text-slate-400"
                                    }`}>
                                    {idx + 1}
                                </div>
                                <div className="font-bold text-slate-900">{m.member_name}</div>
                                <div className="text-xs text-slate-500 mb-2">{m.party_name}</div>
                                <Badge variant="secondary" className="bg-blue-50 text-blue-700 mb-1">
                                    <Mic className="w-3 h-3 mr-1" /> {m.n_speeches}회
                                </Badge>
                                <span className="text-[10px] text-slate-400">협력도 {formatScore(m.score)}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        )}

      </div>
    </div>
  );
}