import React from 'react';
import { Link } from 'react-router-dom';
import { User, Flag, Scale, ScrollText, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function SentimentLanding() {
  
  // Cấu hình 4 ô chọn
  const menuItems = [
    {
      id: 1,
      title: "국회의원", 
      eng: "Member",
      desc: "개별 의원의 성향과 협력도 분석",
      icon: User,
      color: "bg-blue-100 text-blue-600",
      hoverBorder: "hover:border-blue-500",
      path: "/sentiment/member" // Link tới trang chi tiết
    },
    {
      id: 2,
      title: "정당", 
      eng: "Party",
      desc: "정당별 단합도 및 주요 쟁점 파악",
      icon: Flag, // Hoặc Building
      color: "bg-red-100 text-orange-600",
      hoverBorder: "hover:border-orange-500",
      path: "/sentiment/party"
    },
    {
      id: 3,
      title: "위원회", 
      eng: "Committee",
      desc: "상임위별 회의 분위기 및 키워드",
      icon: Scale,
      color: "bg-emerald-100 text-emerald-600",
      hoverBorder: "hover:border-emerald-500",
      path: "/sentiment/committee"
    },
    {
      id: 4,
      title: "법안", 
      eng: "Bill",
      desc: "특정 법안의 입법 과정 추적",
      icon: ScrollText,
      color: "bg-purple-100 text-purple-600",
      hoverBorder: "hover:border-purple-500",
      path: "/sentiment/bill"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      
      {/* Header đơn giản */}
      <div className="text-center mb-12 max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
          분석 대상을 선택하세요
        </h1>
        <p className="text-slate-500 text-lg">
          K-LegiSight는 4가지 관점에서 심층적인 감성 분석 데이터를 제공합니다.
        </p >
        <p className="text-slate-500">
            원하시는 항목을 클릭해주세요.</p>
      </div>

      {/* Grid 4 ô (2x2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        {menuItems.map((item) => (
          <Link to={item.path} key={item.id} className="group">
            <Card className={`h-full border-2 border-transparent transition-all duration-300 shadow-sm hover:shadow-xl ${item.hoverBorder} cursor-pointer`}>
              <CardContent className="p-8 flex items-start gap-6">
                
                {/* Icon Box */}
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 ${item.color} transition-transform group-hover:scale-110 duration-300`}>
                  <item.icon className="w-8 h-8" strokeWidth={2.5} />
                </div>

                {/* Text Content */}
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-1">
                    {item.title}
                    <span className="text-sm font-normal text-slate-400 uppercase tracking-wider">{item.eng}</span>
                  </h2>
                  <p className="text-slate-500 leading-relaxed mb-4">
                    {item.desc}
                  </p>
                  
                  {/* Fake Button / Arrow */}
                  <div className="flex items-center text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                    분석 보기
                    <ArrowRight className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}