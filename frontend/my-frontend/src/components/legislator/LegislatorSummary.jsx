import React from 'react';
import { Users } from "lucide-react";

export function LegislatorSummary({ total, current }) {
  // Tính phần trăm
  const percentage = total > 0 ? ((current / total) * 100).toFixed(2) : 0;

  return (
    <div className="border border-slate-200 bg-white p-6 flex flex-col md:flex-row items-center justify-between shadow-sm mb-6">
      
      {/* Bên trái: Text thông tin */}
      <div className="flex items-center gap-6 w-full md:w-auto">
        <div className="hidden md:flex p-4 bg-slate-100 rounded-lg">
          {/* Icon Tòa nhà Quốc hội giả lập */}
          <Users className="w-10 h-10 text-blue-900" /> 
        </div>
        <div className="flex-1">
          <div className="text-xl font-bold text-slate-800 mb-2">
            총 <span className="text-slate-900">{total}명</span>의 의원 중 / 검색결과 <span className="text-red-600 text-2xl">{current}명</span>
          </div>
          <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-md text-sm font-medium border border-blue-100">
            조회하신 국회의원의 전체 국회의원 비중은 <span className="font-bold text-lg">{percentage}%</span> 입니다.
          </div>
        </div>
      </div>

      {/* Bên phải: Biểu đồ tròn (Pie Chart) dùng CSS */}
      <div className="hidden md:flex items-center gap-6 pr-8 border-l border-slate-100 pl-8 ml-4 h-full">
        {/* Vòng tròn biểu đồ */}
        <div 
            className="relative w-24 h-24 rounded-full flex items-center justify-center shadow-inner border border-slate-100 shrink-0"
            style={{ 
                background: `conic-gradient(#3b82f6 0% ${percentage}%, #e2e8f0 ${percentage}% 100%)` 
            }}
        >
           <div className="w-16 h-16 bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
             <span className="text-[10px] text-slate-400 font-medium">비중</span>
             <span className="text-sm font-bold text-slate-800">{Math.round(percentage)}%</span>
           </div>
        </div>

        {/* Chú thích */}
        <div className="flex flex-col gap-1 text-xs text-slate-500 font-medium">
          <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div> 
              <span>검색 ({percentage}%)</span>
          </div>
          <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-slate-200 rounded-full"></div> 
              <span>전체</span>
          </div>
        </div>
      </div>

    </div>
  );
}