// src/components/legislator/LegislatorFilter.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RotateCcw } from "lucide-react";

export function LegislatorFilter({ 
  // 1. State Input text
  legislatorName, setLegislatorName,
  
  // 2. State Dropdowns (Phải nhận đủ từ cha xuống thì mới Reset được)
  selectedParty, setSelectedParty,
  selectedCity, setSelectedCity,
  selectedDistrict, setSelectedDistrict, // (Mới) Thêm cái này để reset quận/huyện
  selectedCommittee, setSelectedCommittee,
  selectedGender, setSelectedGender,
  selectedAge, setSelectedAge,           // (Mới) Thêm cái này để reset tuổi
  selectedCount, setSelectedCount,
  selectedMethod, setSelectedMethod,
  
  // 3. Data & Actions
  currentDistricts, 
  onSearch, 
  onReset 
}) {

  return (
    <Card className="border rounded-sm shadow-sm bg-white mb-6">
      <CardContent className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">

          {/* Đại số (Giữ cố định hoặc thêm state nếu cần) */}
          <FilterItem label="대수">
            <Select defaultValue="21">
              <SelectTrigger><SelectValue placeholder="21대" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="21">제21대</SelectItem>
              </SelectContent>
            </Select>
          </FilterItem>

          {/* Tên */}
          <FilterItem label="이름">
            <Input 
              placeholder="이름 입력" 
              className="h-10" 
              value={legislatorName}
              onChange={(e) => setLegislatorName(e.target.value)}
            />
          </FilterItem>

          {/* Đảng */}
          <FilterItem label="정당">
            <Select value={selectedParty} onValueChange={setSelectedParty}>
              <SelectTrigger><SelectValue placeholder="전체" /></SelectTrigger>
              <SelectContent>
                    <SelectItem value="all">소속정당 전체</SelectItem>
                    <SelectItem value="더불어민주당">더불어민주당</SelectItem>
                    <SelectItem value="국민의힘">국민의힘</SelectItem>
                    <SelectItem value="기본소득당">기본소득당</SelectItem>
                    <SelectItem value="국민의당">국민의당</SelectItem>
                    <SelectItem value="열린민주당">열린민주당</SelectItem>
                    <SelectItem value="미래통합당">미래통합당</SelectItem>
                    <SelectItem value="미래한국당">미래한국당</SelectItem>
                    <SelectItem value="정의당">정의당</SelectItem>
                    <SelectItem value="새로운미래">새로운미래</SelectItem>
                    <SelectItem value="시대전환">시대전환</SelectItem>
                    <SelectItem value="무소속">무소속</SelectItem>
              </SelectContent>
            </Select>
          </FilterItem>

          {/* Ủy ban */}
          <FilterItem label="위원회">
            <Select value={selectedCommittee} onValueChange={setSelectedCommittee}>
              <SelectTrigger><SelectValue placeholder="전체" /></SelectTrigger>
              <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="과학기술정보방송통신위원회">과학기술정보방송통신위원회</SelectItem>
                    <SelectItem value="교육위원회">교육위원회</SelectItem>
                    <SelectItem value="국방위원회">국방위원회</SelectItem>
                    <SelectItem value="국토교통위원회">국토교통위원회</SelectItem>
                    <SelectItem value="국회운영위원회">국회운영위원회</SelectItem>
                    <SelectItem value="기획재정위원회">기획재정위원회</SelectItem>
                    <SelectItem value="농림축산식품해양수산위원회">농림축산식품해양수산위원회</SelectItem>
                    <SelectItem value="문화체육관광위원회">문화체육관광위원회</SelectItem>
                    <SelectItem value="법제사법위원회">법제사법위원회</SelectItem>
                    <SelectItem value="보건복지위원회">보건복지위원회</SelectItem>
                    <SelectItem value="산업통상자원중소벤처기업위원회">산업통상자원중소벤처기업위원회</SelectItem>
                    <SelectItem value="여성가족위원회">여성가족위원회</SelectItem>
                    <SelectItem value="예산결산특별위원회">예산결산특별위원회</SelectItem>
                    <SelectItem value="외교통일위원회">외교통일위원회</SelectItem>
                    <SelectItem value="윤리특별위원회">윤리특별위원회</SelectItem>
                    <SelectItem value="정무위원회">정무위원회</SelectItem>
                    <SelectItem value="정보위원회">정보위원회</SelectItem>
                    <SelectItem value="행정안전위원회">행정안전위원회</SelectItem>
                    <SelectItem value="환경노동위원회">환경노동위원회</SelectItem>
              </SelectContent>
            </Select>
          </FilterItem> 

          {/* Khu vực (City + District) */}
          <FilterItem label="지역선거구">
            <div className="flex gap-2 w-full">
               {/* Tỉnh/TP */}
               <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger><SelectValue placeholder="시/도" /></SelectTrigger>
                  <SelectContent>
                        <SelectItem value="all">전체</SelectItem>
                        <SelectItem value="서울">서울</SelectItem>
                        <SelectItem value="부산">부산</SelectItem>
                        <SelectItem value="대구">대구</SelectItem>
                        <SelectItem value="인천">인천</SelectItem>
                        <SelectItem value="광주">광주</SelectItem>
                        <SelectItem value="대전">대전</SelectItem>
                        <SelectItem value="울산">울산</SelectItem>
                        <SelectItem value="경기">경기</SelectItem>
                        <SelectItem value="강원">강원</SelectItem>
                        <SelectItem value="충북">충북</SelectItem>
                        <SelectItem value="충남">충남</SelectItem>
                        <SelectItem value="전북">전북</SelectItem>
                        <SelectItem value="전남">전남</SelectItem>
                        <SelectItem value="경북">경북</SelectItem>
                        <SelectItem value="경남">경남</SelectItem>
                        <SelectItem value="제주">제주</SelectItem>
                        <SelectItem value="세종">세종</SelectItem>
                  </SelectContent>
               </Select>
               
               {/* Quận/Huyện (Đã sửa thêm value để reset được) */}
               <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
                <SelectTrigger><SelectValue placeholder="구/군" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {currentDistricts.map((district) => (
                      <SelectItem key={district} value={district}>{district}</SelectItem>
                  ))}
                </SelectContent>
                </Select>
            </div>
          </FilterItem>

          {/* Giới tính */}
          <FilterItem label="성별">
            <Select value={selectedGender} onValueChange={setSelectedGender}>
              <SelectTrigger><SelectValue placeholder="전체" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="남">남</SelectItem>
                <SelectItem value="여">여</SelectItem>
              </SelectContent>
            </Select>
          </FilterItem>
          
          {/* Tuổi (Đã sửa thêm value để reset được) */}
           <FilterItem label="연령">
            <Select value={selectedAge} onValueChange={setSelectedAge}>
              <SelectTrigger><SelectValue placeholder="전체" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="u30">30세미만</SelectItem>
                <SelectItem value="u40">30대</SelectItem>
                <SelectItem value="u50">40대</SelectItem>
                <SelectItem value="u60">50대</SelectItem>
                <SelectItem value="u70">60대</SelectItem>
                <SelectItem value="o70">70세이상</SelectItem>
              </SelectContent>
            </Select>
          </FilterItem>

          {/* Số lần trúng cử */}
          <FilterItem label="당선횟수">
            <Select value={selectedCount} onValueChange={setSelectedCount}>
              <SelectTrigger><SelectValue placeholder="전체" /></SelectTrigger>
              <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="초선">초선</SelectItem>
                    <SelectItem value="재선">재선</SelectItem>
                    <SelectItem value="3선">3선</SelectItem>
                    <SelectItem value="4선">4선</SelectItem>
                    <SelectItem value="5선">5선</SelectItem>
                    <SelectItem value="6선">6선 이상</SelectItem>
              </SelectContent>
            </Select>
          </FilterItem>

          {/* Phương thức */}
          <FilterItem label="당선방법">
            <Select value={selectedMethod} onValueChange={setSelectedMethod}>
              <SelectTrigger><SelectValue placeholder="전체" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="지역구">지역구</SelectItem>
                <SelectItem value="비례대표">비례대표</SelectItem>
              </SelectContent>
            </Select>
          </FilterItem>
        </div>

        {/* Buttons */}
        <div className="flex justify-center gap-3 pt-6 border-t mt-6">
          <Button 
            className="bg-slate-900 hover:bg-slate-800 px-10 h-12 text-lg" 
            onClick={onSearch}
          >
            <Search className="w-5 h-5 mr-2" /> AI 분석 시작 
          </Button>

          <Button 
            variant="outline" 
            className="px-8 h-12 text-slate-600 border-slate-300 hover:bg-red-50 hover:text-red-600" 
            onClick={onReset}
          >
            <RotateCcw className="w-4 h-4 mr-2" /> 초기화
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FilterItem({ label, children }) {
  return (
    <div className="flex items-center">
      <label className="w-24 text-sm font-bold text-slate-700 shrink-0 text-right mr-4">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}