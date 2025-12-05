import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";

// Import các component con
import { LegislatorFilter } from '@/components/legislator/LegislatorFilter';
import { LegislatorListTable } from '@/components/legislator/LegislatorListTable';
import { LegislatorSummary } from '@/components/legislator/LegislatorSummary';
import { DISTRICTS } from '@/lib/constants'; 

export function LegislatorAnalysis() {
  const navigate = useNavigate();

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
  const [searchParams, setSearchParams] = useState({
    name: "", 
    billName: "",
    party: "all", 
    city: "all",
    committee: "all", 
    gender: "all", 
    count: "all", 
    method: "all"
  });

  // --- 4. LOAD DỮ LIỆU TỪ SERVER ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // A. Lấy các tùy chọn bộ lọc (Giả sử API này trả về list các options)
        const resFilters = await fetch('http://localhost:8000/api/filters');
        if (resFilters.ok) {
            const filtersData = await resFilters.json();
            setFilterOptions(filtersData);
        }

        // B. Lấy TOÀN BỘ danh sách nghị sĩ
        const resList = await fetch('http://localhost:8000/api/legislators');
        if (!resList.ok) throw new Error("Không tải được danh sách nghị sĩ");
        
        const listData = await resList.json();
        
        setAllLegislators(listData);
        setLegislators(listData); 

      } catch (err) {
        console.error("Lỗi kết nối:", err);
        setError("Không thể kết nối đến Server (Backend). Vui lòng kiểm tra lại.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // --- 5. HÀM XỬ LÝ TÌM KIẾM ---
  const handleSearch = () => {
    let result = [...allLegislators];

    // Lọc theo Tên
    if (searchParams.name) {
      result = result.filter(l => l.name.includes(searchParams.name));
    }

    // Lọc theo Đảng
    if (searchParams.party !== "all") {
      result = result.filter(l => l.party === searchParams.party);
    }

    // Lọc theo Khu vực (Thành phố)
    if (searchParams.city !== "all") {
      result = result.filter(l => l.region && l.region.includes(searchParams.city));
    }

    // Lọc theo Ủy ban
    if (searchParams.committee !== "all") {
      result = result.filter(l => l.committee === searchParams.committee);
    }

    // Lọc theo Giới tính
    if (searchParams.gender !== "all") {
      result = result.filter(l => l.gender === searchParams.gender);
    }

    // Lọc theo Số lần bầu (3선, 4선...)
    if (searchParams.count !== "all") {
      // Lưu ý: Đảm bảo dữ liệu trong DB là chuỗi "3선" hoặc số 3 khớp với value của Select
      result = result.filter(l => l.count === searchParams.count);
    }

    // Lọc theo Cách bầu
    if (searchParams.method !== "all") {
      result = result.filter(l => l.method === searchParams.method);
    }

    setLegislators(result);
  };

  // --- 6. HÀM RESET ---
  const handleReset = () => {
    setSearchParams({
      name: "", billName: "", party: "all", city: "all",
      committee: "all", gender: "all", count: "all", method: "all"
    });
    setLegislators(allLegislators);
  };

  const handleRowClick = (member) => {
    navigate('/analysis/person-view', { state: { memberProfile: member } });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-slate-900 border-l-4 border-blue-900 pl-4">
            의원별 상세 분석
          </h1>
          <div className="flex gap-2">
             {error && <span className="text-red-500 text-sm flex items-center mr-4">{error}</span>}
             <Button className="bg-blue-900 hover:bg-blue-800">
                <Download className="w-4 h-4 mr-2" /> 엑셀 다운로드
             </Button>
          </div>
        </div>

        {/* --- KHU VỰC SỬA ĐỔI QUAN TRỌNG --- */}
        <LegislatorFilter 
          // 1. Truyền giá trị hiện tại (Inputs)
          legislatorName={searchParams.name}
          billName={searchParams.billName}
          
          // 2. Truyền các danh sách Option (để đổ vào dropdown)
          parties={filterOptions.parties}
          committees={filterOptions.committees}
          genders={filterOptions.genders}
          counts={filterOptions.counts}
          methods={filterOptions.methods}
          currentDistricts={DISTRICTS[searchParams.city] || []}
          
          // 3. Truyền các hàm SETTER (Để component con gọi khi user chọn)
          setLegislatorName={(val) => setSearchParams(prev => ({...prev, name: val}))}
          setBillName={(val) => setSearchParams(prev => ({...prev, billName: val}))}
          
          setSelectedParty={(val) => setSearchParams(prev => ({...prev, party: val}))}
          setSelectedCity={(val) => setSearchParams(prev => ({...prev, city: val}))}
          
          // --> CÁC DÒNG MỚI THÊM ĐỂ LỌC HOẠT ĐỘNG:
          setSelectedCommittee={(val) => setSearchParams(prev => ({...prev, committee: val}))}
          setSelectedGender={(val) => setSearchParams(prev => ({...prev, gender: val}))}
          setSelectedCount={(val) => setSearchParams(prev => ({...prev, count: val}))}
          setSelectedMethod={(val) => setSearchParams(prev => ({...prev, method: val}))}
          
          onSearch={handleSearch}
          onReset={handleReset}
        />

        {/* SUMMARY STATS */}
        <LegislatorSummary 
          total={allLegislators.length} 
          current={legislators.length} 
        />

        {/* TABLE */}
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