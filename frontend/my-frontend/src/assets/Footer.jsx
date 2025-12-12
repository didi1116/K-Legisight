// src/components/Footer.jsx
import React from 'react';
import { Activity, Github, Mail, Database } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800 mt-auto">
      <div className="container mx-auto px-6 py-12">
        
        {/* --- PHẦN TRÊN: CÁC CỘT THÔNG TIN --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Cột 1: Logo & Giới thiệu */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 text-lg font-bold text-white mb-4">
              <div className="p-1 bg-blue-600 rounded-md">
                <Activity className="h-4 w-4 text-white" />
              </div>
              <span>K-LegiSight</span>
            </div>
            <p className="text-sm leading-relaxed max-w-xs text-slate-500">
              대한민국 국회 회의록 빅데이터를 분석하여<br/>
              입법의 투명성과 예측 가능성을 높이는<br/>
              AI 기반 정치 데이터 플랫폼입니다.
            </p>
          </div>

          {/* Cột 2: Liên kết nhanh */}
          <div>
            <h3 className="text-white font-bold mb-4">바로가기</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/sentiment" className="hover:text-blue-500 transition-colors">감성 분석</a></li>
              <li><a href="#" className="hover:text-blue-500 transition-colors">법안 예측</a></li>

            </ul>
          </div>

          {/* Cột 3: Thông tin khác */}
          <div>
            <h3 className="text-white font-bold mb-4">문의하기</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"> 
                <Mail className="w-4 h-4" /> contact@k-legisight.com
              </li>
              <li className="flex items-center gap-2">
                <Github className="w-4 h-4" /> github.com/k-legisight
              </li>
              <li className="flex items-center gap-2">
                <Database className="w-4 h-4" /> 
              </li>
            </ul>
          </div>
        </div>

        {/* --- PHẦN DƯỚI: BẢN QUYỀN --- */}
        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center text-xs">
          <p>국립부경대학교 디지털 스마트 부산 아카데미 부경대 7기</p>
            <p>금상첨화</p>
        </div>

      </div>
    </footer>
  );
}