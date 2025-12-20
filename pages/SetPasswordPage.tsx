import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useModal } from '../context/ModalContext';

const SetPasswordPage: React.FC = () => {
  const { showAlert } = useModal();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // 1. Strip the `?next=set-password` param immediately to prevent App.tsx from redirecting us back here later
    if (window.location.search.includes('next=')) {
        const newUrl = window.location.origin + window.location.pathname + window.location.hash;
        window.history.replaceState({}, '', newUrl);
    }

    // 2. Ensure user is logged in
    const checkSession = async () => {
        const user = await api.auth.getUser();
        if (!user) {
            navigate('/login');
        }
    };
    checkSession();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
        setError("Password must be at least 6 characters");
        return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await api.auth.updateUser({ password });
      if (error) throw error;
      
      showAlert('Success', "Password set successfully!", 'success');
      // Force replace history to ensure we don't go back to this page
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 pb-12 flex flex-col items-center justify-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-card-bg border border-zinc-800 p-8 rounded-lg shadow-2xl relative">
        
        <div className="text-center mb-8">
          <h2 className="font-teko text-4xl text-white uppercase">Secure Your Account</h2>
          <p className="text-zinc-500 text-sm mt-2">
            Verification complete. Please set a password for future logins.
          </p>
        </div>

        {error && (
          <div className="bg-red-900/30 text-red-200 p-3 rounded text-sm mb-4 border border-red-900">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-zinc-400 text-xs uppercase font-bold mb-1">New Password</label>
            <input 
                required 
                type="password" 
                minLength={6} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white" 
            />
          </div>

          <div>
            <label className="block text-zinc-400 text-xs uppercase font-bold mb-1">Confirm Password</label>
            <input 
                required 
                type="password" 
                minLength={6} 
                value={confirmPassword} 
                onChange={e => setConfirmPassword(e.target.value)} 
                className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-white" 
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-co-yellow hover:bg-yellow-500 text-black font-teko text-xl uppercase py-3 transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? 'Updating...' : 'Set Password & Enter'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetPasswordPage;