// src/pages/PartyBillMembers.jsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, ChevronRight, FileText } from "lucide-react";
import { LegislatorListTable } from '@/components/legislator/LegislatorListTable';

export function PartyBillMembers() {
  const navigate = useNavigate();
  const location = useLocation();
  const { partyName, billInfo } = location.state || {};
  

  // Dữ liệu giả lập: Các thành viên trong đảng tham gia luật này
  const members = Array.from({ length: 8 }).map((_, i) => ({
    id: i + 1,
    name: i === 0 ? "박찬대" : `의원 ${i + 1}`,
    role: i === 0 ? "대표발의" : "공동발의",
    sentiment: i % 4 === 0 ? "적극 찬성" : "찬성",
    score: i % 4 === 0 ? 98 : 85,
    img: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`
  }));

  const goToLegislatorBillDetail = (member) => {
    // Chuyển sang trang Chi tiết lời nói (Bước cuối)
    navigate('/legislatorbilldetail', {
      state: {
        legislatorName: member.name,
        legislatorParty: partyName,
        billInfo: { ...billInfo, score: member.score, summarySentiment: member.sentiment } // Cập nhật điểm riêng của ông này
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans flex flex-col items-center">
      <div className="max-w-4xl w-full space-y-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="pl-0 text-slate-500"><ArrowLeft className="w-4 h-4 mr-1"/> 목록으로 돌아가기</Button>

        {/* Header: Tên Dự Luật + Tên Đảng */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
           <Badge className="bg-purple-100 text-purple-700 mb-2 hover:bg-purple-100">{partyName} 소속 참여 의원</Badge>
           <h1 className="text-2xl font-bold text-slate-900">{billInfo?.billName}</h1>
           <p className="text-slate-500 text-sm mt-1">이 법안에 대해 발언하거나 투표한 의원 목록입니다.</p>
        </div>

        {/* Danh sách thành viên */}
        <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <span className="font-bold text-slate-700 text-sm">참여 의원 ({members.length}명)</span>
            </div>
            <LegislatorListTable 
              members={members} 
              
              onMemberClick={goToLegislatorBillDetail}
              showParty={false} 
            />
        </Card>
      </div>
    </div>
  );
}