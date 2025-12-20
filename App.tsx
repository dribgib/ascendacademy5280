import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
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
import SetPasswordPage from './pages/SetPasswordPage';

// Scroll to top helper
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Component to handle redirect logic after auth
const AuthRedirectHandler = ({ user }: { user: User | null }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = params.get('next');

    // Only redirect if we have a destination AND a user is authenticated
    // This ensures Supabase has processed the hash token before we navigate away and clear it
    if (next === 'set-password' && user) {
       // Clear the query param to clean up URL
       const newUrl = window.location.pathname + window.location.hash;
       window.history.replaceState({}, '', newUrl);
       navigate('/set-password');
    }
  }, [navigate, location, user]);

  return null;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // 0. Safety Timeout: Ensure loading screen never hangs indefinitely
    const safetyTimer = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth check timed out, forcing app load.');
        setLoading(false);
      }
    }, 4000); // 4 seconds max load time

    // 1. Check initial session
    const checkUser = async () => {
      try {
        const u = await api.auth.getUser();
        if (mounted) setUser(u);
      } catch (e) {
        console.error("Initial user check failed:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    checkUser();

    // 2. Listen for auth changes (Only valid if using real Supabase)
    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        try {
            // If we have a session user, optimize by passing it directly to avoid extra network call
            if (session?.user) {
              const u = await api.auth.getUser(session.user);
              if (mounted) setUser(u);
            } else if (event === 'SIGNED_OUT') {
              if (mounted) setUser(null);
            }
        } catch (err) {
            console.error("Auth state change error:", err);
        } finally {
            if (mounted) setLoading(false);
        }
      });
      return () => {
        mounted = false;
        clearTimeout(safetyTimer);
        subscription.unsubscribe();
      };
    } else {
        return () => { mounted = false; clearTimeout(safetyTimer); };
    }
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <div className="text-co-yellow font-teko text-4xl animate-pulse tracking-widest">LOADING ACADEMY...</div>
        <div className="w-64 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-co-red animate-[shimmer_1s_infinite] w-1/2"></div>
        </div>
    </div>
  );

  return (
    <Router>
      <ScrollToTop />
      <AuthRedirectHandler user={user} />
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

          <Route 
            path="/set-password" 
            element={<SetPasswordPage />} 
          />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;