import React from 'react';
import { Badge } from "@/components/ui/badge";

// showParty = true (Hiện cột Đảng), = false (Ẩn cột Đảng - dùng khi đã lọc theo Đảng)
export function LegislatorListTable({ members, onMemberClick, showParty = true , showAIScore}) {

  // 메인 위원회명만 노출 (소위원회 정보 제거)
  const getMainCommitteeName = (committeeName) => {
    if (!committeeName) return committeeName;
    const base = String(committeeName).split("-")[0].trim();
    const cleaned = base.replace(/\s*(소위원회|소위).*/g, "").trim();
    return cleaned || base || committeeName;
  };

  // --- CẤU HÌNH CỘT ---
  const columns = [
    {
      header: "번호", 
      width: "0.6fr", 
      className: "text-center text-slate-400 font-mono text-xs",
      render: (member, index) => index + 1 
    },
    {
      header: "의원명", // Tên
      width: "1.5fr",
      className: "text-left font-bold text-slate-800 pl-4",
      render: (member) => member.name
    },
    {
      header: "정당", // Đảng
      width: "1.5fr",
      show: showParty, 
      className: "text-center",
      render: (member) => (member.party)
    },
    {
      header: "소속위원회", // Ủy ban
      width: "2.5fr",
      className: "text-center text-slate-600 truncate px-2",
      render: (member) => getMainCommitteeName(member.committee)
    },
    {
      header: "지역", // Khu vực
      width: "1.5fr",
      className: "text-center text-slate-600",
      render: (member) => member.region
    },
    {
      header: "성별", // Giới tính
      width: "0.8fr",
      className: "text-center text-slate-500",
      render: (member) => member.gender
    },
    {
      header: "당선횟수", // Số lần
      width: "1fr",
      className: "text-center text-slate-500",
      render: (member) => member.count
    },
    {
      header: "당선방법", // Cách bầu
      width: "1fr",
      className: "text-center text-slate-500",
      render: (member) => member.method
    },
    {
      header: "AI 점수", // Điểm số AI (Thêm vào để thấy kết quả)
      width: "1fr",
      className: "text-right pr-4",
      show: showAIScore,
      render: (member) => (
        <Badge variant="outline" className={`
            px-2 py-0.5 text-[10px] font-bold border
            ${member.score >= 70 ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-red-50 text-red-600 border-red-200'}
        `}>
            {member.score ? `${member.score}점` : '-'}
        </Badge>
      )
    }
  ];

  // Lọc và tạo grid template
  const visibleColumns = columns.filter(col => col.show !== false);
  const gridTemplate = visibleColumns.map(col => col.width).join(" ");

  return (
    <div className="w-full overflow-hidden bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col h-full">
      
      {/* HEADER */}
      <div 
        className="grid gap-2 px-0 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider items-center"
        style={{ gridTemplateColumns: gridTemplate }}
      >
        {visibleColumns.map((col, idx) => (
          <div key={idx} className={col.className}>
            {col.header}
          </div>
        ))}
      </div>

      {/* BODY */}
      <div className="overflow-y-auto flex-1">
        <div className="divide-y divide-slate-100">
          {members.map((member, index) => (
            <div 
              // Dùng index làm key dự phòng nếu không có id
              key={member.id || index} 
              className="grid gap-2 px-0 py-3 items-center hover:bg-blue-50/50 transition-colors cursor-pointer text-sm group"
              style={{ gridTemplateColumns: gridTemplate }}
              onClick={() => onMemberClick(member)}
            >
              {visibleColumns.map((col, idx) => (
                <div key={idx} className={col.className}>
                  {/* QUAN TRỌNG: Truyền index vào hàm render */}
                  {col.render(member, index)}
                </div>
              ))}
            </div>
          ))}
          
          {/* Hiển thị thông báo nếu không có dữ liệu */}
          {members.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              데이터가 없습니다. 
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
