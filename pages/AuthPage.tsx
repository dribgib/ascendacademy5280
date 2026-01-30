import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/api';
import { User } from '../types';
import { AlertCircle, CheckCircle, ArrowLeft, Mail } from 'lucide-react';

interface AuthPageProps {
  setUser: (user: User) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ setUser }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  
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
        // --- LOGIN FLOW ---
        const { error } = await api.auth.signIn(email, password);
        if (error) throw error;
        // Success: App.tsx detects session change
      } else {
        // --- SIGN UP FLOW ---
        const { data, error } = await api.auth.signUp(
          email, 
          password, 
          { firstName, lastName, phone }
        );

        if (error) throw error;

        // CHECK: If session is missing, account might be unconfirmed.
        if (data?.user && !data.session) {
           // ATTEMPT AUTO-LOGIN: 
           // If "Confirm Email" is OFF in Supabase, sometimes session isn't returned in signUp but signIn works.
           const { data: loginData } = await api.auth.signIn(email, password);
           
           if (loginData?.session) {
             // Auto-login success!
             return;
           }

           // If Auto-login failed, it means "Confirm Email" is definitely ON and account is unconfirmed.
           setMagicLinkSent(true); 
           setLoading(false);
           return;
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication failed');
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email) {
          setError("Please enter your email address.");
          return;
      }
      setLoading(true);
      setError('');
      try {
          const redirectTo = `${window.location.origin}/set-password`;
          const { error } = await api.auth.resetPasswordForEmail(email, redirectTo);
          if (error) throw error;
          setResetSent(true);
      } catch (err: any) {
          console.error(err);
          setError(err.message || 'Failed to send reset link.');
      } finally {
          setLoading(false);
      }
  };

  if (resetSent) {
      return (
        <div className="flex-grow flex items-center justify-center relative w-full min-h-[80vh]">
            {/* Background */}
            <div className="absolute inset-0 z-0">
            <img 
                src="https://api.ascendacademy5280.com/storage/v1/object/public/media/rod2.png" 
                alt="Background" 
                className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/90"></div>
            </div>

            <div className="relative z-10 max-w-md w-full px-4">
                <div className="bg-card-bg border border-zinc-800 p-8 rounded-lg shadow-2xl text-center">
                    <div className="flex justify-center mb-6">
                        <Mail className="text-co-yellow h-16 w-16" />
                    </div>
                    <h2 className="font-shrikhand text-3xl text-white uppercase mb-4">Check Your Inbox</h2>
                    <p className="text-zinc-400 mb-8 text-lg">
                        We've sent password reset instructions to <span className="text-white font-bold">{email}</span>.
                    </p>
                    <button 
                        onClick={() => { setResetSent(false); setResetMode(false); setIsLogin(true); setError(''); }}
                        className="w-full bg-white text-black font-kanit text-base uppercase py-3 rounded hover:bg-zinc-200 transition-colors"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        </div>
      );
  }

  if (magicLinkSent) {
    return (
      <div className="flex-grow flex items-center justify-center relative w-full min-h-[80vh]">
        {/* Background */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://api.ascendacademy5280.com/storage/v1/object/public/media/rod2.png" 
            alt="Background" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/90"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex justify-center">
            <div className="max-w-xl w-full bg-card-bg border border-zinc-800 p-8 rounded-lg shadow-2xl text-center">
                <div className="flex justify-center mb-4">
                    <CheckCircle className="text-co-yellow h-16 w-16" />
                </div>
                <h2 className="font-shrikhand text-3xl text-white uppercase mb-4">Verify Your Email</h2>
                <p className="text-zinc-400 mb-6 text-lg">
                    We've sent a verification link to <span className="text-white font-bold">{email}</span>.
                    <br />
                    Please check your inbox (and spam folder) to complete registration.
                </p>

                {/* Developer Hint */}
                <div className="bg-zinc-900 border border-zinc-700 p-4 rounded text-left mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={16} className="text-co-yellow" />
                        <span className="text-white font-bold text-xs uppercase tracking-wide">Development Mode Tip</span>
                    </div>
                    <p className="text-zinc-500 text-xs leading-relaxed">
                        If emails are not arriving, go to your <strong>Supabase Dashboard &gt; Authentication &gt; Providers &gt; Email</strong> and uncheck <strong>"Confirm email"</strong>.
                        <br /><br />
                        After disabling it, delete this user from the Supabase "Users" table and try creating the account again. You will be logged in immediately.
                    </p>
                </div>

                <div className="flex flex-col gap-3">
                    <button 
                        onClick={() => { setMagicLinkSent(false); setIsLogin(true); }} 
                        className="bg-white text-black font-kanit text-base uppercase py-3 rounded hover:bg-zinc-200 transition-colors"
                    >
                        Return to Login
                    </button>
                    <button onClick={() => window.location.reload()} className="text-zinc-500 text-sm hover:text-white">
                        I've Verified, Refresh Page
                    </button>
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-grow flex items-center justify-center relative w-full min-h-[80vh]">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="https://api.ascendacademy5280.com/storage/v1/object/public/media/rod2.png" 
          alt="Background" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/85"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 flex justify-center py-8">
          <div className="max-w-md w-full bg-card-bg border border-zinc-800 rounded-lg shadow-2xl overflow-hidden flex flex-col">
            
            {/* Tabs */}
            {!resetMode && (
                <div className="flex border-b border-zinc-800">
                <button 
                    onClick={() => setIsLogin(true)}
                    className={`flex-1 py-4 font-kanit text-lg uppercase tracking-wide transition-colors ${isLogin ? 'text-white bg-zinc-800/50 border-b-2 border-co-yellow' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}
                >
                    Login
                </button>
                <button 
                    onClick={() => setIsLogin(false)}
                    className={`flex-1 py-4 font-kanit text-lg uppercase tracking-wide transition-colors ${!isLogin ? 'text-white bg-zinc-800/50 border-b-2 border-co-yellow' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30'}`}
                >
                    Create Account
                </button>
                </div>
            )}

            <div className="p-8">
            <div className="text-center mb-6">
                <h2 className="font-shrikhand text-2xl text-white uppercase">
                    {resetMode ? 'Reset Password' : (isLogin ? 'Welcome Back' : 'Join The Squad')}
                </h2>
                <p className="text-zinc-500 text-sm mt-1">
                    {resetMode 
                        ? 'Enter your email to receive reset instructions.' 
                        : (isLogin ? 'Access your athlete dashboard.' : 'Start your journey with Ascend Academy.')}
                </p>
            </div>

            {error && (
                <div className="bg-yellow-900/30 text-yellow-200 p-3 rounded text-sm mb-4 border border-yellow-900">
                {error}
                </div>
            )}

            {resetMode ? (
                // RESET PASSWORD FORM
                <form onSubmit={handleResetSubmit} className="space-y-4">
                     <div>
                        <label className="block text-zinc-400 text-xs uppercase font-medium mb-1">Email Address</label>
                        <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white focus:border-co-yellow outline-none transition-colors" />
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-co-yellow text-black hover:bg-white font-kanit text-base uppercase py-3 transition-colors disabled:opacity-50 mt-4 shadow-lg"
                    >
                        {loading ? 'Sending...' : 'Send Reset Link'}
                    </button>
                    <button 
                        type="button" 
                        onClick={() => { setResetMode(false); setError(''); }}
                        className="w-full text-zinc-500 hover:text-white text-sm mt-2 flex items-center justify-center gap-1"
                    >
                        <ArrowLeft size={14} /> Back to Login
                    </button>
                </form>
            ) : (
                // LOGIN / SIGNUP FORM
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                        <label className="block text-zinc-400 text-xs uppercase font-medium mb-1">First Name</label>
                        <input required type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white focus:border-co-yellow outline-none transition-colors" />
                        </div>
                        <div>
                        <label className="block text-zinc-400 text-xs uppercase font-medium mb-1">Last Name</label>
                        <input required type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white focus:border-co-yellow outline-none transition-colors" />
                        </div>
                    </div>
                    )}
                    
                    {!isLogin && (
                    <div>
                        <label className="block text-zinc-400 text-xs uppercase font-medium mb-1">Mobile Phone</label>
                        <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white focus:border-co-yellow outline-none transition-colors" placeholder="(555) 555-5555" />
                    </div>
                    )}

                    <div>
                    <label className="block text-zinc-400 text-xs uppercase font-medium mb-1">Email Address</label>
                    <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white focus:border-co-yellow outline-none transition-colors" />
                    </div>

                    <div>
                        <div className="flex justify-between">
                        <label className="block text-zinc-400 text-xs uppercase font-medium mb-1">Password</label>
                        {isLogin && (
                            <button 
                                type="button" 
                                onClick={() => { setResetMode(true); setError(''); }} 
                                className="text-xs text-zinc-500 hover:text-zinc-300"
                            >
                                Forgot?
                            </button>
                        )}
                        </div>
                        <input required type="password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white focus:border-co-yellow outline-none transition-colors" />
                    </div>

                    <button 
                    type="submit" 
                    disabled={loading}
                    className={`w-full font-kanit text-base uppercase py-3 transition-colors disabled:opacity-50 mt-6 shadow-lg 
                        ${isLogin 
                            ? 'bg-co-yellow !text-black hover:bg-white' 
                            : 'bg-co-yellow text-black hover:bg-white'
                        }`}
                    >
                    {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                    </button>
                </form>
            )}
            </div>
          </div>
      </div>
    </div>
  );
};

export default AuthPage;