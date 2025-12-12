// src/pages/BillAnalysis.jsx
import React, { useMemo, useState } from "react";
import { FileText, FileSearch, Users, BarChart3, Loader2, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const INITIAL_FORM = {
  bill_name: "인공지능",
  bill_number: "",
  proposer: "",
  submission_type: "all",
};

export function BillAnalysis() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [billInfo, setBillInfo] = useState(null);
  const [stats, setStats] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSearch = async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("http://localhost:8000/api/bills/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.detail || "법안 분석 요청에 실패했습니다.");
      }

      setBillInfo(data.bill_info || null);
      setStats(data.stats || null);
      setMessage(data.message || "");

      if (!data.stats?.total_speeches) {
        setError("해당 검색 조건에 대한 발언 데이터가 없습니다.");
      }
    } catch (err) {
      setBillInfo(null);
      setStats(null);
      setError(err.message || "요청 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const hasPartyData = useMemo(() => {
    return Boolean(stats?.party_breakdown && stats.party_breakdown.length > 0);
  }, [stats]);

  const scoreTone = (score) => {
    if (score >= 70) return { color: "text-emerald-600", label: "협력적 분위기" };
    if (score <= 40) return { color: "text-rose-600", label: "갈등 요소 존재" };
    return { color: "text-amber-600", label: "부분 협력" };
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <FileSearch className="w-6 h-6 text-blue-700" />
            <h1 className="text-3xl font-bold text-slate-900">법안 중심 검색 (Bill Analysis)</h1>
          </div>
          <p className="text-slate-500">
            법안별 발언 수, 전체 및 정당별 협력도를 분석합니다.
          </p>
        </div>

        {/* Search Form */}
        <Card className="shadow-sm border-0">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-slate-600 font-medium">법안명 (Bill Name)</label>
                <Input
                  value={form.bill_name}
                  onChange={(e) => handleChange("bill_name", e.target.value)}
                  placeholder="예: 인공지능"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-600 font-medium">의안번호 (No.)</label>
                <Input
                  value={form.bill_number}
                  onChange={(e) => handleChange("bill_number", e.target.value)}
                  placeholder="예: 2200123"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-600 font-medium">발의자 (Proposer)</label>
                <Input
                  value={form.proposer}
                  onChange={(e) => handleChange("proposer", e.target.value)}
                  placeholder="의원명 입력"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-slate-600 font-medium">제출유형 (Type)</label>
                <Select
                  value={form.submission_type}
                  onValueChange={(val) => handleChange("submission_type", val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="전체 (All)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 (All)</SelectItem>
                    <SelectItem value="의원">의원</SelectItem>
                    <SelectItem value="정부">정부</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSearch} disabled={loading} className="gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                검색 및 분석
              </Button>
            </div>
            {error && <div className="text-sm text-rose-600">{error}</div>}
            {!error && message && <div className="text-sm text-slate-500">{message}</div>}
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {billInfo && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-900 text-white rounded-xl p-6 shadow-lg space-y-3">
              <Badge variant="outline" className="bg-slate-800 text-slate-200 border-slate-700">
                {billInfo.bill_no || "N/A"}
              </Badge>
              <div className="space-y-1">
                <p className="text-sm text-blue-200">법안</p>
                <div className="flex items-start gap-2">
                  <FileText className="w-5 h-5 mt-0.5 text-blue-200" />
                  <h3 className="text-xl font-semibold leading-tight">{billInfo.bill_name}</h3>
                </div>
              </div>
              <p className="text-sm text-slate-200">발의: {billInfo.proposer}</p>
            </div>

            <Card className="shadow-sm">
              <CardContent className="p-6 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-10 h-10 text-blue-600" />
                  <div>
                    <p className="text-sm text-slate-500">전체 발언 수</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {stats?.total_speeches ?? 0}회
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-500">심사 과정에서의 총 발언 횟수</p>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-6 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-10 h-10 text-rose-600" />
                  <div>
                    <p className="text-sm text-slate-500">전체 협력도 (평균)</p>
                    <p className={`text-2xl font-bold ${scoreTone(stats?.total_cooperation ?? 0).color}`}>
                      {stats?.total_cooperation ?? 0}점 <span className="text-base text-slate-500">/ 100</span>
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-500">{scoreTone(stats?.total_cooperation ?? 0).label}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Party Breakdown */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Users className="w-5 h-5 text-blue-600" />
              정당별 협력도 (Party Cooperation Score)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {hasPartyData ? (
              <div className="space-y-4">
                {stats.party_breakdown.map((p) => (
                  <div key={p.party_name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-slate-100 text-slate-700 border-slate-200">
                          {p.party_name}
                        </Badge>
                        <span className="text-slate-500">{p.member_count}명</span>
                      </div>
                      <span className="font-semibold text-slate-800">{p.avg_score}점</span>
                    </div>
                    <Progress value={p.avg_score} className="h-2" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500">정당별 데이터가 충분하지 않습니다.</div>
            )}
          </CardContent>
        </Card>

        {/* Member & Speech detail */}
        {stats?.individual_members?.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-900">주요 발언자 (Top Speakers)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {stats.individual_members.slice(0, 5).map((m) => (
                <div key={`${m.member_name}-${m.party_name}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center">
                      {m.member_name?.slice(0, 2) || "??"}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{m.member_name}</div>
                      <div className="text-sm text-slate-500">{m.party_name} · {m.n_speeches}회 발언</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-500">평균 협력도</div>
                    <div className="text-lg font-bold text-slate-900">{m.score}점</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {stats?.speeches_content?.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-900">발언 상세</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stats.speeches_content.slice(0, 6).map((s) => (
                <div key={s.speech_id} className="p-4 rounded-lg bg-slate-100 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <FileText className="w-4 h-4" />
                      <span className="font-semibold text-slate-800">{s.member_name}</span>
                      <span className="text-slate-500">({s.party_name})</span>
                    </div>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                      {s.score}점
                    </Badge>
                  </div>
                  <Separator />
                  <p className="text-sm text-slate-700 leading-relaxed max-h-20 overflow-hidden">
                    {s.text}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
