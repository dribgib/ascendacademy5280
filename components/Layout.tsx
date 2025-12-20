import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User as UserIcon, LogOut, Instagram, Youtube } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  setUser: (u: User | null) => void;
}

// Custom TikTok Icon
const TikTokIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const Layout: React.FC<LayoutProps> = ({ children, user, setUser }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await api.auth.signOut();
    setUser(null);
    navigate('/');
  };

  const handleScrollTo = (id: string) => {
    setIsMenuOpen(false);
    
    // If not on home page, go there first
    if (location.pathname !== '/') {
      navigate('/');
      // Wait for navigation to complete then scroll
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      // Already on home, just scroll
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navLinkClass = "text-zinc-300 hover:text-co-yellow transition-colors duration-200 px-3 py-2 rounded-md font-teko text-xl uppercase tracking-wide cursor-pointer";

  return (
    <div className="min-h-screen flex flex-col bg-dark-bg text-zinc-100 font-poppins selection:bg-co-yellow selection:text-black">
      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-black/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Logo */}
            <div className="flex-shrink-0 cursor-pointer" onClick={() => navigate('/')}>
              <div className="flex items-center">
                <span className="font-teko text-4xl font-bold tracking-tight uppercase text-white leading-none">
                  AscendAcademy<span className="text-co-yellow">5280</span>
                </span>
              </div>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center">
              <div className="ml-10 flex items-baseline space-x-6">
                <button onClick={() => handleScrollTo('about')} className={navLinkClass}>About</button>
                <button onClick={() => handleScrollTo('packages')} className={navLinkClass}>Training</button>
                <button onClick={() => handleScrollTo('schedule')} className={navLinkClass}>Schedule</button>
                
                {user ? (
                  <div className="flex items-center gap-4 ml-6 pl-6 border-l border-zinc-700">
                    <button 
                      onClick={() => navigate(user.role === 'ADMIN' ? '/admin' : '/dashboard')}
                      className="flex items-center gap-2 text-white hover:text-co-yellow transition-colors font-teko text-xl uppercase tracking-wide"
                    >
                      <UserIcon className="h-5 w-5 mb-1" />
                      Dashboard
                    </button>
                    <button 
                      onClick={handleLogout}
                      className="text-zinc-500 hover:text-co-red transition-colors"
                      title="Logout"
                    >
                      <LogOut className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-6 ml-6 pl-6 border-l border-zinc-700">
                    <button 
                      onClick={() => navigate('/login?mode=login')}
                      className="text-zinc-300 hover:text-white transition-colors uppercase font-teko text-xl tracking-wide"
                    >
                      Login
                    </button>
                    <button 
                      onClick={() => navigate('/login?mode=signup')}
                      className="bg-co-red hover:bg-co-yellow hover:text-black text-white px-6 py-1 rounded-none skew-x-[-12deg] transition-all duration-300 border-0 group"
                    >
                      <span className="skew-x-[12deg] inline-block font-teko text-xl uppercase tracking-wide pt-1">
                        Join The Squad
                      </span>
                    </button>
                  </div>
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
              <button onClick={() => handleScrollTo('about')} className="block w-full text-left px-3 py-2 rounded-md font-teko text-2xl text-white hover:text-co-yellow uppercase">About</button>
              <button onClick={() => handleScrollTo('packages')} className="block w-full text-left px-3 py-2 rounded-md font-teko text-2xl text-white hover:text-co-yellow uppercase">Training</button>
              <button onClick={() => handleScrollTo('schedule')} className="block w-full text-left px-3 py-2 rounded-md font-teko text-2xl text-white hover:text-co-yellow uppercase">Schedule</button>
              {user ? (
                <>
                  <button onClick={() => { navigate(user.role === 'ADMIN' ? '/admin' : '/dashboard'); setIsMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md font-teko text-2xl hover:text-co-yellow text-co-red uppercase">Dashboard</button>
                  <button onClick={() => { handleLogout(); setIsMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md font-teko text-2xl text-zinc-500 uppercase">Logout</button>
                </>
              ) : (
                <>
                  <button onClick={() => { navigate('/login?mode=login'); setIsMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md font-teko text-2xl text-white hover:text-co-yellow uppercase">Login</button>
                  <button onClick={() => { navigate('/login?mode=signup'); setIsMenuOpen(false); }} className="block w-full text-left px-3 py-2 rounded-md font-teko text-2xl text-co-red hover:text-white uppercase">Join The Squad</button>
                </>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow pt-20 w-full flex flex-col">
        {children}
      </main>

      <footer className="bg-black border-t border-zinc-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <span className="font-teko text-4xl font-bold tracking-tight uppercase text-white leading-none">
                  AscendAcademy<span className="text-co-yellow">5280</span>
                </span>
              </div>
              <p className="text-zinc-500 text-sm leading-relaxed max-w-xs">
                Developing the next generation of athletes in the heart of Colorado. 
                Built on discipline, driven by results.
              </p>
            </div>
            <div>
              <h3 className="font-teko text-2xl text-white mb-6 uppercase tracking-wide">Contact</h3>
              <p className="text-zinc-500 text-sm mb-3">Denver, Colorado</p>
              <p className="text-zinc-500 text-sm mb-3 hover:text-co-yellow transition-colors cursor-pointer">rod@ascendacademy5280.com</p>
              <p className="text-zinc-500 text-sm">(555) 123-4567</p>
            </div>
            <div>
              <h3 className="font-teko text-2xl text-white mb-6 uppercase tracking-wide">Community</h3>
              <div className="flex gap-6">
                <a href="#" className="text-zinc-500 hover:text-co-red transition-transform hover:scale-110 duration-300">
                  <Instagram className="w-6 h-6" />
                </a>
                <a href="#" className="text-zinc-500 hover:text-co-red transition-transform hover:scale-110 duration-300">
                  <TikTokIcon className="w-6 h-6" />
                </a>
                <a href="#" className="text-zinc-500 hover:text-co-red transition-transform hover:scale-110 duration-300">
                  <Youtube className="w-6 h-6" />
                </a>
              </div>
              <div className="mt-8 pt-8 border-t border-zinc-900">
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