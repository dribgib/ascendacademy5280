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
    
    // Safety timeout to prevent infinite loading screens
    const safetyTimeout = setTimeout(() => {
        if (mounted && (loading || authProcessing)) {
            console.warn("Auth check timed out - forcing render.");
            setLoading(false);
            setAuthProcessing(false);
        }
    }, 5000); // 5 seconds max

    // Detect if we are returning from a Magic Link (access_token in hash)
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
          // Don't turn off authProcessing yet if we are in a hash redirect flow, 
          // allow the onAuthStateChange to handle completion if needed, or the timeout.
          if (!window.location.hash.includes('access_token')) {
             setAuthProcessing(false);
          }
        }
      }
    };

    checkUser();

    // 3. Listen for Auth Changes (Sign In, Sign Out, Token Refresh)
    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        // Only react to explicit sign in/out events to avoid fighting with checkUser
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            const u = await api.auth.getUser(session?.user);
            if (mounted) {
              setUser(u);
              setAuthProcessing(false); 
              setLoading(false);
            }
        } else if (event === 'SIGNED_OUT') {
            if (mounted) {
                setUser(null);
                setLoading(false);
                setAuthProcessing(false);
            }
        }
      });
      return () => {
        mounted = false;
        clearTimeout(safetyTimeout);
        subscription.unsubscribe();
      };
    } else {
        return () => {
            mounted = false;
            clearTimeout(safetyTimeout);
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