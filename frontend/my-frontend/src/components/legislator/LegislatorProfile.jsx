import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Flag, CalendarDays, History, MapPin } from "lucide-react";

// Hàm tiện ích format ngày (YYYY.MM.DD)
const formatDate = (dateString) => {
  if (!dateString) return "현재";
  return dateString.split('T')[0].replace(/-/g, '.');
};

// Hàm kiểm tra xem có đang đương nhiệm không
const isCurrent = (endDate) => {
  if (!endDate) return true;
  return new Date(endDate) > new Date();
};

// Component con, nhận props là `data`
export function LegislatorProfile({ data }) {
  // Nếu chưa có data thì không render gì hoặc render loading skeleton
  if (!data) return null; 

  return (
    <Card className="w-full h-fit shadow-sm border border-slate-200 bg-white overflow-hidden">
      
      {/* HEADER: Tên & Ảnh/Icon */}
      <CardHeader className="pb-4 bg-slate-50/50 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl shadow-sm shrink-0 ${data.type === 'party' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
             {data.type === 'party' ? <Flag className="w-6 h-6" /> : <User className="w-6 h-6" />}
          </div>
          <div className="overflow-hidden">
            <CardTitle className="text-xl font-bold text-slate-900 truncate">{data.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
               <Badge variant="outline" className="bg-white text-slate-500 font-normal shrink-0">
                  {data.party}
               </Badge>
               {data.count && (
                 <span className="text-xs text-slate-400 border-l border-slate-300 pl-2 font-medium truncate">
                   {data.count}
                 </span>
               )}
            </div>
          </div>
        </div>
      </CardHeader>

      {/* CONTENT: Thông tin chi tiết */}
      <CardContent className="pt-5 space-y-6 text-sm">
        
        {/* Thông tin cơ bản */}
        <div className="space-y-2">
           <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 text-xs font-medium flex items-center gap-1">
                <MapPin className="w-3 h-3"/> 지역/본부
              </span>
              <span className="text-slate-800 text-sm font-medium text-right truncate flex-1 ml-2">{data.region}</span>
           </div>
           
           {data.type !== 'party' && (
             <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 text-xs font-medium">성별</span>
                <span className="text-slate-800 text-sm font-medium">{data.gender}</span>
             </div>
           )}
           
           <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 text-xs font-medium">당선방법</span>
              <span className="text-slate-800 text-sm font-medium">{data.method}</span>
           </div>
        </div>

        {/* Danh sách Ủy ban (Scrollable List) */}
        {data.committees && data.committees.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
             <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  소속 위원회 이력
                </span>
             </div>
             
             {/* Giới hạn chiều cao max-h-60 (khoảng 240px), quá thì scroll */}
             <div className="max-h-60 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                {data.committees.map((comm, index) => {
                  const active = isCurrent(comm.end_date);
                  return (
                    <div key={index} className={`p-2.5 rounded-lg border flex flex-col gap-1 ${active ? 'bg-blue-50/40 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                       <div className="flex justify-between items-start gap-2">
                          <span className={`font-semibold text-sm leading-tight ${active ? 'text-blue-700' : 'text-slate-700'}`}>
                             {comm.committee}
                          </span>
                          {active && <Badge className="h-5 px-1.5 text-[10px] bg-blue-600 hover:bg-blue-700 shrink-0">현직</Badge>}
                       </div>
                       
                       <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-1">
                          <CalendarDays className="w-3 h-3 opacity-70" />
                          <span>
                             {formatDate(comm.start_date)} ~ {formatDate(comm.end_date)}
                          </span>
                       </div>
                    </div>
                  );
                })}
             </div>
          </div>
        )}

        {/* Footer Stats */}
        <div className="pt-2 border-t border-slate-100">
           <div className="bg-slate-100/50 rounded-lg p-3 flex justify-between items-center">
              <span className="text-xs font-medium text-slate-500">관여 법안 Total</span>
              <span className="text-lg font-bold text-blue-600">{data.total_bills || 0}건</span>
           </div>
        </div>

      </CardContent>
    </Card>
  );
}