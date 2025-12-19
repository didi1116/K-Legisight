import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = () => {
    // Kiểm tra xem đã có token trong localStorage chưa
    // (Lúc đăng nhập thành công bạn nhớ set: localStorage.setItem('access_token', token))
    const isAuthenticated = localStorage.getItem('access_token'); 

    // Nếu có token -> Cho hiện nội dung (Outlet)
    // Nếu không -> Đá về trang /login
    return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;