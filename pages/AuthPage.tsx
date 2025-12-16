import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../services/mockService';
import { User } from '../types';

interface AuthPageProps {
  setUser: (user: User) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ setUser }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Mock logic: checks if email contains 'admin'
      const user = await AuthService.login(email);
      setUser(user);
      navigate(user.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center bg-dark-bg px-4">
      <div className="max-w-md w-full bg-card-bg border border-zinc-800 p-8 rounded-lg shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-co-blue via-co-red to-co-yellow"></div>
        
        <div className="text-center mb-10">
          <h2 className="font-teko text-4xl text-white uppercase">Member Access</h2>
          <p className="text-zinc-500 text-sm mt-2">Enter your email to sign in or create an account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-zinc-400 text-xs uppercase font-bold mb-2">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-zinc-700 rounded px-4 py-3 text-white focus:outline-none focus:border-co-yellow transition-colors"
              placeholder="you@example.com"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-co-blue hover:bg-blue-900 text-white font-teko text-xl uppercase py-3 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Continue'}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-zinc-800 text-center">
          <p className="text-xs text-zinc-600">
            For Demo: Use <span className="text-white">admin@ascend5280.com</span> for Admin view.
            <br/>Any other email for Parent view.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
