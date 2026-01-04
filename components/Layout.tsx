import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, User as UserIcon, LogOut, Instagram, Youtube, Shield, Mail, Phone, Package } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  setUser: (u: User | null) => void;
}

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
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePackagesClick = () => {
      setIsMenuOpen(false);
      if (user) {
          // If logged in, go to the checkout page directly
          navigate('/checkout');
      } else {
          // If logged out, scroll to homepage packages section
          handleScrollTo('packages');
      }
  };

  // Helper to determine active state
  // "Coach" is active if ?view=admin
  // "Dashboard" (My Team) is active if /dashboard AND NOT ?view=admin
  const isActive = (type: 'coach' | 'dashboard' | 'schedule' | 'packages') => {
    if (type === 'schedule') return location.pathname === '/schedule';
    if (type === 'packages') return location.pathname.startsWith('/checkout');
    
    if (location.pathname !== '/dashboard') return false;
    const isAdminView = location.search.includes('view=admin');
    if (type === 'coach') return isAdminView;
    if (type === 'dashboard') return !isAdminView;
    return false;
  };

  const navLinkClass = "text-zinc-300 hover:text-co-yellow transition-colors duration-200 px-3 py-2 rounded-md font-teko text-xl uppercase tracking-wide cursor-pointer";

  return (
    <div className="min-h-screen flex flex-col bg-dark-bg text-zinc-100 font-poppins selection:bg-co-red selection:text-white">
      <nav className="fixed w-full z-50 bg-black/95 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            <div className="flex-shrink-0 cursor-pointer" onClick={() => navigate('/')}>
              <img 
                src="https://api.ascendacademy5280.com/storage/v1/object/public/media/1764999317387.jpg" 
                alt="Ascend Academy 5280" 
                className="h-16 w-auto object-contain"
              />
            </div>
            
            <div className="hidden md:flex items-center">
              <div className="ml-10 flex items-center space-x-6">
                <button onClick={() => handleScrollTo('about')} className={navLinkClass}>About</button>
                <button 
                    onClick={handlePackagesClick} 
                    className={`${navLinkClass} ${isActive('packages') ? 'text-co-yellow' : ''}`}
                >
                    Packages
                </button>
                <button 
                    onClick={() => navigate('/schedule')} 
                    className={`${navLinkClass} ${isActive('schedule') ? 'text-co-yellow' : ''}`}
                >
                    Schedule
                </button>
                
                {user ? (
                  <div className="flex items-center gap-4 ml-6 pl-6 border-l border-zinc-700 h-8">
                    {user.role === 'ADMIN' && (
                       <button 
                        onClick={() => navigate('/dashboard?view=admin')}
                        className={`flex items-center gap-2 transition-colors font-teko text-xl uppercase tracking-wide h-full mr-4 ${isActive('coach') ? 'text-co-yellow' : 'text-white hover:text-co-yellow'}`}
                      >
                        <Shield className="h-4 w-4 relative -top-[2px]" />
                        <span>Coach</span>
                      </button>
                    )}

                    <button 
                      onClick={() => navigate('/dashboard')}
                      className={`flex items-center gap-2 transition-colors font-teko text-xl uppercase tracking-wide h-full ${isActive('dashboard') ? 'text-co-yellow' : 'text-white hover:text-co-yellow'}`}
                    >
                      <UserIcon className="h-4 w-4 relative -top-[2px]" />
                      <span>My Team</span>
                    </button>
                    
                    <button 
                      onClick={handleLogout}
                      className="ml-4 text-zinc-500 hover:text-white transition-colors flex items-center"
                      title="Sign Out"
                    >
                      <LogOut className="h-5 w-5 relative -top-[1px]" />
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={() => navigate('/login')}
                    className="ml-6 bg-co-yellow text-black px-6 py-2 rounded-sm font-teko text-xl uppercase hover:bg-white transition-colors"
                  >
                    Login
                  </button>
                )}
              </div>
            </div>

            <div className="-mr-2 flex md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="bg-zinc-900 inline-flex items-center justify-center p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 focus:outline-none"
              >
                {isMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-zinc-900 border-b border-zinc-800">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <button onClick={() => handleScrollTo('about')} className="text-zinc-300 hover:text-white block px-3 py-2 rounded-md font-teko text-xl uppercase w-full text-left">About</button>
              <button onClick={handlePackagesClick} className="text-zinc-300 hover:text-white block px-3 py-2 rounded-md font-teko text-xl uppercase w-full text-left">Packages</button>
              <button onClick={() => { setIsMenuOpen(false); navigate('/schedule'); }} className="text-zinc-300 hover:text-white block px-3 py-2 rounded-md font-teko text-xl uppercase w-full text-left">Schedule</button>
              
              {user ? (
                <>
                  <button 
                    onClick={() => { setIsMenuOpen(false); navigate('/dashboard'); }}
                    className="text-co-yellow block px-3 py-2 rounded-md font-teko text-xl uppercase w-full text-left flex items-center gap-2"
                  >
                    <UserIcon size={16} className="relative -top-[2px]" /> My Team
                  </button>
                  {user.role === 'ADMIN' && (
                     <button 
                        onClick={() => { setIsMenuOpen(false); navigate('/dashboard?view=admin'); }}
                        className="text-co-yellow block px-3 py-2 rounded-md font-teko text-xl uppercase w-full text-left flex items-center gap-2"
                      >
                        <Shield size={16} className="relative -top-[2px]" /> Coach
                      </button>
                  )}
                  <button 
                    onClick={() => { setIsMenuOpen(false); handleLogout(); }}
                    className="text-zinc-400 hover:text-white block px-3 py-2 rounded-md font-teko text-xl uppercase w-full text-left flex items-center gap-2"
                  >
                    <LogOut size={16} className="relative -top-[1px]" /> Sign Out
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => { setIsMenuOpen(false); navigate('/login'); }}
                  className="bg-co-yellow text-black block px-3 py-2 rounded-md font-teko text-xl uppercase font-bold text-center w-full mt-4"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      <main className="flex-grow pt-20">
        {children}
      </main>

      <footer className="bg-black border-t border-zinc-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop Layout: 3 Columns. Mobile: Stacked */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center text-center">
            
            {/* Left: Brand & Copyright */}
            <div className="md:text-left flex flex-col items-center md:items-start">
              <img 
                src="https://api.ascendacademy5280.com/storage/v1/object/public/media/1764999317387.jpg" 
                alt="Ascend Academy 5280" 
                className="h-20 w-auto object-contain cursor-pointer mb-2"
                onClick={() => navigate('/')}
              />
              <p className="text-zinc-600 text-xs mt-2">© {new Date().getFullYear()} All rights reserved.</p>
            </div>

            {/* Center: Contact Info */}
            <div className="flex flex-col items-center justify-center space-y-2">
                 <a href="mailto:rod@ascendacademy5280.com" className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors group">
                    <Mail size={14} className="text-co-red group-hover:text-co-yellow transition-colors" /> 
                    <span>rod@ascendacademy5280.com</span>
                 </a>
                 <a href="tel:3039432787" className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors group">
                    <Phone size={14} className="text-co-yellow group-hover:text-co-red transition-colors" /> 
                    <span>303-943-2787</span>
                 </a>
            </div>
            
            {/* Right: Socials */}
            <div className="flex justify-center md:justify-end space-x-6">
              <a href="#" className="text-zinc-500 hover:text-co-red transition-colors"><Instagram /></a>
              <a href="#" className="text-zinc-500 hover:text-co-red transition-colors"><Youtube /></a>
              <a href="#" className="text-zinc-500 hover:text-co-red transition-colors"><TikTokIcon /></a>
            </div>

          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;