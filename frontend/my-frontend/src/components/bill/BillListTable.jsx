import React from 'react';
import { Badge } from "@/components/ui/badge";

export function BillListTable({ bills, onBillClick }) {
  
  // 메인 위원회명만 노출
  const getMainCommitteeName = (committeeName) => {
    if (!committeeName) return committeeName;
    const base = String(committeeName).split("-")[0].trim();
    const cleaned = base.replace(/\s*(소위원회|소위).*/g, "").trim();
    return cleaned || base || committeeName;
  };

  // --- 컬럼 설정 ---
  const columns = [
    {
      header: "번호",
      width: "0.7fr",
      className: "text-center text-slate-400 font-mono text-xs",
      render: (bill, index) => index + 1
    },
    {
      header: "법안명",
      width: "3.2fr",
      className: "text-left font-bold text-slate-800 pl-4",
      render: (bill) => bill.bill_info?.bill_name || "법안명 없음"
    },
    {
      header: "의안번호",
      width: "1.6fr",
      className: "text-center text-slate-600 font-mono",
      render: (bill) => bill.bill_info?.bill_id || "-"
    },
    {
      header: "발의자",
      width: "1.8fr",
      className: "text-center text-slate-600",
      render: (bill) => bill.bill_info?.proposer_name || "정보 없음"
    },
    {
      header: "제출유형",
      width: "1.2fr",
      className: "text-center text-slate-500",
      render: (bill) => bill.bill_info?.proposer_type || "-"
    },
    {
      header: "발언 수",
      width: "1.2fr",
      className: "text-center text-slate-500",
      render: (bill) => bill.stats?.total_speeches || 0
    },
    {
      header: "협력도",
      width: "1.3fr",
      className: "text-right pr-4",
      render: (bill) => (
        <Badge 
          variant="outline"
          className={`px-2 py-0.5 text-xs font-bold border ${
            (bill.stats?.total_cooperation || 0) > 0.1 
              ? 'bg-green-50 text-green-700 border-green-200'
              : (bill.stats?.total_cooperation || 0) < -0.1
              ? 'bg-red-50 text-red-700 border-red-200'
              : 'bg-slate-50 text-slate-700 border-slate-200'
          }`}
        >
          {(bill.stats?.total_cooperation || 0).toFixed(4)}
        </Badge>
      )
    }
  ];

  const gridTemplate = columns.map(col => col.width).join(" ");

  return (
    <div className="w-full overflow-hidden bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col h-full">
      
      {/* HEADER */}
      <div 
        className="grid gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider items-center"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {columns.map((col, idx) => (
          <div key={idx} className={col.className}>
            {col.header}
          </div>
        ))}
      </div>

      {/* BODY */}
      <div className="overflow-y-auto flex-1">
        <div className="divide-y divide-slate-100">
          {bills.map((bill, index) => (
            <div 
              key={index}
              className="grid gap-2 px-4 py-3 items-center hover:bg-blue-50/50 transition-colors cursor-pointer text-sm group"
              style={{ gridTemplateColumns: gridTemplate }}
              onClick={() => onBillClick(bill)}
            >
              {columns.map((col, idx) => (
                <div key={idx} className={col.className}>
                  {col.render(bill, index)}
                </div>
              ))}
            </div>
          ))}
          
          {/* 데이터 없음 */}
          {bills.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              데이터가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
