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
  
  useEffect(() => {
    // Check for "next" param in the hash query (HashRouter style: #/?next=...)
    const hashParts = window.location.hash.split('?');
    if (hashParts.length > 1) {
      const params = new URLSearchParams(hashParts[1]);
      const next = params.get('next');
      
      if (user && next === 'set-password') {
         // Clean the URL so we don't loop
         navigate('/set-password', { replace: true });
      }
    }
  }, [user, navigate]);

  return null;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authProcessing, setAuthProcessing] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Detect if we are returning from a Magic Link (access_token in hash)
    // We set authProcessing to true to hide the app while Supabase parses the hash
    if (window.location.hash.includes('access_token') || window.location.hash.includes('type=recovery')) {
      setAuthProcessing(true);
    }

    const checkUser = async () => {
      try {
        // 1. Get Session (Supabase handles URL hash parsing internally here)
        let sessionUser = null;
        if (isSupabaseConfigured) {
            const { data } = await supabase.auth.getSession();
            sessionUser = data.session?.user;
        }

        // 2. Fetch App User Profile
        const u = await api.auth.getUser(sessionUser);
        if (mounted) setUser(u);

      } catch (e) {
        console.error("Initial user check failed:", e);
      } finally {
        if (mounted) {
          setLoading(false);
          setAuthProcessing(false);
        }
      }
    };

    checkUser();

    // 3. Listen for Auth Changes (Sign In, Sign Out, Token Refresh)
    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            const u = await api.auth.getUser(session?.user);
            if (mounted) {
              setUser(u);
              setAuthProcessing(false); // Stop showing loader once signed in
            }
        } else if (event === 'SIGNED_OUT') {
            if (mounted) setUser(null);
        }
      });
      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    }
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
          
          {/* Catch-all route to redirect back home if 404 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;