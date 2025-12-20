import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import { User } from './types';
import { api } from './services/api';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { Loader2 } from 'lucide-react';

// Pages
import HomePage from './pages/HomePage';
import UserDashboard from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AuthPage from './pages/AuthPage';
import CheckoutPage from './pages/CheckoutPage';
import SetPasswordPage from './pages/SetPasswordPage';
import SponsorPage from './pages/SponsorPage';

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
    if (!user) return;
    
    // Check if we are ALREADY on the set-password page. 
    // If so, do not try to redirect there again, otherwise we get a loop.
    if (location.pathname === '/set-password') return;

    // 1. Check search params (e.g. site.com/?next=set-password#...)
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('next') === 'set-password') {
       navigate('/set-password');
       return;
    }

    // 2. Check hash params (e.g. site.com/#/?next=set-password)
    const hashParts = window.location.hash.split('?');
    if (hashParts.length > 1) {
      const params = new URLSearchParams(hashParts[1]);
      const next = params.get('next');
      
      if (next === 'set-password') {
         navigate('/set-password', { replace: true });
      }
    }
  }, [user, navigate, location.pathname]);

  return null;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authProcessing, setAuthProcessing] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    // Detect if we are returning from a Magic Link (access_token in hash)
    if (window.location.hash.includes('access_token') || window.location.hash.includes('type=recovery')) {
      setAuthProcessing(true);
    }

    // Initialize Auth Listener
    // This is the SINGLE source of truth for auth state to prevent race conditions
    let authSubscription: any = null;

    const initAuth = async () => {
      if (!isSupabaseConfigured) {
        // Fallback for Demo Mode (Mock)
        try {
            const u = await api.auth.getUser();
            if (mounted) setUser(u);
        } catch(e) { console.error(e); } 
        finally { if (mounted) setLoading(false); }
        return;
      }

      // Setup Supabase Listener
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        // Events: INITIAL_SESSION, SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.
        if (event === 'SIGNED_OUT') {
           if (mounted) {
             setUser(null);
             setLoading(false);
             setAuthProcessing(false);
           }
        } else if (session?.user) {
           // For SIGNED_IN, TOKEN_REFRESHED, INITIAL_SESSION
           const u = await api.auth.getUser(session.user);
           if (mounted) {
             setUser(u);
             setLoading(false);
             setAuthProcessing(false);
           }
        } else {
           // No session found (e.g. initial load guest)
           if (mounted) setLoading(false);
        }
      });
      authSubscription = data.subscription;
    };

    initAuth();

    return () => {
      mounted = false;
      if (authSubscription) authSubscription.unsubscribe();
    };
  }, []);

  // Show Loader ONLY if initially loading or processing a magic link token
  if (loading || authProcessing) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 p-4">
        <div className="text-co-yellow font-teko text-5xl animate-pulse tracking-widest text-center uppercase">
          {authProcessing ? 'Verifying Link...' : 'Ascend Academy'}
        </div>
        <div className="w-64 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-co-red animate-[shimmer_0.5s_infinite] w-1/2"></div>
        </div>
    </div>
  );

  return (
    <Router>
      <ScrollToTop />
      <AuthRedirectHandler user={user} />
      
      {!isSupabaseConfigured && (
        <div className="fixed bottom-4 right-4 z-50 bg-co-yellow text-black text-xs font-bold px-3 py-1 rounded shadow-lg uppercase opacity-80 hover:opacity-100 pointer-events-none font-teko tracking-wide">
          Demo Mode
        </div>
      )}
      
      <Layout user={user} setUser={setUser}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route 
            path="/login" 
            element={!user ? <AuthPage setUser={setUser} /> : <Navigate to="/dashboard" replace />} 
          />
          
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

          <Route 
            path="/sponsor" 
            element={<SponsorPage />} 
          />
          
          {/* Catch-all route to redirect back home if 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;