import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Flag, CalendarDays } from "lucide-react";

export function LegislatorProfile({ profile }) {
  if (!profile) return null;

  return (
    <Card className="lg:col-span-1 h-fit shadow-sm border border-slate-200">
      <CardHeader className="pb-3 bg-slate-100/50 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${profile.type === 'party' ? 'bg-purple-100' : 'bg-blue-100'}`}>
             {profile.type === 'party' ? <Flag className="w-6 h-6 text-purple-600" /> : <User className="w-6 h-6 text-blue-600" />}
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-slate-800">{profile.name}</CardTitle>
            <p className="text-sm text-slate-500">{profile.party}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-4 text-sm">
        {/* Logic hiển thị linh hoạt */}
        {/* --- PHẦN THAY ĐỔI: Logic hiển thị Ủy ban --- */}
        
        
        <ProfileRow label="지역/본부" value={profile.region} />
        
        {/* Chỉ hiện nếu là Người */}
        {profile.type !== 'party' && (
          <>
            <ProfileRow label="성별" value={profile.gender} />
            <ProfileRow label="당선횟수" value={profile.count} />
          </>
        )}
        
        <ProfileRow label="유형" value={profile.method} />
        {profile.type === 'party' ? (
          <ProfileRow label="의석수" value={profile.count} />
        ) : (
          // Nếu là người, hiển thị danh sách lịch sử ủy ban
          <div className="flex justify-between items-start py-1.5 gap-3 border-b border-slate-50">
                <span className="text-slate-500 w-20 shrink-0 text-left text-xs font-medium pt-1">소속위원회</span>
                <div className="flex-1 flex flex-col gap-2">
                    {/* Kiểm tra nếu committees là mảng thì map, không thì hiện text cũ */}
                    {Array.isArray(profile.committees) && profile.committees.length > 0 ? (
                      profile.committees.map((item, index) => (
                        <div key={index} className="flex flex-col items-end">
                                <span className="font-semibold text-slate-800 text-right text-sm">{item.name}</span>
                                <span className="text-[11px] text-slate-400">
                                    {formatDate(item.startDate)} ~ {formatDate(item.endDate)}
                                </span>
                            </div>
                        ))
                      ) : (
                        <span className="font-semibold text-slate-800 text-right text-sm">{profile.committee || "N/A"}</span>
                      )}
                </div>
            </div>
        )}

        <ProfileRow label="협력 법안수" value = {profile.name} />
        <ProfileRow label="비협력 법안수" value = {profile.name} />
        <ProfileRow label="중립 법안수" value = {profile.name} />
        

        <div className="pt-4 mt-4 border-t border-slate-100">
          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">분석 대상 법안</span>
            <span className="text-lg font-bold text-blue-600">{profile.total_bills}건</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileRow({ label, value }) {
  return (
    <div className="flex justify-between items-start py-1.5 gap-3 border-b border-slate-50 last:border-0">
      <span className="text-slate-500 w-20 shrink-0 text-left text-xs font-medium pt-0.5">{label}</span>
      <span className="font-semibold text-slate-800 text-right flex-1 text-sm break-all leading-tight">{value}</span>
    </div>
  );
}

function formatDate(dateString) {
    if (!dateString) return '';
    // Format: 2022-08-02 -> 2022.08
    // Nếu string không có dấu gạch ngang, trả về nguyên gốc
    const parts = dateString.split('-');
    if (parts.length >= 2) {
        return `${parts[0]}.${parts[1]}`;
    }
    return dateString; 
}