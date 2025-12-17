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
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

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

    // 2. Listen for auth changes (login/logout/signup)
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
  }, []);

  // CONFIGURATION CHECK SCREEN
  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 font-poppins">
        <div className="bg-zinc-900 border border-red-900 p-8 rounded-lg max-w-3xl w-full text-white shadow-2xl">
          <h1 className="text-4xl font-teko text-red-500 mb-4 flex items-center gap-3 uppercase">
            <TriangleAlert size={40} /> Configuration Missing
          </h1>
          <p className="text-zinc-300 mb-6 text-lg">
            The application cannot connect to the database because the environment variables are not loaded.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-black p-6 rounded border border-zinc-800">
              <h3 className="font-bold text-co-yellow text-lg uppercase font-teko mb-3">Running Locally? (localhost)</h3>
              <p className="text-sm text-zinc-500 mb-4">
                Vercel settings do not sync to localhost automatically. You must create a local file.
              </p>
              <p className="text-sm text-white mb-2">1. Create a file named <code className="bg-zinc-800 px-1 rounded text-co-blue">.env</code> in the project root.</p>
              <p className="text-sm text-white mb-2">2. Paste this content into it:</p>
              <pre className="text-xs bg-zinc-900 border border-zinc-700 p-3 rounded text-green-400 overflow-x-auto whitespace-pre-wrap font-mono mt-2">
VITE_PUBLIC_SUPABASE_URL=https://api.ascendacademy5280.com
VITE_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_XROcSoH4Xvg_Ias4cGELbw_iTbXEyxQ
              </pre>
              <p className="text-xs text-zinc-500 mt-2 italic">* Restart your local server after creating this file.</p>
            </div>

            <div className="bg-black p-6 rounded border border-zinc-800">
              <h3 className="font-bold text-co-red text-lg uppercase font-teko mb-3">Running on Vercel?</h3>
              <p className="text-sm text-zinc-500 mb-4">
                If you added the variables to Vercel Settings <strong>after</strong> the last deployment, the app doesn't know about them yet.
              </p>
              <ol className="list-decimal list-inside text-sm text-white space-y-2">
                <li>Go to your Vercel Project Dashboard.</li>
                <li>Click the <strong>Deployments</strong> tab.</li>
                <li>Click the three dots <span className="text-zinc-500">(...)</span> next to the latest deployment.</li>
                <li>Select <strong>Redeploy</strong>.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-co-yellow font-teko text-3xl animate-pulse">LOADING ACADEMY...</div>;

  return (
    <Router>
      <ScrollToTop />
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
        </Routes>
      </Layout>
    </Router>
  );
};

export default App;