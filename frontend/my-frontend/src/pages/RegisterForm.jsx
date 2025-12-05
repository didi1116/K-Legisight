// src/pages/RegisterForm.jsx
import { useState } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, User, Mail, Lock, Activity } from "lucide-react";

export function SignupForm() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
    // Đã bỏ agreeTerms
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const { email, password, confirmPassword, fullName } = formData;

    if (password !== confirmPassword) {
      alert("비밀번호가 일치하지 않습니다. (Mật khẩu không khớp)");
      return;
    }
    // Đã bỏ bước kiểm tra điều khoản

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: { full_name: fullName }
        }
      });

      if (error) throw error;

      alert("회원가입 성공! 이메일을 확인해주세요.");
      navigate('/login');

    } catch (error) {
      alert("회원가입 오류: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="w-full h-screen lg:grid lg:grid-cols-2 overflow-hidden">
      
      {/* --- CỘT TRÁI: VISUAL ART (Giữ nguyên cho đẹp) --- */}
      <div className="relative hidden h-full flex-col bg-slate-950 p-10 text-white lg:flex dark:border-r">
        <div className="absolute inset-0 bg-slate-950">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
            <div className="absolute top-0 left-1/2 w-[500px] h-[500px] bg-blue-500/30 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-purple-500/20 rounded-full blur-[80px]"></div>
        </div>

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

        <div className="relative z-20 flex-1 flex items-center justify-center">
            <div className="relative w-full max-w-md p-6 bg-slate-900/50 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-slate-700 animate-pulse"></div>
                    <div className="space-y-2">
                        <div className="h-3 w-32 bg-slate-700 rounded-full"></div>
                        <div className="h-2 w-20 bg-slate-800 rounded-full"></div>
                    </div>
                </div>
                <div className="space-y-3">
                    <div className="h-2 w-full bg-slate-800 rounded-full"></div>
                    <div className="h-2 w-full bg-slate-800 rounded-full"></div>
                    <div className="h-2 w-3/4 bg-slate-800 rounded-full"></div>
                </div>
                <div className="mt-6 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 text-center">
                    <p className="text-sm text-blue-200 font-medium">"Join our community"</p>
                </div>
            </div>
        </div>

        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg font-medium leading-relaxed">
              &ldquo;데이터로 세상을 바꾸는 여정,<br/> 지금 K-LegiSight와 함께 시작하세요.&rdquo;
            </p>
            <footer className="text-sm text-slate-400">
            <p>국립부경대학교 디지털 스마트 부산 아카데미 부경대 7기</p>
            <p className="mt-1 opacity-60">금상첨화</p>
                </footer>
          </blockquote>
        </div>
      </div>

      {/* --- CỘT PHẢI: FORM ĐĂNG KÝ (ĐÃ THU NHỎ) --- */}
      <div className="flex h-full flex-col items-center justify-center bg-white p-6 overflow-y-auto">
        {/* Giảm độ rộng max-w-md -> max-w-[350px] để form gọn hơn */}
        <div className="mx-auto w-full max-w-[350px] space-y-6">
          
          <div className="flex flex-col space-y-1 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              회원가입
            </h1>
            <p className="text-xs text-slate-500">
              새로운 계정을 생성하고 서비스를 이용해보세요.
            </p>
          </div>

          {/* Giảm space-y-4 -> space-y-3 để các ô gần nhau hơn */}
          <form onSubmit={handleSubmit} className="space-y-1">
            
            {/* Tên */}
            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-slate-700 font-semibold text-xs">이름</Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <Input
                  id="fullName"
                  placeholder="이름을 입력하세요"
                  value={formData.fullName}
                  onChange={(e) => handleChange("fullName", e.target.value)}
                  className="pl-9 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-lg text-sm"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-slate-700 font-semibold text-xs">이메일</Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className="pl-9 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-lg text-sm"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-slate-700 font-semibold text-xs">비밀번호</Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  className="pl-9 pr-9 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-lg text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-slate-700 font-semibold text-xs">비밀번호 확인</Label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="비밀번호 재입력"
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange("confirmPassword", e.target.value)}
                  className="pl-9 pr-9 h-10 bg-slate-50 border-slate-200 focus:bg-white transition-all rounded-lg text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 "
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button - Margin top rộng hơn chút để tách biệt */}
            <Button 
              disabled={isLoading}
              className="w-full h-10 mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transition-all transform active:scale-95"
            >
              {isLoading ? "가입 처리 중..." : "가입하기"}
            </Button>

          </form>

          {/* Footer Link */}
          <div className="text-center text-xs text-slate-600">
            이미 계정이 있으신가요?{" "}
            <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-800 hover:underline transition-colors">
              로그인 하러가기
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}