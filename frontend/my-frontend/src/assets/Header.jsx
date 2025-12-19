// src/components/Header.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from "@/components/ui/button";
import { Activity, User, LogOut } from "lucide-react";

export function Header() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Kiểm tra đăng nhập
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    checkUser();
    
    // Lắng nghe sự thay đổi (đăng nhập/đăng xuất) để cập nhật Header ngay lập tức
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/home');
  };

  return (
    <header className="bg-slate-900 text-white h-16 shrink-0 sticky top-0 z-50 shadow-md w-full">
      <div className="container mx-auto px-6 h-full flex justify-between items-center">
        
        {/* Logo */}
        <Link to="/home" className="flex items-center gap-2 text-lg font-bold tracking-tight hover:opacity-90 transition-opacity">
          <div className="text-2xl font-bold tracking-tighter flex items-center gap-0.5">
            <img src="/logo.png" className="w-16 h-20 mr-2 object-contain"/>
                <span>
                   K-LegiSight
                </span>
            </div>
        </Link>

        {/* Menu & User Action */}
        <div className="flex items-center gap-6">
          
          {/* Menu Links (Ẩn trên mobile) */}
          <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-300">
             <Link to="/sentimentpage" className="hover:text-white transition-colors">협력도 분석</Link>
             <Link to="/billprediction" className="hover:text-white transition-colors">입법 결과 예측 분석 보조</Link>
          </nav>

          {/* User Info */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <div className="hidden md:block text-right">
                  <div className="text-xs text-slate-400">환영합니다</div>
                  <div className="text-sm font-medium text-white">{user.email.split('@')[0]} 님</div>
                </div>
                <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold border border-slate-700 shadow-lg">
                  <Link to = "/dashboard">
                  <User className="h-4 w-4" />
                  </Link>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-red-400 hover:bg-slate-800 h-8 w-8"
                  title="로그아웃"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-3 text-sm">
                <Link to="/login" className="text-slate-300 hover:text-white transition-colors flex items-center">
                  로그인
                </Link>
                <Link to="/register" className="bg-blue-600 hover:bg-blue-500 px-4 py-1.5 rounded-md font-medium transition-colors flex items-center">
                  회원가입
                </Link>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  );
}