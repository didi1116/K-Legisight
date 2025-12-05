// src/lib/mockData.js
// --- 2. HÀM TẠO PROFILE NGHỊ SĨ GIẢ ---
export const getMockLegislatorProfile = (name) => ({
  type: "person",
  name: name,
  party: "더불어민주당",
  committee: "과학기술정보방송통신위원회",
  region: "서울 마포구을",
  gender: "남",
  count: "3선",
  method: "지역구",
  total_bills: 142
});

// --- 3. HÀM TẠO PROFILE ĐẢNG GIẢ ---
export const getMockPartyProfile = (partyName, color) => ({
  type: "party",
  name: partyName,
  party: "원내교섭단체",
  committee: "전체 위원회",
  region: "대한민국",
  count: color === "blue" ? "170석" : "108석",
  method: "정당",
  total_bills: 1250
});

// --- 4. HÀM TẠO DANH SÁCH DỰ LUẬT GIẢ ---
// type: 'person' (tìm theo người) hoặc 'party' (tìm theo đảng)
export const getMockBills = (count = 15, type = 'person') => {
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    billNumber: `221453${i}`,
    // Nếu là tìm Người -> Ông đó đề xuất
    // Nếu là tìm Đảng -> Đảng đề xuất
    proposer: type === 'person' ? `김철수 외 10인` : `박찬대 외 168인`,
    billName: type === 'person' 
      ? `인공지능 산업 육성 및 신뢰 기반 조성에 관한 법률안 (대안) - ${i}`
      : `민생 회복 지원금 지급 조례안 - ${i}`,
    date: `2024-0${(i % 9) + 1}-15`,
    sentiment: i % 3 === 0 ? "비협력" : i % 2 === 0 ? "협력" : "중립",
    score: i % 3 === 0 ? 30 : i % 2 === 0 ? 95 : 50,
    role: i % 2 === 0 ? "대표발의" : "공동발의"
  }));
};

// --- 5. HÀM TẠO DANH SÁCH THÀNH VIÊN ĐẢNG GIẢ (Cho trang Detail) ---
export const getMockPartyMembers = (count = 10) => {
  return Array.from({ length: count }).map((_, i) => ({
    id: i + 1,
    name: i === 0 ? "박찬대" : `의원 ${i + 1}`,
    party: "더불어민주당",
    role: i === 0 ? "대표발의" : "공동발의",
    sentiment: i % 4 === 0 ? "적극 찬성" : "찬성",
    score: i % 4 === 0 ? 98 : 85,
    committee: "교육위원회",
    region: i % 2 === 0 ? "서울 마포구을" : "비례대표",
    gender: i % 2 === 0 ? "남" : "여",
    count: i % 3 === 0 ? "초선" : "재선",
    method: i % 2 === 0 ? "지역구" : "비례대표",
    img: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`
  }));
};

// --- 6. HÀM TẠO DANH SÁCH PHÁT BIỂU GIẢ (Cho trang Detail) ---
export const getMockSpeeches = (count = 10) => {
  return Array.from({ length: count }).map((_, i) => ({
    id: i + 1,
    text: i % 2 === 0 
      ? "본 의원은 이번 개정안이 AI 산업 발전에 필수적이라고 생각하며, 예산 지원 확대에 적극 동의합니다. 이는 국가 경쟁력을 좌우할 중차대한 사안입니다." 
      : "다만, 제3조 2항의 규제 조항은 스타트업에게 부담이 될 수 있으므로 신중한 검토가 필요합니다. 규제가 혁신을 저해해서는 안 됩니다.",
    sentiment: i % 3 === 0 ? "비협력" : i % 2 === 0 ? "협력" : "중립",
    score: i % 3 === 0 ? 30 : i % 2 === 0 ? 95 : 50,
  }));
};

// src/lib/mockData.js

// ... (Phần DISTRICTS giữ nguyên) ...

// Hàm tạo danh sách 300 nghị sĩ giả lập
export const getMockLegislators = () => {
  return Array.from({ length: 298 }).map((_, i) => {
    // Giả lập tỷ lệ đảng
    let party = "무소속";
    if (i < 170) party = "더불어민주당";
    else if (i < 278) party = "국민의힘";
    else party = "조국혁신당";

    // Giả lập độ tuổi (cho lọc)
    const ageRandom = Math.floor(Math.random() * 40) + 30; // 30 ~ 70
    const ageGroup = Math.floor(ageRandom / 10) * 10 + "대"; // "30대", "40대"...

    return {
      id: i + 1,
      name: i % 2 === 0 ? `김철수 ${i+1}` : `이영희 ${i+1}`,
      party: party,
      committee: i % 2 === 0 ? "과학기술정보방송통신위원회" : "법제사법위원회",
      region: i % 2 === 0 ? "서울 마포구을" : "부산 해운대구갑",
      gender: i % 3 === 0 ? "여" : "남",
      count: i % 4 === 0 ? "초선" : "재선",
      method: i % 5 === 0 ? "비례대표" : "지역구",
      age: ageGroup, // <--- CÁI MỚI: Độ tuổi
      score: Math.floor(Math.random() * 40) + 60,
      total_bills: Math.floor(Math.random() * 100) + 50,
      img: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`
    };
  });
};
