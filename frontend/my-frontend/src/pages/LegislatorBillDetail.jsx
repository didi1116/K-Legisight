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
} from "lucide-react";

const API_BASE =
  import.meta.env.VITE_API_URL || "http://localhost:8000";

export function LegislatorBillDetail() {
  const navigate = useNavigate();
  const location = useLocation();

  // state được truyền từ trang trước (Search / Table)
  const {
    legislatorName,
    billInfo,            // { billNumber, billName, date, score, role, meetingId, ... }
    legislatorProfile,   // profile của nghị sĩ (id / member_id / party / region / ...)
    aiSummary,           // optional: ai_summary từ backend (nếu có)
  } = location.state || {};

  const [speeches, setSpeeches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ---- hiển thị profile nghị sĩ ----
  const displayLegislator = {
    name: legislatorProfile?.name || legislatorName || "이름 정보 없음",
    party: legislatorProfile?.party || "소속 정당 정보 없음",
    region:
      legislatorProfile?.region ||
      legislatorProfile?.district ||
      "지역 정보 없음",
    committee: legislatorProfile?.committee || "소속 위원회 없음",
    gender: legislatorProfile?.gender || "-",
    count: legislatorProfile?.count || legislatorProfile?.elected_time || "정보 없음",
    method:
      legislatorProfile?.method ||
      legislatorProfile?.elected_type ||
      "정보 없음",
    member_id:
      legislatorProfile?.member_id || legislatorProfile?.id || null,
  };

  // ---- 정보 법안 (bills) từ API / Table ----
  const displayBill = {
    billNumber: billInfo?.billNumber || "-",
    billName: billInfo?.billName || "법안 제목 정보 없음",
    date: billInfo?.date || "-",
    score: billInfo?.scoreProbMean ?? 0,
    role: billInfo?.role || "-",
    meetingId: billInfo?.meetingId || null,
  };

  const memberId = displayLegislator.member_id;

  // ================================
  // 1) gọi API thật để lấy speeches
  // ================================
  useEffect(() => {
    if (!memberId) return;

    const fetchSpeeches = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.append("member_id", memberId);

        if (displayBill.meetingId) {
          params.append("meeting_id", displayBill.meetingId);
        }

        if (displayBill.billName && displayBill.billName !== "법안 제목 정보 없음") {
          params.append("bill_name", displayBill.billName);
        }

        const res = await fetch(
          `${API_BASE}/api/speeches?${params.toString()}`
        );
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data = await res.json();
        setSpeeches(data.speeches || []);
      } catch (err) {
        console.error("Error fetch speeches:", err);
        setError("발언 데이터를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchSpeeches();
  }, [memberId, displayBill.meetingId, displayBill.billName]);

  // ================================
  // 2) AI summary: dùng dữ liệu thật nếu được truyền vào
  // ================================
  const aiSummaryText = aiSummary || null;

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

        {/* 1. 카드: 법안 + 의원 정보 */}
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden mb-6">
          {/* 위: 법안 정보 */}
          <div className="p-6 border-b border-slate-100 bg-white">
            <div className="flex items-center gap-2 text-slate-500 text-sm font-mono mb-2">
              <Badge
                variant="secondary"
                className="bg-slate-100 text-slate-600 font-bold"
              >
                {displayBill.billNumber}
              </Badge>
              <span className="text-slate-300">|</span>
              <span>{displayBill.date} 제안</span>
              <span className="text-slate-300">|</span>
              <span className="text-blue-600 font-medium">
                {displayBill.role}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight mb-2">
              {displayBill.billName}
            </h1>
          </div>

          {/* 아래: 의원 정보 */}
          <div className="px-6 py-4 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 shadow-sm">
                <User className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-slate-800">
                    {displayLegislator.name}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-blue-700 bg-blue-50 border-blue-200"
                  >
                    {displayLegislator.party}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500 mt-0.5 flex-wrap">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {displayLegislator.region}
                  </span>
                  <span className="text-slate-300">|</span>
                  <span>{displayLegislator.committee}</span>
                  <span className="text-slate-300">|</span>
                  <span>{displayLegislator.gender}</span>
                  <span className="text-slate-300">|</span>
                  <span>{displayLegislator.count}</span>
                  <span className="text-slate-300">|</span>
                  <span>{displayLegislator.method}</span>
                </div>
              </div>
            </div>

            {/* AI Score: nếu muốn dùng score thật từ billInfo */}
            <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
              <div className="text-right">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  AI Score
                </div>
                <div
                  className={`text-xl font-black leading-none ${
                    displayBill.score >= 70
                      ? "text-blue-600"
                      : "text-red-600"
                  }`}
                >
                  {displayBill.score}{" "}
                  <span className="text-xs text-slate-400 font-normal">
                    
                  </span>
                </div>
              </div>
              <div
                className={`w-2 h-8 rounded-full ${
                  displayBill.score >= 70 ? "bg-blue-500" : "bg-red-500"
                }`}
              ></div>
            </div>
          </div>
        </Card>

        {/* 2. AI Summary: chỉ hiện nếu có dữ liệu thật */}
        {aiSummaryText && (
          <div className="bg-slate-900 text-white rounded-xl p-6 shadow-lg flex gap-4 items-start mb-6">
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

        {/* 3. 발언 리스트: 완전 데이터 thật */}
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
          <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Quote className="w-4 h-4 text-slate-400" /> 발언 상세 기록
            </h3>
            <Badge
              variant="outline"
              className="font-normal text-slate-500 bg-slate-50"
            >
              Total: {speeches.length}
            </Badge>
          </div>

          {loading && (
            <div className="px-6 py-4 text-sm text-slate-500">
              불러오는 중...
            </div>
          )}

          {error && !loading && (
            <div className="px-6 py-4 text-sm text-red-500">{error}</div>
          )}

          {!loading && !error && (
            <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
              {speeches.map((speech, index) => (
                <div
                  key={speech.id}
                  className="group flex gap-4 px-6 py-4 hover:bg-slate-50 transition-colors items-start text-sm"
                >
                  <div className="w-6 text-center pt-0.5 text-slate-300 font-mono text-xs shrink-0">
                    {index + 1}
                  </div>
                  <div className="flex-1 pt-0.5">
                    <p className="text-slate-700 leading-relaxed group-hover:text-slate-900">
                      {speech.text || "(발언 내용 없음)"}
                    </p>
                  </div>
                  <div className="w-20 text-right shrink-0">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border bg-slate-50 text-slate-600 border-slate-200">
                      {speech.sentiment || "중립"}
                    </span>
                  </div>
                </div>
              ))}

              {speeches.length === 0 && (
                <div className="px-6 py-4 text-sm text-slate-500">
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
