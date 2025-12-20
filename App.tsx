import React, { useState, useEffect, useRef } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import { User } from './types';
import { api } from './services/api';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { TriangleAlert, Loader2 } from 'lucide-react';

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
  const processedRef = useRef(false);
  
  useEffect(() => {
    if (processedRef.current) return;

    // In HashRouter, query params might be after the hash
    // We check both standard location search and hash-based search if needed
    const params = new URLSearchParams(window.location.search);
    let next = params.get('next');
    
    // Also check if the 'next' param is embedded in the hash part (common in some auth flows)
    if (!next && window.location.hash.includes('next=')) {
        const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
        next = hashParams.get('next');
    }

    // Only proceed if we have a destination and a user
    if (user && next === 'set-password') {
       console.log('User authenticated, executing redirect to:', next);
       processedRef.current = true;
       setTimeout(() => {
         navigate('/set-password');
       }, 100);
    }
  }, [user, navigate]);

  return null;
};

// Helper to determine where to send the user after login
const getPostLoginRedirect = (user: User) => {
  // Check for redirect param
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get('redirect');
  if (redirect) return decodeURIComponent(redirect);
  
  return user.role === 'ADMIN' ? "/admin" : "/dashboard";
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Check if we are in the middle of a hash-based auth redirect (Magic Link)
    const hasAuthHash = window.location.hash && window.location.hash.includes('access_token');
    
    // Safety Timeout
    const safetyTimer = setTimeout(() => {
      if (mounted && loading) {
        console.warn('Auth check timed out, forcing app load.');
        setLoading(false);
      }
    }, hasAuthHash ? 5000 : 2000); 

    // 1. Check initial session
    const checkUser = async () => {
      try {
        let sessionUser = null;
        
        if (isSupabaseConfigured) {
            const { data } = await supabase.auth.getSession();
            sessionUser = data.session?.user;
            if (sessionUser) console.log("Session restored");
        }

        const u = await api.auth.getUser(sessionUser);
        if (mounted) setUser(u);

      } catch (e) {
        console.error("Initial user check failed:", e);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    checkUser();

    // 2. Listen for auth changes
    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        try {
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
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 p-4">
        <div className="text-co-yellow font-teko text-5xl animate-pulse tracking-widest text-center uppercase">
          {window.location.hash.includes('access_token') ? 'Verifying...' : 'Ascend Academy'}
        </div>
        
        <div className="w-64 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-co-red animate-[shimmer_1s_infinite] w-1/2"></div>
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
            element={!user ? <AuthPage setUser={setUser} /> : <Navigate to={getPostLoginRedirect(user)} replace />} 
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