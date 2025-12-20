import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
        // Redirect to /set-password after they click the link
        const redirectUrl = window.location.origin + '/#/set-password';
        
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
      <div className="min-h-screen pt-20 flex items-center justify-center bg-dark-bg px-4">
        <div className="max-w-md w-full bg-card-bg border border-zinc-800 p-8 rounded-lg shadow-2xl text-center">
          <h2 className="font-teko text-4xl text-white uppercase mb-4">Check Your Email</h2>
          <p className="text-zinc-400 mb-6">
            We've sent a magic link to <span className="text-white font-bold">{email}</span>.
            <br />
            Click the link in the email to verify your account and set your password.
          </p>
          <button onClick={() => setMagicLinkSent(false)} className="text-co-yellow underline">
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center bg-dark-bg px-4">
      <div className="max-w-md w-full bg-card-bg border border-zinc-800 p-8 rounded-lg shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-700 via-co-red to-co-yellow"></div>
        
        <div className="text-center mb-8">
          <h2 className="font-teko text-4xl text-white uppercase">{isLogin ? 'Member Login' : 'Join The Squad'}</h2>
          <p className="text-zinc-500 text-sm mt-2">
            {isLogin ? 'Welcome back, athlete.' : 'Create your parent account via Magic Link.'}
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
                <input required type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white" />
               </div>
               <div>
                <label className="block text-zinc-400 text-xs uppercase font-bold mb-1">Last Name</label>
                <input required type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white" />
               </div>
            </div>
          )}
          
          {!isLogin && (
             <div>
              <label className="block text-zinc-400 text-xs uppercase font-bold mb-1">Mobile Phone (For Alerts)</label>
              <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white" placeholder="(555) 555-5555" />
             </div>
          )}

          <div>
            <label className="block text-zinc-400 text-xs uppercase font-bold mb-1">Email Address</label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white" />
          </div>

          {/* Password only for Login */}
          {isLogin && (
            <div>
              <label className="block text-zinc-400 text-xs uppercase font-bold mb-1">Password</label>
              <input required type="password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white" />
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-co-red hover:bg-red-800 text-white font-teko text-xl uppercase py-3 transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Send Magic Link & Join')}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-zinc-400 hover:text-co-yellow text-sm transition-colors"
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;