// src/pages/LegislatorBillDetail.jsx
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  User,
  Quote,
  Bot,
  MapPin,
  Loader2, // 🔥 Import thêm icon loading
} from "lucide-react";
import { supabase } from '@/lib/supabaseClient';

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

export function LegislatorBillDetail() {
  const navigate = useNavigate();
  const location = useLocation();

  // state được truyền từ trang trước
  const {
    legislatorName,
    billInfo,            
    legislatorProfile,   
    aiSummary,           
  } = location.state || {};

  const [speeches, setSpeeches] = useState([]);
  const [loadingSpeeches, setLoadingSpeeches] = useState(false); // Đổi tên cho rõ ràng
  const [speechError, setSpeechError] = useState(null);
  const [apiAiSummary, setApiAiSummary] = useState(null);

  // 🔥 1. State quản lý việc load profile
  // Khởi tạo state profile bằng dữ liệu cũ để lấy ID, nhưng đánh dấu là "đang load" để lấy dữ liệu mới
  const [fullProfile, setFullProfile] = useState(legislatorProfile || {});
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  // Lấy Member ID an toàn
  const memberId = fullProfile.member_id || fullProfile.id || legislatorProfile?.member_id;

  // ================================
  // 🔥 2. Gọi API lấy thông tin chi tiết nghị sĩ (Ưu tiên gọi ngay)
  // ================================
  useEffect(() => {
    if (!memberId) {
        setIsProfileLoading(false);
        return;
    }

    const fetchLegislatorProfile = async () => {
      setIsProfileLoading(true); // Bắt đầu load
      try {
        const apiUrl = `${API_BASE}/api/legislators/${memberId}/detail`;
        const res = await fetch(apiUrl);
        
        if (res.ok) {
          const data = await res.json();
          // Cập nhật profile mới nhất từ API
          if (data.profile) {
            setFullProfile(prev => ({ 
                ...prev, 
                ...data.profile,
                region: data.profile.district || data.profile.region,
                count: data.profile.elected_count, 
                method: data.profile.elected_type,
                committee: data.profile.committee // Đảm bảo lấy committee mới nhất
            }));
          }
        }
      } catch (err) {
        console.error("❌ Lỗi fetch profile:", err);
      } finally {
        // Kết thúc load bất kể thành công hay thất bại
        setIsProfileLoading(false);
      }
    };

    fetchLegislatorProfile();
  }, [memberId]);
  

  // ---- Biến hiển thị (Dùng dữ liệu từ fullProfile) ----
  const displayLegislator = {
    name: fullProfile.name || fullProfile.member_name || legislatorName || "이름 정보 없음",
    party: fullProfile.party || fullProfile.party_name || "소속 정당 정보 없음",
    region: fullProfile.region || fullProfile.district || "-",
    committee: fullProfile.committee || "-",
    gender: fullProfile.gender || "-",
    count: fullProfile.count || fullProfile.elected_time || fullProfile.elected_count || "-",
    method: fullProfile.method || fullProfile.elected_type || "-",
    member_id: memberId,
  };

  const displayBill = {
    billNumber: billInfo?.billNumber || "-",
    billName: billInfo?.billName || "법안 제목 정보 없음",
    date: billInfo?.date || "-",
    score: billInfo?.scoreProbMean ?? 0,
    role: billInfo?.role || "-",
    meetingId: billInfo?.meetingId || null
  };

  // ================================
  // 3) Gọi API lấy speeches
  // ================================
  useEffect(() => {
    if (!memberId || !displayBill.billNumber) return;

    const fetchSpeeches = async () => {
      try {
        setLoadingSpeeches(true);
        setSpeechError(null);

        const res = await fetch(
          `${API_BASE}/api/legislators/${memberId}/bills/${displayBill.billNumber}/speeches`
        );
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        setSpeeches(data.speeches || []);
        setApiAiSummary(data.aiSummary || null);
      } catch (err) {
        console.error("Error fetch speeches:", err);
        setSpeechError("발언 데이터를 불러오지 못했습니다.");
      } finally {
        setLoadingSpeeches(false);
      }
    };

    fetchSpeeches();
  }, [memberId, displayBill.billNumber]);

  

  // Logic Stance Label
  const aiSummaryText = apiAiSummary || null;
  const rawScore = typeof displayBill.score === 'number' ? displayBill.score : null;
  const stanceLabel = rawScore === null ? '-' : rawScore >= 0.05 ? '협력' : rawScore <= -0.05 ? '비협력' : '중립';

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col">
      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="pl-0 mb-4 hover:bg-transparent hover:text-blue-600 text-slate-500 h-auto py-0"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> 목록으로 돌아가기
        </Button>

        {/* 1. CARD: THÔNG TIN NGHỊ SĨ & DỰ LUẬT */}
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden mb-6">
          {/* Header: Tên Bill */}
          <div className="p-6 border-b border-slate-100 bg-white">
            <div className="flex items-center gap-2 text-slate-500 text-sm font-mono mb-2">
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold">
                {displayBill.billNumber}
              </Badge>
              <span className="text-slate-300">|</span>
              <span>{displayBill.date} 제안</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight mb-2">
              {displayBill.billName}
            </h1>
          </div>

          {/* Body: Thông tin Nghị sĩ (Phần này quan trọng cần xử lý Loading) */}
          <div className="px-6 py-4 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-12 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 shadow-sm">
                <User className="w-6 h-6" />
              </div>
              
              <div>
                {/* Tên & Đảng (Luôn hiện vì có sẵn từ trang trước) */}
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-slate-800">
                    {displayLegislator.name}
                  </span>
                  <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200">
                    {displayLegislator.party}
                  </Badge>
                </div>

                {/* 🔥 PHẦN LOADING: Nếu đang fetch API thì hiện loading, xong mới hiện text */}
                {isProfileLoading ? (
                   <div className="flex items-center gap-2 mt-2 text-sm text-slate-400 animate-pulse">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>상세 정보 불러오는 중...</span>
                   </div>
                ) : (
                   <div className="flex items-center gap-3 text-sm text-slate-500 mt-0.5 flex-wrap animate-in fade-in duration-300">
                     <span className="flex items-center gap-1">
                       <MapPin className="w-3 h-3" /> {displayLegislator.region}
                     </span>
                     <span className="text-slate-300">|</span>
                     <span className="font-medium text-slate-700">{displayLegislator.committee}</span>
                     <span className="text-slate-300">|</span>
                     <span>{displayLegislator.gender}</span>
                     <span className="text-slate-300">|</span>
                     <span>{displayLegislator.count}</span>
                     <span className="text-slate-300">|</span>
                     <span>{displayLegislator.method}</span>
                   </div>
                )}
              </div>
            </div>

            {/* Điểm số (Score) */}
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    협력도 지수
                  </div>
                  <div className={`text-xl font-black leading-none ${
                        stanceLabel === '협력' ? 'text-blue-600' : 
                        stanceLabel === '비협력' ? 'text-red-600' : 'text-slate-600'
                    }`}>
                    {typeof displayBill.score === 'number' ? displayBill.score.toFixed(3) : displayBill.score}
                  </div>
                </div>
                
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                    stanceLabel === '협력' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                    stanceLabel === '비협력' ? 'bg-red-50 text-red-700 border-red-200' : 
                    'bg-slate-50 text-slate-600 border-slate-200'
                }`}>
                  {stanceLabel}
                </span>

                <div className={`w-2 h-8 rounded-full ${
                    stanceLabel === '협력' ? 'bg-blue-500' : 
                    stanceLabel === '비협력' ? 'bg-red-500' : 'bg-slate-400'
                }`}></div>
            </div>
          </div>
        </Card>

        {/* 2. AI Summary */}
        {aiSummaryText && (
          <div className="bg-slate-900 text-white rounded-xl p-6 shadow-lg flex gap-4 items-start mb-6 animate-in slide-in-from-bottom-2 duration-500">
            <div className="p-3 bg-blue-600 rounded-full shrink-0 shadow-lg shadow-blue-900/50">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-blue-300 mb-2 flex items-center gap-2">
                AI 요약 리포트
              </h3>
              <p className="text-slate-300 leading-relaxed text-sm md:text-base">
                {aiSummaryText}
              </p>
            </div>
          </div>
        )}

        {/* 3. Speech List */}
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
          <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Quote className="w-4 h-4 text-slate-400" /> 발언 상세 기록
            </h3>
            <Badge variant="outline" className="font-normal text-slate-500 bg-slate-50">
              Total: {speeches.length}
            </Badge>
          </div>

          {loadingSpeeches && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2 text-slate-300" />
                <span className="text-sm">데이터 불러오는 중...</span>
            </div>
          )}

          {speechError && !loadingSpeeches && (
            <div className="px-6 py-8 text-sm text-red-500 text-center bg-red-50">{speechError}</div>
          )}

          {!loadingSpeeches && !speechError && (
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {speeches.map((speech, index) => (
                <div key={speech.speech_id || index} className="group flex gap-4 px-6 py-4 hover:bg-slate-50 transition-colors items-start text-sm">
                  <div className="w-6 text-center pt-0.5 text-slate-300 font-mono text-xs shrink-0">{index + 1}</div>
                  <div className="flex-1 pt-0.5">
                    <p className="text-slate-700 leading-relaxed group-hover:text-slate-900">
                      {speech.speech_text || "(발언 내용 없음)"}
                    </p>
                    {speech.score_prob !== undefined && (
                      <div className="mt-2 text-xs text-slate-500">
                        <span className="font-medium">협력도: </span>
                        <span className={`font-bold ${
                            speech.score_prob > 0.1 ? "text-blue-600" : 
                            speech.score_prob < -0.1 ? "text-red-600" : "text-slate-600"
                        }`}>
                            {speech.score_prob.toFixed(4)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="w-20 text-right shrink-0">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                        speech.sentiment_label === "1" ? "bg-blue-50 text-blue-700 border-blue-200" :
                        speech.sentiment_label === "0" ? "bg-red-50 text-red-700 border-red-200" :
                        "bg-slate-50 text-slate-600 border-slate-200"
                    }`}>
                        {speech.sentiment_label === "1" ? "협력" : speech.sentiment_label === "0" ? "비협력" : "중립"}
                    </span>
                  </div>
                </div>
              ))}
              {speeches.length === 0 && (
                 <div className="py-12 text-center text-slate-400 bg-slate-50/50">
                    이 법안에 대한 발언 데이터가 없습니다.
                 </div>
              )}
            </div>
          )}
        </Card>
      </main>
    </div>
  );
}