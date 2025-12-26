import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import { User } from './types';
import { api } from './services/api';
import { supabase } from './lib/supabase';
import { ModalProvider } from './context/ModalContext';
import GlobalModal from './components/GlobalModal';
import LoadingScreen from './components/LoadingScreen';

// Pages
import HomePage from './pages/HomePage';
import { UserDashboard } from './pages/UserDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AuthPage from './pages/AuthPage';
import CheckoutPage from './pages/CheckoutPage';
import SetPasswordPage from './pages/SetPasswordPage';
import SponsorPage from './pages/SponsorPage';
import SchedulePage from './pages/SchedulePage';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const AuthRedirectHandler = ({ user }: { user: User | null }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  useEffect(() => {
    if (!user) return;
    if (location.pathname === '/set-password') return;
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('next') === 'set-password') {
       navigate('/set-password');
       return;
    }
    // Handle standard auth redirect param from Supabase
    if (location.hash.includes('type=recovery')) {
       navigate('/set-password', { replace: true });
    }
  }, [user, navigate, location.pathname, location.search]);

  return null;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Track current user ID to avoid redundant fetches on tab focus
  const currentUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    currentUserIdRef.current = user?.id || null;
  }, [user]);

  useEffect(() => {
    let mounted = true;

    // 1. Initial Fast Load
    const initAuth = async () => {
      try {
        const u = await api.auth.getUser();
        if (mounted) {
           if (u) {
             setUser(u);
             currentUserIdRef.current = u.id;
           } else {
             setUser(null);
             currentUserIdRef.current = null;
           }
           setLoading(false); // Unblock UI immediately
        }

        // 2. Background Verify (Fixes Admin Downgrade Issue)
        if (u) {
            const freshProfile = await api.auth.refreshProfile(u.id);
            if (freshProfile && mounted) {
                // If role/details changed in DB vs Session, update state
                setUser(prev => {
                    if (!prev) return null;
                    if (prev.role !== freshProfile.role || prev.firstName !== freshProfile.firstName || prev.stripeCustomerId !== freshProfile.stripeCustomerId) {
                        console.log('Syncing profile from DB...');
                        return { ...prev, ...freshProfile };
                    }
                    return prev;
                });
            }
        }
      } catch (e) {
        console.error("Auth Init Error", e);
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // 3. Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        currentUserIdRef.current = null;
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
           // OPTIMIZATION: If user ID matches current state, skip the full getUser() construction
           // This prevents "re-login" flash on tab switch/focus
           if (session.user.id === currentUserIdRef.current) {
               // Just run a silent background profile refresh to catch role changes
               api.auth.refreshProfile(session.user.id).then(fresh => {
                   if (fresh && mounted) {
                       setUser(prev => {
                           if (!prev) return null;
                           // Deep compare strictly necessary fields to avoid re-render
                           if (prev.role !== fresh.role || prev.firstName !== fresh.firstName || prev.stripeCustomerId !== fresh.stripeCustomerId) {
                               return { ...prev, ...fresh };
                           }
                           return prev; // Return same reference -> No Re-render
                       });
                   }
               });
               return;
           }

           // Full Fetch for new/different user
           const u = await api.auth.getUser(session.user);
           if (mounted) {
               setUser(u);
               currentUserIdRef.current = u ? u.id : null;
           }
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (loading) return <LoadingScreen text="Ascend Academy" />;

  return (
    <ModalProvider>
      <Router>
        <ScrollToTop />
        <AuthRedirectHandler user={user} />
        
        <Layout user={user} setUser={setUser}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/schedule" element={<SchedulePage user={user} />} />
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
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/checkout/:packageId" element={<CheckoutPage />} />
            <Route path="/set-password" element={<SetPasswordPage />} />
            <Route path="/sponsor" element={<SponsorPage />} />
            
            {/* 404 CATCH-ALL: Redirects any unknown route to Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
        
        <GlobalModal />
      </Router>
    </ModalProvider>
  );
};

export default App;