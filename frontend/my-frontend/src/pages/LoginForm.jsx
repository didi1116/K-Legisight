// src/pages/LoginForm.jsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, EyeOff, Mail, Lock, Activity, Sparkles, TrendingUp } from "lucide-react";
import { Link, useNavigate } from 'react-router-dom'; 
import { supabase } from '@/lib/supabaseClient';

export function LoginForm() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "", rememberMe: false });
  const [isLoading, setIsLoading] = useState(false); // Thêm hiệu ứng loading

  const handleSubmit = async (e) => { 
    e.preventDefault();
    setIsLoading(true);
    const { email, password } = formData;

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // alert("로그인 성공!"); // Bỏ alert cho sang, chuyển trang luôn
      navigate('/home'); 
    } catch (error) {
      alert(error.message === "Invalid login credentials" ? "이메일 또는 비밀번호가 잘못되었습니다." : error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2 overflow-hidden">
      
      {/* --- CỘT TRÁI: VISUAL ART (WOW FACTOR) --- */}
      <div className="relative hidden h-full flex-col bg-slate-950 p-10 text-white lg:flex dark:border-r">
        
        {/* 1. Background Effects */}
        <div className="absolute inset-0 bg-slate-950">
            {/* Lưới Grid mờ ảo */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
            
            {/* Ánh sáng Glow */}
            <div className="absolute top-0 left-1/2 w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-purple-500/20 rounded-full blur-[80px]"></div>
        </div>

        {/* 2. Logo */}
        <div className="relative z-20 flex items-center gap-2 text-lg font-bold">
          <div className="p-1 bg-blue-600 rounded-lg">
            <Activity className="h-5 w-5 text-white" />
          </div>
          <span>
          <Link to ="/home">
            K-LegiSight
          </Link>
            </span>
        </div>

        {/* 3. Floating Visual Card (Điểm nhấn thị giác) */}
        <div className="relative z-20 flex-1 flex items-center justify-center">
            {/* Thẻ mô phỏng Dashboard */}
            <div className="relative w-full max-w-md p-6 bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl transform rotate-[-5deg] hover:rotate-0 transition-transform duration-500">
                {/* Nội dung giả lập bên trong thẻ */}
                <div className="flex justify-between items-center mb-4">
                    <div className="h-3 w-24 bg-slate-700 rounded-full"></div>
                    <div className="h-6 w-16 bg-green-500/20 text-green-400 text-xs font-bold flex items-center justify-center rounded-full">
                        +87% Safe
                    </div>
                </div>
                <div className="space-y-2">
                    <div className="h-2 w-full bg-slate-800 rounded-full"></div>
                    <div className="h-2 w-3/4 bg-slate-800 rounded-full"></div>
                    <div className="h-2 w-1/2 bg-slate-800 rounded-full"></div>
                </div>
                <div className="mt-6 flex gap-4">
                    <div className="flex-1 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 text-center">
                        <TrendingUp className="w-6 h-6 text-blue-400 mx-auto mb-1" />
                        <div className="text-xs text-blue-200">Prediction</div>
                    </div>
                    <div className="flex-1 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20 text-center">
                        <Sparkles className="w-6 h-6 text-purple-400 mx-auto mb-1" />
                        <div className="text-xs text-purple-200">AI Analysis</div>
                    </div>
                </div>
            </div>
        </div>

        {/* 4. Footer Text */}
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg font-medium leading-relaxed">
              &ldquo;입법 데이터의 투명성과 예측 가능성을 높이는<br/> 대한민국 최고의 정치 데이터 플랫폼.&rdquo;
            </p>
            <footer className="text-sm text-slate-400">
            <p>국립부경대학교 디지털 스마트 부산 아카데미 부경대 7기</p>
            <p className="mt-1 opacity-60">금상첨화</p>
              </footer>
          </blockquote>
        </div>
      </div>

      {/* --- CỘT PHẢI: FORM ĐĂNG NHẬP (CLEAN & MODERN) --- */}
      <div className="flex h-full flex-col items-center justify-center bg-white p-8">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[380px]">
          
          <div className="flex flex-col space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              환영합니다 👋
            </h1>
            <p className="text-sm text-slate-500">
              K-LegiSight 계정으로 로그인하세요.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Input Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-semibold">이메일</Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <Input
                  id="email"
                  placeholder="name@example.com"
                  type="email"
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="pl-10 h-12 bg-slate-50 border-slate-200 focus:border-blue-600 focus:ring-blue-600/20 transition-all rounded-xl"
                  required
                />
              </div>
            </div>

            {/* Input Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-slate-700 font-semibold">비밀번호</Label>
                <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-800">
                  비밀번호를 잊으셨나요?
                </a>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className="pl-10 pr-10 h-12 bg-slate-50 border-slate-200 focus:border-blue-600 focus:ring-blue-600/20 transition-all rounded-xl"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Login Button with Loading State */}
            <Button 
              disabled={isLoading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-base shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transition-all transform active:scale-95"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  로그인 중...
                </span>
              ) : (
                "로그인"
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-500">Or</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="text-center text-sm">
            계정이 없으신가요?{" "}
            <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors">
              회원가입 하기
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}