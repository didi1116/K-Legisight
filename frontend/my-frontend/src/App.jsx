// src/App.jsx
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Header } from './assets/Header.jsx'
import { Footer } from './assets/Footer.jsx'
import { LoginForm } from './pages/LoginForm.jsx'
import { SignupForm } from './pages/RegisterForm.jsx' 
import { Home } from './pages/Home.jsx';
import { LegislatorAnalysis } from './pages/LegislatorAnalysis';
import { LegislatorBillDetail } from './pages/LegislatorBillDetail';
import { BillPrediction } from './pages/BillPrediction.jsx'
import { PartyBillMembers } from './pages/PartyBillMembers.jsx'
import { LegislatorDashboard } from './pages/LegislatorDashboard.jsx';
import SentimentLanding from './pages/SentimentLanding.jsx'
import PartyAnalysisPage from './pages/PartyAnalysisPage.jsx'
import CommitteeAnalysisPage from './pages/CommitteeAnalysisPage.jsx'
import { BillSearchPage } from './pages/BillSearchPage.jsx'


import './index.css'


function App() {
  const locate = useLocation();

  const hideHeaderRoutes = ['/home','/login', '/register'];
  const showHeader = !hideHeaderRoutes.includes(locate.pathname);

  const hideFooterRoutes = ['/login', '/register'];
  const showFooter = !hideFooterRoutes.includes(locate.pathname);


  
  return (
    <div className ="flex flex-col min-h-screen font-sans">
      {showHeader && <Header />}
      <div className="flex-1">
      <Routes>
        <Route path="/" element={<Navigate to="/home" />} /> 
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<SignupForm />} />
        <Route path="/home" element={<Home />} />
        <Route path="/sentimentpage" element = {<SentimentLanding/>} />               //phân tích cảm xúc chính
        <Route path="/sentiment/member" element={<LegislatorAnalysis />} />           //phân tích nghị sĩ
        <Route path="/analysis/person-view" element={<LegislatorDashboard />} />      // Trang hồ sơ cá nhân nghị sĩ         
        <Route path ="/analysis/detail" element={<LegislatorBillDetail />} />        // Trang chi tiết dự luật của nghị s
        <Route path="/sentiment/party" element={<PartyAnalysisPage/>} />             //phân tích theo đảng trang chính
        <Route path="/sentiment/committee" element={<CommitteeAnalysisPage/>}/>      //phân tích theo ủy ban
        <Route path="/sentiment/bill" element={<BillSearchPage/>}/>

        <Route path ="/billprediction" element={<BillPrediction />} />                // Trang dự đoán dự luật
        <Route path ="/analysis/party-members" element={<PartyBillMembers />} />  
        
                 {/* Placeholder */}
      </Routes>
      </div>
    {showFooter && <Footer />}
    </div>
  );
}

export default App;