import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Flag } from "lucide-react";

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
        <ProfileRow label={profile.type === 'party' ? "의석수" : "소속위원회"} value={profile.type === 'party' ? profile.count : profile.committee} />
        <ProfileRow label="지역/본부" value={profile.region} />
        
        {/* Chỉ hiện nếu là Người */}
        {profile.type !== 'party' && (
          <>
            <ProfileRow label="성별" value={profile.gender} />
            <ProfileRow label="당선횟수" value={profile.count} />
          </>
        )}
        
        <ProfileRow label="유형" value={profile.method} />

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