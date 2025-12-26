import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    let mounted = true;

    // 1. Initial Fast Load
    const initAuth = async () => {
      try {
        const u = await api.auth.getUser();
        if (mounted) {
           setUser(u);
           setLoading(false); // Unblock UI immediately
        }

        // 2. Background Verify (Fixes Admin Downgrade Issue)
        if (u) {
            const freshProfile = await api.auth.refreshProfile(u.id);
            if (freshProfile && mounted) {
                // If role/details changed in DB vs Session, update state
                if (freshProfile.role !== u.role || freshProfile.firstName !== u.firstName) {
                    console.log('Syncing profile from DB...');
                    setUser(prev => prev ? ({ ...prev, ...freshProfile }) : null);
                }
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
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
           const u = await api.auth.getUser(session.user);
           if (mounted) setUser(u);
           // Also trigger background verify
           if (u) {
             api.auth.refreshProfile(u.id).then(fresh => {
                if (fresh && mounted) setUser(prev => prev ? ({...prev, ...fresh}) : null);
             });
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