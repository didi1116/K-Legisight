// src/pages/LegislatorAnalysis.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";

import { LegislatorFilter } from '@/components/legislator/LegislatorFilter';
import { LegislatorListTable } from '@/components/legislator/LegislatorListTable';
import { LegislatorSummary } from '@/components/legislator/LegislatorSummary';
import { DISTRICTS } from '@/lib/constants'; 

export function LegislatorAnalysis() {
  const navigate = useNavigate();
  const location = useLocation(); 

  // Kiểm tra xem có filter được gửi từ trang Dashboard sang không
  const incomingFilters = location.state?.incomingFilters;

  // --- 1. STATE DỮ LIỆU ---
  const [allLegislators, setAllLegislators] = useState([]); 
  const [legislators, setLegislators] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- 2. STATE BỘ LỌC (OPTIONS) ---
  const [filterOptions, setFilterOptions] = useState({
    parties: [], committees: [], genders: [], counts: [], methods: []
  });

  // --- 3. STATE GIÁ TRỊ ĐANG CHỌN (INPUTS) ---
  // Khởi tạo giá trị bằng incomingFilters nếu có
  const [searchParams, setSearchParams] = useState({
    name: incomingFilters?.name || "", 
    billName: "", 
    party: incomingFilters?.party || "all", 
    city: incomingFilters?.city || "all",
    district: incomingFilters?.district || "all",
    committee: incomingFilters?.committee || "all", 
    gender: incomingFilters?.gender || "all", 
    age: incomingFilters?.age || "all",
    count: incomingFilters?.count || "all", 
    method: incomingFilters?.method || "all"
  });

  // --- 4. LOAD DỮ LIỆU TỪ API ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Load Options
        const resFilters = await fetch('http://localhost:8000/api/filters');
        if (resFilters.ok) {
            const filtersData = await resFilters.json();
            setFilterOptions(filtersData);
        }

        // Load Danh sách Nghị sĩ
        const resList = await fetch('http://localhost:8000/api/legislators');
        if (!resList.ok) throw new Error("Không tải được danh sách nghị sĩ");
        
        const listData = await resList.json();
        setAllLegislators(listData);
        
        // Mặc định hiển thị hết (sẽ bị override nếu có incomingFilters ở useEffect dưới)
        setLegislators(listData); 

      } catch (err) {
        console.error("Lỗi kết nối:", err);
        setError("Không thể kết nối đến Server (Backend).");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []); // Chỉ chạy 1 lần khi mount

  // --- 5. LOGIC LỌC DỮ LIỆU CHUNG (Dùng chung cho cả Auto và Manual) ---
  const performFiltering = (criteria) => {
    let result = [...allLegislators];

    if (criteria.name) result = result.filter(l => l.name.includes(criteria.name));
    if (criteria.party !== "all") result = result.filter(l => l.party === criteria.party);
    if (criteria.city !== "all") result = result.filter(l => l.region && l.region.includes(criteria.city));
    if (criteria.committee !== "all") result = result.filter(l => l.committee === criteria.committee);
    if (criteria.gender !== "all") result = result.filter(l => l.gender === criteria.gender);
    if (criteria.count !== "all") result = result.filter(l => l.count === criteria.count);
    if (criteria.method !== "all") result = result.filter(l => l.method === criteria.method);
    
    // --- Đã mở comment để lọc Quận/Huyện ---
    // (Đảm bảo trong data 'l' có trường 'district' hoặc 'region_detail' tương ứng)
    if (criteria.district !== "all") {
        result = result.filter(l => l.district === criteria.district); 
    }
    
    // --- Lọc Tuổi ---
    // (Cần logic tùy thuộc vào data 'age' trong DB là số hay chuỗi)
    if (criteria.age !== "all") {
        // Ví dụ: l.age_range === criteria.age
        // result = result.filter(l => l.age_range === criteria.age); 
    }

    setLegislators(result);
  };

  // --- 6. TỰ ĐỘNG LỌC KHI CÓ DỮ LIỆU TỪ DASHBOARD ---
  useEffect(() => {
    // Chỉ chạy khi đã load xong data VÀ có filter gửi sang
    if (!loading && allLegislators.length > 0 && incomingFilters) {
       console.log("Auto applying filters:", incomingFilters);
       performFiltering(incomingFilters);
       
       // Xóa state trong history để nếu F5 lại không bị lọc lại (tuỳ chọn, UX tốt hơn)
       window.history.replaceState({}, document.title);
    }
  }, [loading, allLegislators]); // Bỏ incomingFilters khỏi dep array để tránh loop, hoặc giữ nếu object ổn định

  // --- 7. HÀM XỬ LÝ TÌM KIẾM (Nút bấm) ---
  const handleSearch = () => {
    performFiltering(searchParams);
  };

  // --- 8. HÀM RESET ---
  const handleReset = () => {
    setSearchParams({
      name: "", 
      billName: "", 
      party: "all", 
      city: "all",
      district: "all", 
      committee: "all", 
      gender: "all", 
      age: "all",
      count: "all", 
      method: "all"
    });
    setLegislators(allLegislators);
  };

  const handleRowClick = (member) => {
    navigate('/analysis/person-view', { state: { memberProfile: member } });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-slate-900 border-l-4 border-blue-900 pl-4">
            의원별 상세 분석
          </h1>
        </div>

        {/* --- LEGISLATOR FILTER --- */}
        <LegislatorFilter 
          // 1. Truyền Giá trị (Values)
          legislatorName={searchParams.name}
          billName={searchParams.billName}
          selectedParty={searchParams.party}
          selectedCity={searchParams.city}
          selectedDistrict={searchParams.district}
          selectedCommittee={searchParams.committee}
          selectedGender={searchParams.gender}
          selectedAge={searchParams.age}
          selectedCount={searchParams.count}
          selectedMethod={searchParams.method}
          
          // 2. Truyền Options
          currentDistricts={DISTRICTS[searchParams.city] || []}
          
          // 3. Truyền Setters
          setLegislatorName={(val) => setSearchParams(prev => ({...prev, name: val}))}
          setBillName={(val) => setSearchParams(prev => ({...prev, billName: val}))}
          setSelectedParty={(val) => setSearchParams(prev => ({...prev, party: val}))}
          
          // Khi đổi Tỉnh -> Reset Quận về all
          setSelectedCity={(val) => setSearchParams(prev => ({...prev, city: val, district: "all"}))} 
          setSelectedDistrict={(val) => setSearchParams(prev => ({...prev, district: val}))}
          
          setSelectedCommittee={(val) => setSearchParams(prev => ({...prev, committee: val}))}
          setSelectedGender={(val) => setSearchParams(prev => ({...prev, gender: val}))}
          setSelectedAge={(val) => setSearchParams(prev => ({...prev, age: val}))}
          setSelectedCount={(val) => setSearchParams(prev => ({...prev, count: val}))}
          setSelectedMethod={(val) => setSearchParams(prev => ({...prev, method: val}))}
          
          // 4. Actions
          onSearch={handleSearch}
          onReset={handleReset}
        />

        <LegislatorSummary 
          total={allLegislators.length} 
          current={legislators.length} 
        />

        <div className="h-[800px]">
          {loading ? (
             <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
               <RefreshCw className="w-10 h-10 animate-spin text-blue-500" />
               <p>데이터를 불러오는 중입니다...</p>
             </div>
          ) : (
             <LegislatorListTable 
               members={legislators} 
               onMemberClick={handleRowClick} 
               showParty={true} 
               showAIScore={false} 
             />
          )}
        </div>

      </div>
    </div>
  );
}