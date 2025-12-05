// src/components/legislator/LegislatorFilter.jsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, RotateCcw, FileText, User } from "lucide-react";
import { DISTRICTS } from '@/lib/constants';
 
export function LegislatorFilter({ 
  legislatorName, setLegislatorName,
  billName, setBillName,
  
  // Nhận các hàm set từ cha
  setSelectedParty,
  setSelectedCity,
  setSelectedCommittee, // Thêm
  setSelectedGender,    // Thêm
  setSelectedCount,     // Thêm (Cái này sửa lỗi chọn 3선)
  setSelectedMethod,    // Thêm
  
  currentDistricts, 
  onSearch, 
  onReset 
}) {

  return (
    <Card className="border rounded-sm shadow-sm bg-white mb-6">
      <CardContent className="p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">

          {/* Các bộ lọc cũ */}
          <FilterItem label="대수">
            <Select defaultValue="22">
              <SelectTrigger><SelectValue placeholder="22대" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="22">제22대</SelectItem>
                <SelectItem value="21">제21대</SelectItem>
              </SelectContent>
            </Select>
          </FilterItem>

          <FilterItem label="이름">
            <Input 
              placeholder="이름 입력" 
              className="h-10" 
              value={legislatorName}
              onChange={(e) => setLegislatorName(e.target.value)}
            />
          </FilterItem>

          <FilterItem label="정당">
            <Select defaultValue="all" onValueChange={(value) => setSelectedParty(value)}>
              <SelectTrigger><SelectValue placeholder="전체" /></SelectTrigger>
              <SelectContent>
                    <SelectItem value="소속정당 전체">소속정당 전체</SelectItem>
                    <SelectItem value="무소속">무소속</SelectItem>
                    <SelectItem value="더불어민주당">더불어민주당</SelectItem>
                    <SelectItem value="더불어시민당">더불어시민당</SelectItem>
                    <SelectItem value="열린민주당">열린민주당</SelectItem>
                    <SelectItem value="미래통합당">미래통합당</SelectItem>
                    <SelectItem value="미래한국당">미래한국당</SelectItem>
                    <SelectItem value="국민의힘">국민의힘</SelectItem>
                    <SelectItem value="정의당">정의당</SelectItem>
                    <SelectItem value="국민의당">국민의당</SelectItem>
                    <SelectItem value="새로운미래">새로운미래</SelectItem>
                    <SelectItem value="개혁신당">개혁신당</SelectItem>
                    <SelectItem value="조국혁신당">조국혁신당</SelectItem>
                    <SelectItem value="자유통일당">자유통일당</SelectItem>
                    <SelectItem value="기본소득당">기본소득당</SelectItem>
                    <SelectItem value="진보당">진보당</SelectItem>
                    <SelectItem value="시대전환">시대전환</SelectItem>
              </SelectContent>
            </Select>
          </FilterItem>

          <FilterItem label="위원회">
            <Select onValueChange={(value) => setSelectedCommittee(value)} >
              <SelectTrigger><SelectValue placeholder="전체" /></SelectTrigger>
              <SelectContent>
                            <SelectItem value="전체">전체</SelectItem>
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
                            <SelectItem value="연금개혁특별위원회">연금개혁특별위원회</SelectItem>
                            <SelectItem value="예산결산특별위원회">예산결산특별위원회</SelectItem>
                            <SelectItem value="외교통일위원회">외교통일위원회</SelectItem>
                            <SelectItem value="윤리특별위원회">윤리특별위원회</SelectItem>
                            <SelectItem value="정무위원회">정무위원회</SelectItem>
                            <SelectItem value="정보위원회">정보위원회</SelectItem>
                            <SelectItem value="정치개혁특별위원회">정치개혁특별위원회</SelectItem>
                            <SelectItem value="첨단전략산업특별위원회">첨단전략산업특별위원회</SelectItem>
                            <SelectItem value="행정안전위원회">행정안전위원회</SelectItem>
                            <SelectItem value="환경노동위원회">환경노동위원회</SelectItem>
                            <SelectItem value="인구위기특별위원회">인구위기특별위원회</SelectItem>
                            <SelectItem value="기후위기특별위원회">기후위기특별위원회</SelectItem>
              </SelectContent>
            </Select>
          </FilterItem> 

          <FilterItem label="지역선거구">
            <div className="flex gap-2 w-full">
               <Select defaultValue="all" onValueChange={(value) => setSelectedCity(value)}>
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
                    {/* ... */}
                  </SelectContent>
               </Select>
               <Select defaultValue="all">
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

          <FilterItem label="성별">
            <Select onOpenChange={(value) => setSelectedGender(value)}>
              <SelectTrigger><SelectValue placeholder="전체" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="m">남</SelectItem>
                <SelectItem value="f">여</SelectItem>
              </SelectContent>
            </Select>
          </FilterItem>
          
           <FilterItem label="연령">
            <Select onValueChange={(value) => setSelectedCommittee(value)}>
              <SelectTrigger><SelectValue placeholder="전체" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="u30">30세미만</SelectItem>
                <SelectItem value="u40">30세</SelectItem>
                <SelectItem value="u50">40세</SelectItem>
                <SelectItem value="u60">50세</SelectItem>
                <SelectItem value="u70">60세</SelectItem>
                <SelectItem value="o70">70세이상</SelectItem>
              </SelectContent>
            </Select>
          </FilterItem>

          <FilterItem label="당선횟수">
            <Select onValueChange={(value) => setSelectedMethod(value)}>
              <SelectTrigger><SelectValue placeholder="전체" /></SelectTrigger>
              <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="1">초선</SelectItem>
                    <SelectItem value="2">재선</SelectItem>
                    <SelectItem value="3">3선</SelectItem>
                    <SelectItem value="4">4선</SelectItem>
                    <SelectItem value="5">5선</SelectItem>
                    <SelectItem value="6">6선</SelectItem>
                    <SelectItem value="7">7선</SelectItem>
                    <SelectItem value="8">8선</SelectItem>
                    <SelectItem value="9">9선</SelectItem>
                    <SelectItem value="10">10선</SelectItem>
              </SelectContent>
            </Select>
          </FilterItem>

          <FilterItem label="당선방법">
            <Select defaultValue="all">
              <SelectTrigger><SelectValue placeholder="전체" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="지역구">지역구</SelectItem>
                <SelectItem value="비례대표">비례대표</SelectItem>
              </SelectContent>
            </Select>
          </FilterItem>

          {/* Ô NHẬP DỰ LUẬT */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-blue-50 p-4 rounded-lg border border-blue-100 mb-2">
            <div className="flex items-center gap-4">
              <label className="w-24 text-sm font-bold text-blue-900 shrink-0 flex items-center gap-2">
                <FileText className="w-4 h-4" /> 대상 법안
              </label>
              <Input 
                placeholder="분석하고 싶은 법안명을 입력하세요 (예: 인공지능 산업 육성법)" 
                className="h-11 text-base bg-white border-blue-200 focus-visible:ring-blue-500"
                value={billName}
                onChange={(e) => setBillName(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex justify-center gap-2 pt-4 border-t mt-6">
          <Button className="bg-blue-900 hover:bg-blue-800 px-10 h-12 text-lg" onClick={onSearch}>
            <Search className="w-5 h-5 mr-2" /> AI 분석 시작 
          </Button>
          <Button variant="outline" className="px-6 h-12 text-slate-600" onClick={onReset}>
            <RotateCcw className="w-4 h-4 mr-2" /> 초기화
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Component con nội bộ (để căn chỉnh label)
function FilterItem({ label, children }) {
  return (
    <div className="flex items-center">
      <label className="w-24 text-sm font-bold text-slate-700 shrink-0">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}