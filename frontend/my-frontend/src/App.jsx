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
import { BillAnalysis } from './pages/BillAnalysis.jsx'
import { Dashboard } from './pages/Dashboard.jsx'

import PrivateRoute from './components/PrivateRoute.jsx';
import { ScrollToTop } from './components/ScrollToTop.jsx';

import './index.css'

function App() {
  const locate = useLocation();
  const hideHeaderRoutes = ['/login', '/register', '/home'];
  const showHeader = !hideHeaderRoutes.includes(locate.pathname);
  const hideFooterRoutes = ['/login', '/register'];
  const showFooter = !hideFooterRoutes.includes(locate.pathname);
  
  return (
    <div className ="flex flex-col min-h-screen font-sans">
      <ScrollToTop />
      {showHeader && <Header />}
      <div className="flex-1">
      <Routes>
        {/* Mặc định vào thẳng Home */}
        <Route path="/" element={<Navigate to="/home" />} /> 
        
        {/* Trang Home giờ ai cũng vào được */}
        <Route path="/home" element={<Home />} />

        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<SignupForm />} />


        
        <Route element={<PrivateRoute />}>
            {/* Các chức năng chuyên sâu */}
            <Route path="/sentimentpage" element = {<SentimentLanding/>} />              
            <Route path="/sentiment/member" element={<LegislatorAnalysis />} />          
            <Route path="/analysis/person-view" element={<LegislatorDashboard />} />         
            <Route path ="/analysis/detail" element={<LegislatorBillDetail />} />        
            <Route path="/sentiment/party" element={<PartyAnalysisPage/>} />             
            <Route path="/sentiment/committee" element={<CommitteeAnalysisPage/>}/>      
            <Route path="/sentiment/bill" element={<BillSearchPage/>}/>
            <Route path ="/analysis/bill-view" element={<BillAnalysis />} />

            <Route path ="/billprediction" element={<BillPrediction />} />               
            <Route path ="/analysis/party-members" element={<PartyBillMembers />} />  
            <Route path="/dashboard" element={<Dashboard />} />
        </Route>

      </Routes>
      </div>
    {showFooter && <Footer />}
    </div>
  );
}

export default App;