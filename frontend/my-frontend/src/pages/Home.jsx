// src/pages/Home.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge"; 
// Thêm import User, LogOut
import { Search, Activity, TrendingUp, User, LogOut } from "lucide-react";

// !!! QUAN TRỌNG: Hãy đảm bảo đường dẫn import này đúng với project của bạn
import { supabase } from '@/lib/supabaseClient';

export function Home() {
    // 1. State cho User
    const [user, setUser] = useState(null);
    const navigate = useNavigate();

    // State cho 검색
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // State cho dữ liệu thống kê
    const [stats, setStats] = useState({
        sentiment: { cooperation: 0, nonCooperation: 0 },
        prediction: { billName: "로딩 중...", passProbability: 0, status: "..." }
    });

    // 2. useEffect: Kiểm tra đăng nhập (Code bạn gửi)
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

    // 3. Hàm đăng xuất
    const handleLogout = async () => {
        await supabase.auth.signOut();
        setUser(null);
    };

    // 3. LOGIC TÌM KIẾM CẢI TIẾN (Nhận tham số 'term')
    const handleSearch = async (term) => {
        // Ưu tiên lấy từ tham số 'term' (nếu click tag), nếu không thì lấy từ state (nếu gõ input)
        const query = (typeof term === 'string' ? term : searchQuery).trim();

        if (!query) {
            alert('검색어를 입력해주세요.');
            return;
        }

        // Cập nhật giao diện input cho khớp với từ khóa vừa click
        setSearchQuery(query);
        setIsSearching(true);

        try {
            // Gọi API với biến query (chứ không phải searchQuery state)
            const response = await fetch(
                `http://localhost:8000/api/unified-search?query=${encodeURIComponent(query)}`
            );
            const result = await response.json();

            if (result.type === 'legislator') {
                navigate(`/sentiment/member?member_id=${result.data.member_id}`);
            } else if (result.type === 'bill') {
                navigate(`/sentiment/bill?query=${encodeURIComponent(query)}`);
            } else {
                alert(result.message || '검색 결과가 없습니다.');
            }
        } catch (error) {
            console.error('검색 중 오류:', error);
            alert('검색 중 오류가 발생했습니다.');
        } finally {
            setIsSearching(false);
        }
    };

    const handleTagClick = (tag) => {
    let cleanTag = tag.replace('#', '').trim();
    cleanTag = cleanTag.replace('의원', '').trim();

    handleSearch(cleanTag);
};

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch(); // Không truyền tham số -> lấy từ input
        }
    };

    // useEffect: Lấy dữ liệu Dashboard
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Gọi vào Server Python (FastAPI) - Cổng 8000
                const res = await fetch('http://localhost:8000/api/dashboard-stats');
                
                if (!res.ok) {
                    throw new Error(`네워트 응답 문제가 있습니다: ${res.status}`);
                }

                const data = await res.json();
                setStats(data); 
            } catch (error) {
                console.error("데이더가 가져간 문제 오류:", error);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        
        {/* --- 1. HERO SECTION --- */}
        <header className="relative bg-slate-900 text-white overflow-hidden pb-32">
            
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute left-0 bottom-0 w-64 h-64 bg-purple-500 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
            </div>

            {/* Navbar */}
            <nav className="relative container mx-auto px-6 py-6 flex justify-between items-center z-10">
                <div className="text-2xl font-bold tracking-tighter flex items-center gap-0.5">
                    <img src="/logo.png" className="w-20 h-20 mr-2 object-contain"/>
                    <span>
                        <Link to ="/home">
                        K-LegiSight
                        </Link>
                    </span>
                </div>
                
                {/* --- PHẦN UI CHECK USER (Đã thay thế vào đây) --- */}
                <div className="flex items-center gap-4">
                    {user ? (
                        <div className="flex items-center gap-3">
                            <div className="hidden md:block text-right">
                                <div className="text-xs text-slate-400">환영합니다</div>
                                <div className="text-sm font-medium text-white">{user.email?.split('@')[0]} 님</div>
                            </div>
                            <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold border border-slate-700 shadow-lg">
                               <Link to="/dashboard">
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
                            <Link to="/login">
                                <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-800">
                                    로그인
                                </Button>
                            </Link>
                            <Link to="/register">
                                <Button className="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20">
                                    회원가입
                                </Button>
                            </Link>
                        </div>
                    )}
                </div>
                {/* --- KẾT THÚC PHẦN UI CHECK USER --- */}

            </nav>

            {/* Hero Content */}
            <div className="relative container mx-auto px-6 mt-20 text-center z-10">
            
            <h1 className="text-4xl md:text-6xl font-bold leading-relaxed mb-8 text-white text-center">
              국회의원의 발언을 기반으로
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                입법 과정의 흐름
              </span>
              을 파악하세요
            </h1>
            
            <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10">
                K-LegiSight는 국회 회의록을 법안 단위로 구조화하고,<br className="hidden md:block" />
                의원의 발언 태도 분석을 통해 입법 과정의 협력과 갈등을 정랑화하여, <br />
                각종 분석 지표를 제공합니다.
                            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
                <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative flex items-center bg-white rounded-full p-2 shadow-2xl">
                    <Search className="ml-4 text-slate-400 h-6 w-6" />
                    <input 
                    type="text" 
                    placeholder="궁금한 의원이나 법안을 검색하세요!" 
                    className="w-full p-3 text-lg text-slate-900 placeholder-slate-400 bg-transparent border-none outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isSearching}
                    />
                    <Button 
                    className="rounded-full px-8 h-12 bg-slate-900 hover:bg-slate-800 text-white font-medium text-lg disabled:opacity-50"
                    onClick={handleSearch}
                    disabled={isSearching}
                    >
                    {isSearching ? '검색 중...' : '검색'}
                    </Button>
                </div>
                </div>

                <div className="mt-4 flex flex-wrap justify-center gap-2 text-sm text-slate-400">
                        <span className="px-3 py-1">추천 검색어:</span>
                        {['# 인공지능법', '# 우원식 의원', '# 지능형 로봇'].map((tag, index) => (
                            <span 
                                key={index}
                                onClick={() => handleTagClick(tag)} // Sự kiện Click Tag
                                className="px-3 py-1 bg-slate-800 rounded-full cursor-pointer hover:text-white transition-colors hover:bg-slate-700"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
            </div>
            </div>
        </header>

        {/* --- 2. FEATURES SECTION: 2 Model Chính --- */}
        <main className="container mx-auto px-6 -mt-20 relative z-20 pb-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            
            {/* Model 1: Sentiment Analysis */}
            <Link to="/sentimentpage" className="block group">
                <Card className="h-full shadow-xl border-0 hover:-translate-y-1 transition-transform duration-300 bg-white/95 backdrop-blur cursor-pointer group-hover:ring-2 group-hover:ring-blue-500/50">
                <CardHeader className="pb-2">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
                    <Activity className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                    협력도 분석 
                    <span className="text-base font-normal text-slate-500"> (Legislative Cooperation Analysis)</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Text Description Updated */}
                    <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                    국회 회의록 발언을 입법 맥락에 특화된 감성분석 모델로 분류하여,<br/>
                    법안에 대한 협력·비협력·중립 발언을 정량화합니다.<br/>
                    <strong>의원·정당·위원회·법안 단위의 협력도 지표를 제공합니다.</strong>
                    </p>
                    
                    {/* Dữ liệu động */}
                    <div className="space-y-3 pointer-events-none">
                    <div className="flex justify-between text-sm font-medium">
                        <span className="text-slate-600">협력</span>
                        <span className="text-blue-600">{stats.sentiment.cooperative}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${stats.sentiment.cooperative}%` }}></div>
                    </div>

                    {/* Neutral - Added */}
                    <div className="flex justify-between text-sm font-medium">
                        <span className="text-slate-600">중립</span>
                        <span className="text-slate-500">{stats.sentiment.neutral}%</span>
                    </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div className="bg-slate-400 h-full rounded-full" style={{ width: `${stats.sentiment.neutral}%` }}></div>
                        </div>                    
                    
                    <div className="flex justify-between text-sm font-medium mt-2">
                        <span className="text-slate-600">비협력</span>
                        <span className="text-red-500">{stats.sentiment.non_cooperative}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                        <div className="bg-red-500 h-full rounded-full transition-all duration-1000" style={{ width: `${stats.sentiment.non_cooperative}%` }}></div>
                    </div>
                    </div>
                </CardContent>
                </Card>
            </Link>

            {/* Model 2: Prediction */}
            <Link to="/billprediction" className="block group">
                <Card className="h-full shadow-xl border-0 hover:-translate-y-1 transition-transform duration-300 bg-white/95 backdrop-blur cursor-pointer group-hover:ring-2 group-hover:ring-purple-500/50">
                <CardHeader className="pb-2">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-purple-600 transition-colors">
                    <TrendingUp className="w-6 h-6 text-purple-600 group-hover:text-white transition-colors" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-800 group-hover:text-purple-600 transition-colors">
                    입법 예측 보조 분석
                    <span className="text-base font-normal text-slate-500">(Prediction Support)</span>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-600 mb-6 text-sm leading-relaxed">
                    입력된 법안과 의미적으로 유사한 과거 법안 사례를 탐색하고, <br/>
                    <strong>논의 과정의 협력도와 발언량, 실제 의결 결과를 결합하여<br/></strong>
                    <strong>설명 가능한 방식으로 분석된 지표를 제공합니다.</strong>
                     </p>
                    
                    {/* Dữ liệu động */}
                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 pointer-events-none">
                    <div className="flex justify-between items-center mb-2">
                        <span className="font-bold text-slate-700">{stats.prediction.bill_name}</span>
                        <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                        {stats.prediction.status}
                        </Badge>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-slate-600">가결 확률 </span>
                        <span className="text-purple-600 font-bold text-lg">{stats.prediction.probability}% </span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full">
                        <div className="bg-purple-600 h-full rounded-full transition-all duration-1000" style={{ width: `${stats.prediction.probability}%` }}></div>
                    </div>
                    </div>
                </CardContent>
                </Card>
            </Link>

            </div>
        </main>

        {/* --- 3. VALUE SECTION  --- */}
        <section className="py-24 bg-white border-t border-slate-100">
            <div className="container mx-auto px-6">
            <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-slate-900 mb-4">
                AI와 빅데이터로 확장되는 <span className="text-blue-600">투명한 입법 생태계</span>
                </h2>
                <p className="text-slate-500">
                <strong>K-LegiSight는 누가 사용할 수 있나요?</strong>
                </p>
            </div>

            <div className="grid grid-cols-3 gap-2 md:gap-8">
                
                {/* Card 1: Cử tri */}
                <div className="group p-2 md:p-8 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-100 transition-all duration-300 flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className="w-8 h-8 md:w-14 md:h-14 bg-white rounded-xl flex items-center justify-center mb-2 md:mb-6 shadow-sm group-hover:scale-110 transition-transform">
                        <span className="text-lg md:text-3xl">🗳️</span>
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-xs md:text-xl font-bold text-slate-800 mb-2 md:mb-3 break-keep">
                        국회 및<br className="block md:hidden"/> 공공 입법 기관
                    </h3>
                    
                    {/* Full Text Description */}
                    <p className="text-slate-600 leading-tight md:leading-relaxed text-[10px] md:text-sm break-keep">
                        의원별 발언과 협력 수준을 객관적인 지표로 파악하여, 
                        법안별 논의 구조와 위원회 내 협력 양상을 정량적으로 분석할 수 있습니다.
                        <br className="hidden md:block"/><br className="hidden md:block"/>
                        <strong className="block mt-1 md:mt-0">정책 검토와 입법 과정 관리에 활용 가능한 데이터를 제공합니다.</strong>
                    </p>
                </div>

                {/* Card 2: Báo chí */}
                <div className="group p-2 md:p-8 rounded-2xl bg-slate-50 hover:bg-purple-50 border border-slate-100 hover:border-purple-100 transition-all duration-300 flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className="w-8 h-8 md:w-14 md:h-14 bg-white rounded-xl flex items-center justify-center mb-2 md:mb-6 shadow-sm group-hover:scale-110 transition-transform">
                        <span className="text-lg md:text-3xl">📰</span>
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-xs md:text-xl font-bold text-slate-800 mb-2 md:mb-3 break-keep">
                        언론 및<br className="block md:hidden"/> 미디어
                    </h3>
                    
                    {/* Full Text Description */}
                    <p className="text-slate-600 leading-tight md:leading-relaxed text-[10px] md:text-sm break-keep">
                        정치·입법 이슈에 대한 의원 및 정당의 입장을 협력도 데이터로 신속하게 파악하고, 
                        이를 시각적으로 전달할 수 있는 분석 정보를 제공합니다.
                        <br className="hidden md:block"/><br className="hidden md:block"/>
                        <strong className="block mt-1 md:mt-0">기사 작성과 이슈 분석을 위한 신뢰 가능한 데이터 소스로 활용될 수 있습니다.</strong>
                    </p>
                </div>

                {/* Card 3: Nghiên cứu */}
                <div className="group p-2 md:p-8 rounded-2xl bg-slate-50 hover:bg-orange-50 border border-slate-100 hover:border-orange-100 transition-all duration-300 flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className="w-8 h-8 md:w-14 md:h-14 bg-white rounded-xl flex items-center justify-center mb-2 md:mb-6 shadow-sm group-hover:scale-110 transition-transform">
                        <span className="text-lg md:text-3xl">🎓</span>
                    </div>
                    
                    {/* Title */}
                    <h3 className="text-xs md:text-xl font-bold text-slate-800 mb-2 md:mb-3 break-keep">
                        연구 및<br className="block md:hidden"/> 분석 기관
                    </h3>
                    
                    {/* Full Text Description */}
                    <p className="text-slate-600 leading-tight md:leading-relaxed text-[10px] md:text-sm break-keep">
                        회의록 발언을 분석 가능한 데이터로 제공하여, 
                        정치학·행정학·데이터과학 분야의 실증 연구를 지원합니다.
                        <br className="hidden md:block"/><br className="hidden md:block"/>
                        <strong className="block mt-1 md:mt-0">의원 간 협력 구조와 입법 행태를 정량적으로 분석할 수 있는 연구용 데이터셋으로 활용 가능합니다.</strong>
                    </p>
                </div>

            </div>
            
            {/* Banner đăng ký miễn phí */}
            <div className="mt-16 bg-slate-900 rounded-2xl p-8 md:p-12 text-center relative overflow-hidden">
                <div className="relative z-10">
                <h3 className="text-2xl font-bold text-white mb-4">지금 바로 대한민국 국회 데이터를 확인해보세요</h3>
                <p className="text-slate-400 mb-8">회원가입 후 더 많은 분석 리포트를 무료로 열람할 수 있습니다.</p>
                <Link to="/register">
                    <Button className="bg-white text-slate-900 hover:bg-slate-100 font-bold px-8 h-12 text-base">
                    무료 회원가입 하기
                    </Button>
                </Link>
                </div>
                {/* Background deco */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2"></div>
            </div>
            </div>
        </section>
        </div>
    );
}