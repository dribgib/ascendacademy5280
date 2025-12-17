import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User as UserIcon, LogOut, Dumbbell } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  setUser: (u: User | null) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, user, setUser }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await api.auth.signOut();
    setUser(null);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col bg-dark-bg text-zinc-100 font-poppins selection:bg-co-yellow selection:text-black">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-black/90 backdrop-blur-md border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex-shrink-0 cursor-pointer" onClick={() => navigate('/')}>
              <div className="flex items-center gap-2">
                <Dumbbell className="h-8 w-8 text-co-yellow" />
                <span className="font-teko text-3xl font-bold tracking-widest text-white">ASCEND<span className="text-co-yellow">5280</span></span>
              </div>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-8">
                <a href="#about" className="hover:text-co-yellow transition-colors duration-200 px-3 py-2 rounded-md font-medium uppercase tracking-wide text-sm">About</a>
                <a href="#packages" className="hover:text-co-yellow transition-colors duration-200 px-3 py-2 rounded-md font-medium uppercase tracking-wide text-sm">Training</a>
                <a href="#schedule" className="hover:text-co-yellow transition-colors duration-200 px-3 py-2 rounded-md font-medium uppercase tracking-wide text-sm">Schedule</a>
                
                {user ? (
                  <div className="flex items-center gap-4 ml-6">
                    <button 
                      onClick={() => navigate(user.role === 'ADMIN' ? '/admin' : '/dashboard')}
                      className="flex items-center gap-2 text-zinc-300 hover:text-white transition-colors"
                    >
                      <UserIcon className="h-5 w-5" />
                      <span className="font-teko text-xl mt-1">Dashboard</span>
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="text-zinc-500 hover:text-co-red transition-colors"
                    >
                      <LogOut className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => navigate('/login')}
                    className="ml-6 bg-co-blue hover:bg-blue-900 text-white px-6 py-2 rounded-none skew-x-[-12deg] font-teko text-xl transition-all duration-300 border border-transparent hover:border-co-yellow"
                  >
                    <span className="skew-x-[12deg] inline-block mt-1">Join The Squad</span>
                  </button>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="-mr-2 flex md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex items-center justify-center p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 focus:outline-none"
              >
                {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-zinc-900 border-b border-zinc-800">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <a href="#about" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium hover:text-co-yellow">About</a>
              <a href="#packages" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium hover:text-co-yellow">Training</a>
              <a href="#schedule" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium hover:text-co-yellow">Schedule</a>
              {user ? (
                <>
                  <button onClick={() => { navigate(user.role === 'ADMIN' ? '/admin' : '/dashboard'); setIsMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:text-co-yellow text-co-blue">Dashboard</button>
                  <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-co-red">Logout</button>
                </>
              ) : (
                <button onClick={() => { navigate('/login'); setIsMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-co-yellow">Login / Join</button>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="flex-grow pt-20">
        {children}
      </main>

      <footer className="bg-black border-t border-zinc-800 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Dumbbell className="h-6 w-6 text-co-yellow" />
                <span className="font-teko text-2xl font-bold tracking-widest text-white">ASCEND<span className="text-co-yellow">5280</span></span>
              </div>
              <p className="text-zinc-500 text-sm">
                Developing the next generation of athletes in the heart of Colorado. 
                Built on discipline, driven by results.
              </p>
            </div>
            <div>
              <h3 className="font-teko text-xl text-white mb-4 uppercase">Contact</h3>
              <p className="text-zinc-500 text-sm mb-2">Denver, Colorado</p>
              <p className="text-zinc-500 text-sm mb-2">coach@ascend5280.com</p>
            </div>
            <div>
              <h3 className="font-teko text-xl text-white mb-4 uppercase">Community</h3>
              <div className="flex gap-4">
                <button className="text-zinc-500 hover:text-co-blue transition-colors">Instagram</button>
                <button className="text-zinc-500 hover:text-co-blue transition-colors">Twitter</button>
                <button className="text-zinc-500 hover:text-co-blue transition-colors">Facebook</button>
              </div>
              <div className="mt-6">
                <p className="text-xs text-zinc-600">© 2023 Ascend Academy 5280. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
