import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { User } from '../types';

interface AuthPageProps {
  setUser: (user: User) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ setUser }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Determine mode from URL query param
    const params = new URLSearchParams(location.search);
    const mode = params.get('mode');
    if (mode === 'signup') {
      setIsLogin(false);
    } else {
      setIsLogin(true);
    }
  }, [location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Standard Login
        const { error } = await api.auth.signIn(email, password);
        if (error) throw error;
        // Auth listener in App.tsx will handle the rest
      } else {
        // Magic Link Sign Up
        const env = (import.meta as any).env || {};
        const siteUrl = env.VITE_SITE_URL || window.location.origin;
        const baseUrl = siteUrl.endsWith('/') ? siteUrl.slice(0, -1) : siteUrl;
        const redirectUrl = `${baseUrl}/?next=set-password`;
        
        console.log('Initiating Magic Link with redirect:', redirectUrl);

        const { error } = await api.auth.signInWithOtp(
          email, 
          { firstName, lastName, phone }, // Metadata
          redirectUrl
        );

        if (error) throw error;
        setMagicLinkSent(true);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="flex-grow flex items-center justify-center relative w-full">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://api.ascendacademy5280.com/storage/v1/object/public/media/rod2.png" 
            alt="Background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/90"></div>
        </div>

        <div className="relative z-10 max-w-md w-full bg-card-bg border border-zinc-800 p-8 rounded-lg shadow-2xl text-center mx-4">
          <h2 className="font-teko text-4xl text-white uppercase mb-4">Check Your Email</h2>
          <p className="text-zinc-400 mb-6">
            We've sent a magic link to <span className="text-white font-bold">{email}</span>.
            <br />
            Click the link in the email to verify your account and set your password.
          </p>
          <button onClick={() => setMagicLinkSent(false)} className="text-co-yellow underline mt-4">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex items-center justify-center relative w-full min-h-[calc(100vh-5rem)]">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://api.ascendacademy5280.com/storage/v1/object/public/media/rod2.png" 
          alt="Background" 
          className="w-full h-full object-cover"
        />
        {/* Darker Overlay as requested */}
        <div className="absolute inset-0 bg-black/85"></div>
      </div>

      <div className="relative z-10 max-w-md w-full bg-card-bg border border-zinc-800 rounded-lg shadow-2xl overflow-hidden flex flex-col mx-4 my-8">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-700 via-co-red to-co-yellow"></div>
        
        {/* Tabs */}
        <div className="flex border-b border-zinc-800">
          <button 
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-4 font-teko text-2xl uppercase tracking-wide transition-colors ${isLogin ? 'text-white bg-zinc-800/50 border-b-2 border-co-yellow' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}
          >
            Login
          </button>
          <button 
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-4 font-teko text-2xl uppercase tracking-wide transition-colors ${!isLogin ? 'text-white bg-zinc-800/50 border-b-2 border-co-red' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}
          >
            Create Account
          </button>
        </div>

        <div className="p-8">
          <div className="text-center mb-6">
            <h2 className="font-teko text-3xl text-white uppercase">{isLogin ? 'Welcome Back' : 'Join The Squad'}</h2>
            <p className="text-zinc-500 text-sm mt-1">
              {isLogin ? 'Access your athlete dashboard.' : 'Start your journey with Ascend Academy.'}
            </p>
          </div>

          {error && (
            <div className="bg-red-900/30 text-red-200 p-3 rounded text-sm mb-4 border border-red-900">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="block text-zinc-400 text-xs uppercase font-bold mb-1">First Name</label>
                  <input required type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white focus:border-co-yellow outline-none transition-colors" />
                 </div>
                 <div>
                  <label className="block text-zinc-400 text-xs uppercase font-bold mb-1">Last Name</label>
                  <input required type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white focus:border-co-yellow outline-none transition-colors" />
                 </div>
              </div>
            )}
            
            {!isLogin && (
               <div>
                <label className="block text-zinc-400 text-xs uppercase font-bold mb-1">Mobile Phone</label>
                <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white focus:border-co-yellow outline-none transition-colors" placeholder="(555) 555-5555" />
               </div>
            )}

            <div>
              <label className="block text-zinc-400 text-xs uppercase font-bold mb-1">Email Address</label>
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white focus:border-co-yellow outline-none transition-colors" />
            </div>

            {/* Password only for Login */}
            {isLogin && (
              <div>
                <div className="flex justify-between">
                  <label className="block text-zinc-400 text-xs uppercase font-bold mb-1">Password</label>
                  <a href="#" className="text-xs text-zinc-500 hover:text-zinc-300">Forgot?</a>
                </div>
                <input required type="password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white focus:border-co-yellow outline-none transition-colors" />
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full text-white font-teko text-xl uppercase py-3 transition-colors disabled:opacity-50 mt-6 shadow-lg ${isLogin ? 'bg-co-yellow text-black hover:bg-white' : 'bg-co-red hover:bg-red-800'}`}
            >
              {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Send Magic Link & Join')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;