import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import { User } from './types';
import { api } from './services/api';
import { supabase } from './lib/supabase';
import { ModalProvider } from './context/ModalContext';
import GlobalModal from './components/GlobalModal';

// Pages
import HomePage from './pages/HomePage';
import { UserDashboard } from './pages/UserDashboard';
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

    // 1. Check search params (e.g. site.com/?next=set-password)
    // Note: With HashRouter, query params are after the hash like #/path?next=...
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('next') === 'set-password') {
       navigate('/set-password');
       return;
    }

    // 2. Check hash params fallback (handling legacy/external redirects)
    // In HashRouter, window.location.hash includes the path.
    // We check if the raw hash string contains the param.
    if (window.location.hash.includes('next=set-password')) {
       navigate('/set-password', { replace: true });
    }
  }, [user, navigate, location.pathname, location.search]);

  return null;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authProcessing, setAuthProcessing] = useState(false);

  useEffect(() => {
    console.log("Ascend Academy App v2.5 (Stable Auth) Loaded");
    let mounted = true;
    
    // Detect if we are returning from a Magic Link (access_token in hash)
    if (window.location.hash.includes('access_token') || window.location.hash.includes('type=recovery')) {
      setAuthProcessing(true);
    }

    // Failsafe: If loading takes too long, force it off.
    // INCREASED TIMEOUT to 6s to allow the 5s DB check in api.ts to complete first.
    const safetyTimer = setTimeout(() => {
      if (mounted && (loading || authProcessing)) {
        console.warn("Auth check timed out. Forcing app load.");
        setLoading(false);
        setAuthProcessing(false);
      }
    }, 6000);

    // 1. Setup Listener for FUTURE changes (Sign In, Sign Out during usage)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth Event:', event);
      
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Only fetch if we don't have the user yet or if it's a new session
        if (session?.user) {
           // We might already have the user from the initial check, but getting it again ensures sync
           try {
             // Use a simpler fetch here to avoid race conditions with the main check
             const u = await api.auth.getUser(session.user);
             if (mounted) setUser(u);
           } catch (e) {
             console.error("Error refreshing user in listener:", e);
           }
        }
      }
    });

    // 2. Perform IMMEDIATE check for current session to unblock loading screen
    const checkSession = async () => {
      try {
        console.log("Checking session...");
        // Race the session check against a timeout
        // INCREASED TIMEOUT to 6000ms to allow cold starts
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Session timeout')), 6000));
        
        // @ts-ignore
        const { data: { session }, error } = await Promise.race([sessionPromise, timeoutPromise])
            .catch(e => ({ data: { session: null }, error: e }));
        
        if (error) {
           console.warn("Session check warning:", error);
           if (mounted) setUser(null);
        } else if (session?.user) {
           console.log("Session found, fetching user profile...");
           const u = await api.auth.getUser(session.user);
           if (mounted) setUser(u);
        } else {
           console.log("No active session.");
           if (mounted) setUser(null);
        }
      } catch (err) {
        console.error("Critical Auth Error:", err);
      } finally {
        if (mounted) {
          clearTimeout(safetyTimer); // Clear the backup timer since we finished naturally
          setLoading(false);
          setAuthProcessing(false);
        }
      }
    };

    checkSession();

    return () => {
      mounted = false;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
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
    <ModalProvider>
      <Router>
        <ScrollToTop />
        <AuthRedirectHandler user={user} />
        
        <Layout user={user} setUser={setUser}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route 
              path="/login" 
              element={!user ? <AuthPage setUser={setUser} /> : <Navigate to="/dashboard" replace />} 
            />
            
            <Route 
              path="/dashboard" 
              element={user ? <UserDashboard user={user} /> : <Navigate to="/login" replace />} 
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
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
        
        <GlobalModal />
      </Router>
    </ModalProvider>
  );
};

export default App;