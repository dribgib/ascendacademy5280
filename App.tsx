import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { User } from './types';
import { AuthService } from './services/mockService';

// Pages
import HomePage from './pages/HomePage';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AuthPage from './pages/AuthPage';

// Scroll to top helper
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session (mock)
    const u = AuthService.getCurrentUser();
    setUser(u);
    setLoading(false);
  }, []);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-co-yellow font-teko text-3xl">LOADING ACADEMY...</div>;

  return (
    <Router>
      <ScrollToTop />
      <Layout user={user} setUser={setUser}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<AuthPage setUser={setUser} />} />
          
          <Route 
            path="/dashboard" 
            element={user && user.role === 'PARENT' ? <UserDashboard user={user} /> : <Navigate to={user?.role === 'ADMIN' ? "/admin" : "/login"} replace />} 
          />
          
          <Route 
            path="/admin" 
            element={user && user.role === 'ADMIN' ? <AdminDashboard user={user} /> : <Navigate to="/login" replace />} 
          />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;
