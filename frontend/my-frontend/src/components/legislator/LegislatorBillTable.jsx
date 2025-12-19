// src/components/legislator/LegislatorBillTable.jsx
import React from 'react';
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Calendar, User } from "lucide-react";

export function LegislatorBillTable({ bills, onBillClick, showProposer = true }) {
  // proposer 有/無 에 따라 grid column 개수 변경
  const gridClass = showProposer
    ? "grid-cols-[40px_1.4fr_1.2fr_4fr_1.4fr_1.4fr_0.9fr]"   // 7 cols
    : "grid-cols-[40px_1.4fr_4.5fr_1.4fr_1fr_0.9fr]";      // 6 cols

  return (
    <Card className="lg:col-span-3 shadow-sm border border-slate-200 flex flex-col h-[700px]">
      <CardHeader className="border-b px-6 py-4 bg-white">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="w-5 h-5 text-slate-500" />
          관련 법안 분석 결과
          <Badge
            variant="secondary"
            className="ml-2 bg-slate-100 text-slate-600"
          >
            Total: {bills?.length || 0}
          </Badge>
        </CardTitle>
      </CardHeader>

      {/* HEADER */}
      <div
        className={`grid ${gridClass} gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider text-center`}
      >
        <div>번호</div>
        {showProposer && <div>대표발의</div>}
        <div>의안번호</div>
        <div className="text-left">의안명</div>
        <div>제안일자</div>
        <div>AI 분석</div>
        <div className="text-right pr-2">협력지수</div>
      </div>

      {/* BODY */}
      <div className="overflow-y-auto flex-1 p-0">
        {(!bills || bills.length === 0) ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400">
            관련 법안 데이터가 없습니다.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {bills.map((bill, index) => (
              <div
                key={bill.id ?? index}
                className={`grid ${gridClass} gap-4 px-6 py-3 items-center hover:bg-blue-50/50 transition-colors cursor-pointer text-sm group text-center`}
                onClick={() => onBillClick?.(bill)}
              >
                {/* 번호 */}
                <div className="text-slate-500 text-xs">{index + 1}</div>

                {/* 대표발의 (옵션) */}
                {showProposer && (
                  <div className="text-left font-medium text-slate-700 truncate flex items-center gap-1.5">
                    <User className="w-3 h-3 text-slate-400" />
                    {bill.proposer || "-"}
                  </div>
                )}

                {/* 의안번호 */}
                <div className="text-slate-500 font-mono text-xs">
                  {bill.billNumber || "-"}
                </div>

                {/* 의안명 */}
                <div
                  className="font-medium text-slate-800 truncate group-hover:text-blue-700 text-left"
                  title={bill.billName}
                >
                  {bill.billName || "(제목 없음)"}
                </div>

                {/* 제안일자 */}
                <div className="text-slate-500 flex items-center justify-center gap-1 text-xs">
                  <Calendar className="w-3 h-3" />
                  {bill.date || "-"}
                </div>

                {/* AI 분석 (stance + 색깔 점) */}
                <div className="flex justify-center items-center gap-2">
                  {/*
                    색상은 sentiment 값으로 결정:
                    협력  -> 파랑
                    비협력 -> 빨강
                    나머지 -> 회색
                  */}
                  <span
                    className={`font-bold text-xs ${
                      bill.sentiment === "협력"
                        ? "text-blue-600"
                        : bill.sentiment === "비협력"
                        ? "text-red-600"
                        : "text-slate-600"
                    }`}
                  >
                    {bill.sentiment || "-"}
                  </span>
                  <div
                    className={`w-2 h-2 rounded-full ${
                      bill.sentiment === "협력"
                        ? "bg-blue-500"
                        : bill.sentiment === "비협력"
                        ? "bg-red-500"
                        : "bg-slate-400"
                    }`}
                  />
                </div>
        

                {/* 점수 소수점 n자리*/}
                <div className="text-right pr-2 text-xs font-mono text-slate-700">
                  {typeof bill.scoreProbMean === "number"
                    ? `${bill.scoreProbMean.toFixed(3)}`
                    : "-"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
