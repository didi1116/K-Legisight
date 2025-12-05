import React from 'react';
import { Card } from "@/components/ui/card";
import { Users, ChevronRight } from "lucide-react";

export function PartyBillDetail({ members, onMemberClick }) {
  return (
    <Card className="border border-slate-200 shadow-sm bg-white overflow-hidden">
      <div className="bg-white border-b border-slate-100 px-6 py-4 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-slate-400" /> 
          참여 의원 목록 ( {members.length}명)
        </h3>
      </div>
      <div className="divide-y divide-slate-100">
        {members.map((member) => (
          <div 
            key={member.id} 
            className="group flex items-center justify-between px-6 py-4 hover:bg-blue-50 cursor-pointer transition-colors"
            onClick={() => onMemberClick(member)}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                <img src={member.img} alt={member.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="font-bold text-slate-800 group-hover:text-blue-700 transition-colors flex items-center gap-2">
                  {member.name}
                  <ChevronRight className="w-4 h-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-xs text-slate-500">{member.role}</div>
              </div>
            </div>
            <div className="text-right">
              <span className={`text-sm font-bold ${member.score >= 80 ? 'text-blue-600' : 'text-slate-600'}`}>
                {member.sentiment} ({member.score}점)
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}