import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { User } from './types';
import { api } from './services/api';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { TriangleAlert } from 'lucide-react';

// Pages
import HomePage from './pages/HomePage';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AuthPage from './pages/AuthPage';
import CheckoutPage from './pages/CheckoutPage';

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
    // 1. Check initial session
    const checkUser = async () => {
      try {
        const u = await api.auth.getUser();
        setUser(u);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    checkUser();

    // 2. Listen for auth changes (Only valid if using real Supabase)
    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          const u = await api.auth.getUser();
          setUser(u);
        } else {
          setUser(null);
        }
        setLoading(false);
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-co-yellow font-teko text-3xl animate-pulse">LOADING ACADEMY...</div>;

  return (
    <Router>
      <ScrollToTop />
      {/* Mock Mode Indicator */}
      {!isSupabaseConfigured && (
        <div className="fixed bottom-4 right-4 z-50 bg-co-yellow text-black text-xs font-bold px-3 py-1 rounded shadow-lg uppercase opacity-80 hover:opacity-100 pointer-events-none">
          Demo Mode
        </div>
      )}
      
      <Layout user={user} setUser={setUser}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={!user ? <AuthPage setUser={setUser} /> : <Navigate to={user.role === 'ADMIN' ? "/admin" : "/dashboard"} />} />
          
          <Route 
            path="/dashboard" 
            element={user && user.role === 'PARENT' ? <UserDashboard user={user} /> : <Navigate to={user?.role === 'ADMIN' ? "/admin" : "/login"} replace />} 
          />
          
          <Route 
            path="/admin" 
            element={user && user.role === 'ADMIN' ? <AdminDashboard user={user} /> : <Navigate to="/login" replace />} 
          />

          <Route 
            path="/checkout/:packageId" 
            element={<CheckoutPage />} 
          />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;