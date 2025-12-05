// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, Clock, Star, FileText, TrendingUp, Activity, ChevronRight } from "lucide-react";

export function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login'); // Chưa đăng nhập thì đá về Login
      } else {
        setUser(session.user);
      }
    };
    getUser();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  // --- MOCK DATA (Dữ liệu giả lập cho đẹp) ---
  const recentActivities = [
    { id: 1, type: "search", target: "김철수 의원", date: "2024-05-30 14:20", result: "Hợp tác (95%)" },
    { id: 2, type: "bill", target: "AI 산업 육성법", date: "2024-05-29 09:15", result: "Thông qua (87%)" },
    { id: 3, type: "search", target: "이영희 의원", date: "2024-05-28 18:40", result: "Phi hợp tác (30%)" },
  ];

  const savedBills = [
    { id: 1, title: "인공지능 기본법", status: "Reviewing", probability: 92 },
    { id: 2, title: "데이터 보안 강화법", status: "Pending", probability: 45 },
  ];

  if (!user) return null; // Tránh flash màn hình

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* --- 1. WELCOME BANNER --- */}
      <div className="bg-slate-900 pt-12 pb-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                반갑습니다, <span className="text-blue-400">{user.user_metadata.full_name || user.email.split('@')[0]}</span>님! 👋
              </h1>
              <p className="text-slate-400">오늘도 데이터로 입법의 흐름을 파악해보세요.</p>
            </div>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="hidden md:flex bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white gap-2"
            >
              <LogOut className="w-4 h-4" /> 로그아웃
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-6 -mt-10">
        
        {/* --- 2. STATS CARDS (Thẻ Thống kê) --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard 
            icon={<Activity className="w-6 h-6 text-blue-600" />} 
            label="총 분석 횟수" 
            value="124회" 
            trend="+12% this week"
          />
          <StatCard 
            icon={<Star className="w-6 h-6 text-yellow-500" />} 
            label="관심 법안" 
            value="5건" 
            trend="2 updates new"
          />
          <StatCard 
            icon={<User className="w-6 h-6 text-purple-600" />} 
            label="멤버십 등급" 
            value="PRO Plan" 
            trend="Active"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* --- 3. RECENT ACTIVITY (Lịch sử - Cột lớn) --- */}
          <Card className="lg:col-span-2 border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-white rounded-t-xl">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-slate-400" /> 최근 활동 내역 (Lịch sử)
                </CardTitle>
                <Button variant="link" className="text-blue-600 text-sm">전체보기</Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {recentActivities.map((item) => (
                  <div key={item.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${item.type === 'search' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                        {item.type === 'search' ? <User className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800 group-hover:text-blue-700">{item.target}</div>
                        <div className="text-xs text-slate-500">{item.date}</div>
                      </div>
                    </div>
                    <div className="text-right">
                       <Badge variant="secondary" className="bg-slate-100 text-slate-600">{item.result}</Badge>
                    </div>
                  </div>
                ))}
              </div>
              {/* Nút hành động nhanh */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                 <Button 
                   onClick={() => navigate('/legislators')}
                   className="bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 w-full shadow-sm"
                 >
                   + 새로운 분석 시작하기
                 </Button>
              </div>
            </CardContent>
          </Card>

          {/* --- 4. SAVED BILLS (Luật quan tâm - Cột nhỏ) --- */}
          <Card className="border-slate-200 shadow-sm h-fit">
            <CardHeader className="border-b border-slate-100 bg-white rounded-t-xl">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" /> 관심 법안 (Saved)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {savedBills.map((bill) => (
                <div key={bill.id} className="bg-slate-50 p-4 rounded-lg border border-slate-100 hover:border-blue-200 transition-colors cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <Badge className="bg-white text-slate-600 border border-slate-200 text-[10px] px-1.5 h-5">
                      {bill.status}
                    </Badge>
                    <TrendingUp className={`w-4 h-4 ${bill.probability > 80 ? 'text-green-500' : 'text-orange-500'}`} />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm mb-2 line-clamp-2">{bill.title}</h4>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-600 h-full rounded-full" style={{ width: `${bill.probability}%` }}></div>
                  </div>
                  <div className="text-right text-xs text-blue-600 font-bold mt-1">
                    {bill.probability}% 유력
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

// Component con cho thẻ thống kê
function StatCard({ icon, label, value, trend }) {
  return (
    <Card className="border-0 shadow-lg hover:-translate-y-1 transition-transform duration-300">
      <CardContent className="p-6 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
          <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
          <p className="text-xs text-green-600 font-medium mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> {trend}
          </p>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}