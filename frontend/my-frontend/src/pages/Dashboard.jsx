// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LogOut, User, Clock, Star, FileText, TrendingUp, Activity, Loader2 } from "lucide-react";

// URL Backend
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // State lưu dữ liệu
  const [dashboardData, setDashboardData] = useState({
    user_info: {},
    stats: { total_activities: 0, total_saved: 0, trend: "-" },
    recent_activities: [],
    saved_bills: []
  });

  useEffect(() => {
    const fetchData = async () => {
      // 1. Lấy session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/login');
        return;
      }

      // 2. Gọi API Backend
      try {
        const res = await fetch(`${API_BASE}/api/dashboard/me`, {
          headers: {
            "Authorization": `Bearer ${session.access_token}`
          }
        });

        if (res.ok) {
          const data = await res.json();
          setDashboardData(data);
        } else {
            console.error("Dashboard API Error:", res.status);
        }
      } catch (error) {
        console.error("Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4"/>
        <p className="text-slate-500">데이터를 불러오는 중...</p>
      </div>
    );
  }

  // Format ngày tháng
  const formatDate = (isoString) => {
    if (!isoString) return "";
    return new Date(isoString).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' });
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-slate-900 pt-12 pb-20 px-6">
        <div className="container mx-auto max-w-6xl flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                반갑습니다, <span className="text-blue-400">{dashboardData.user_info.name || "User"}</span>님! 👋
              </h1>
              <p className="text-slate-400">오늘도 데이터로 입법의 흐름을 파악해보세요.</p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="bg-slate-800 border-slate-700 text-slate-300">
              <LogOut className="w-4 h-4 mr-2" /> 로그아웃
            </Button>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-6 -mt-10">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard icon={<Activity className="text-blue-600"/>} label="활동 로그" value={`${dashboardData.stats.total_activities}회`} trend="Total Actions" />
          <StatCard icon={<Star className="text-yellow-500"/>} label="관심 항목" value={`${dashboardData.stats.total_saved}건`} trend="Saved Items" />
          <StatCard icon={<User className="text-purple-600"/>} label="Plan" value="Basic" trend="Free Tier" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Recent Activity List */}
          <Card className="lg:col-span-2 border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100 bg-white rounded-t-xl">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" /> 최근 활동 내역
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100">
                {dashboardData.recent_activities.length > 0 ? (
                  dashboardData.recent_activities.map((item) => (
                    <div key={item.id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-full bg-slate-100`}>
                           {item.activity_type === 'search' ? <User className="w-5 h-5 text-blue-600"/> : <FileText className="w-5 h-5 text-purple-600"/>}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{item.target_name}</div>
                          <div className="text-xs text-slate-500">{formatDate(item.created_at)}</div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-slate-100 text-slate-600">{item.details || "Viewed"}</Badge>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-slate-400">아직 활동 내역이 없습니다.</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Saved Items List */}
          <Card className="border-slate-200 shadow-sm h-fit">
            <CardHeader className="border-b border-slate-100 bg-white rounded-t-xl">
              <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" /> 관심 목록
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {dashboardData.saved_bills.length > 0 ? (
                dashboardData.saved_bills.map((bill) => (
                  <div key={bill.id} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                      <Badge className="bg-white border-slate-200 text-[10px]">{bill.status}</Badge>
                      <TrendingUp className="w-4 h-4 text-slate-400" />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm mb-2">{bill.title}</h4>
                    {bill.score && <div className="text-right text-xs text-blue-600 font-bold">Score: {bill.score}</div>}
                  </div>
                ))
              ) : (
                <div className="text-center text-sm text-slate-400 py-4">저장된 항목이 없습니다.</div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, trend }) {
  return (
    <Card className="border-0 shadow-lg hover:-translate-y-1 transition-transform duration-300">
      <CardContent className="p-6 flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 mb-1">{label}</p>
          <h3 className="text-3xl font-bold text-slate-800">{value}</h3>
          <p className="text-xs text-green-600 font-medium mt-1">{trend}</p>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">{icon}</div>
      </CardContent>
    </Card>
  );
}

// Cần export default để import bên App.jsx hoạt động
export default Dashboard;