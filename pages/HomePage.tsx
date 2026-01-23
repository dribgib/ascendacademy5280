import React, { useState } from 'react';
import { PACKAGES } from '../constants';
import { Check, Star, Trophy, Users, Heart, DollarSign, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useModal } from '../context/ModalContext';

const HomePage: React.FC = () => {
  const { showAlert } = useModal();
  const navigate = useNavigate();
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [donationAmount, setDonationAmount] = useState<number | ''>('');
  const [customAmount, setCustomAmount] = useState<string>('');
  const [processingDonation, setProcessingDonation] = useState(false);
  const [packageView, setPackageView] = useState<'subscription' | 'packs'>('subscription');

  const handleDonate = async () => {
    const amount = Number(customAmount) || Number(donationAmount);
    if (!amount || amount <= 0) {
        showAlert('Invalid Amount', "Please select or enter a valid donation amount.", 'error');
        return;
    }
    setProcessingDonation(true);
    try {
        await api.billing.createDonationSession(amount);
    } catch (e: any) {
        console.error(e);
        showAlert('Donation Failed', e.message || 'Could not initiate donation.', 'error');
        setProcessingDonation(false);
    }
  };

  return (
    <>
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden bg-black">
        {/* Background Video/Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://api.ascendacademy5280.com/storage/v1/object/public/media/bg.png" 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-60"
          />
          {/* Dark Overlay for Text Contrast */}
          <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-black/40 to-black/70"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 text-center sm:px-6 lg:px-8">
          <h1 className="font-teko text-8xl md:text-[10rem] font-bold text-white uppercase leading-[0.85] tracking-tighter mb-6 animate-fade-in-up drop-shadow-2xl">
            Rise Above <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-co-yellow to-co-red">The Competition</span>
          </h1>
          <p className="mt-6 text-xl md:text-3xl text-zinc-200 max-w-4xl mx-auto font-light tracking-wide drop-shadow-md leading-relaxed font-teko uppercase">
            Elite youth athletic performance training in Colorado.
          </p>
          <div className="mt-12 flex justify-center gap-6">
            <a 
              href="#packages"
              className="group relative bg-co-yellow text-black px-12 py-4 font-teko text-3xl uppercase tracking-wide hover:bg-white transition-all duration-300 -skew-x-12 shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]"
            >
              <span className="skew-x-12 inline-block">Start Training</span>
            </a>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-black via-co-red to-co-yellow"></div>
      </section>

      {/* About Section */}
      <section id="about" className="py-32 bg-card-bg relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
            <div className="relative group">
              <div className="absolute -inset-4 bg-zinc-800 rounded-lg transform rotate-3 group-hover:rotate-2 transition-transform duration-500"></div>
              <div className="absolute -inset-4 bg-co-red/20 rounded-lg transform -rotate-2 group-hover:-rotate-1 transition-transform duration-500"></div>
              <img 
                src="https://api.ascendacademy5280.com/storage/v1/object/public/media/rod1.png" 
                alt="Trainer" 
                className="relative rounded-lg shadow-2xl grayscale group-hover:grayscale-0 transition-all duration-500 w-full object-cover"
              />
              <div className="absolute -bottom-8 -right-8 bg-black p-8 border-l-4 border-co-yellow shadow-xl z-20">
                <p className="font-teko text-5xl text-white leading-none">RODERRICK JACKSON</p>
                <p className="text-zinc-400 text-sm tracking-[0.2em] uppercase mt-2 font-medium">Head Trainer</p>
              </div>
            </div>
            <div className="pl-0 md:pl-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-16 h-1 bg-co-red"></div>
                <span className="uppercase tracking-[0.2em] text-zinc-400 text-sm font-medium">About The Coach</span>
              </div>
              <h2 className="font-teko text-6xl md:text-7xl text-white mb-8 uppercase leading-[0.9]">Built Different.</h2>
              <p className="text-zinc-400 text-lg mb-6 leading-relaxed font-light">
                Former D1 football player at Wyoming and Arena League veteran, Roderrick Jackson brings professional-grade intensity and knowledge to youth fitness.
              </p>
              <p className="text-zinc-400 text-lg mb-10 leading-relaxed font-light">
                Ascend Academy 5280 isn't just a gym. It's a laboratory for building better athletes and better people. We focus on speed, agility, strength, and mental toughness.
              </p>
              
              <div className="grid grid-cols-2 gap-8">
                <div className="flex items-center gap-4 border-l-2 border-zinc-800 pl-4">
                  <div className="p-3 bg-zinc-900 rounded-full text-co-yellow"><Trophy size={28} /></div>
                  <div>
                    <h4 className="font-teko text-2xl text-white uppercase">D1 Experience</h4>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Proven at top levels</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 border-l-2 border-zinc-800 pl-4">
                  <div className="p-3 bg-zinc-900 rounded-full text-co-red"><Users size={28} /></div>
                  <div>
                    <h4 className="font-teko text-2xl text-white uppercase">Mentorship</h4>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">Character building</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Packages Section */}
      <section id="packages" className="py-32 bg-dark-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="font-teko text-7xl text-white uppercase mb-4">Training Packages</h2>
            <div className="w-24 h-1 bg-co-yellow mx-auto mb-6"></div>
            <p className="text-zinc-400 text-xl max-w-2xl mx-auto font-light">Choose your level of commitment. From Rookie foundations to Elite performance.</p>
          </div>

          {/* Tab Switcher */}
          <div className="flex justify-center mb-16">
            <div className="inline-flex bg-zinc-900 border-2 border-zinc-800 p-1.5 rounded-sm">
              <button
                onClick={() => setPackageView('subscription')}
                className={`px-8 py-4 font-teko text-2xl uppercase tracking-wide transition-all duration-300 ${
                  packageView === 'subscription'
                    ? 'bg-co-yellow text-black shadow-lg -skew-x-6'
                    : 'text-zinc-400 hover:text-white -skew-x-6'
                }`}
              >
                <span className="skew-x-6 inline-block">Monthly Plans</span>
              </button>
              <button
                onClick={() => setPackageView('packs')}
                className={`px-8 py-4 font-teko text-2xl uppercase tracking-wide transition-all duration-300 ${
                  packageView === 'packs'
                    ? 'bg-co-yellow text-black shadow-lg -skew-x-6'
                    : 'text-zinc-400 hover:text-white -skew-x-6'
                }`}
              >
                <span className="skew-x-6 inline-block">Class Packs</span>
              </button>
            </div>
          </div>

          {/* Monthly Subscriptions */}
          {packageView === 'subscription' && (
            <div className="animate-fade-in">
              <div className="text-center mb-12">
                <h3 className="font-teko text-5xl text-white uppercase mb-3">Monthly Memberships</h3>
                <p className="text-zinc-400 max-w-2xl mx-auto">Recurring training with unlimited commitment. Cancel or pause anytime.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {PACKAGES.filter(pkg => !pkg.isClassPack).map((pkg) => (
                  <div key={pkg.id} className={`bg-card-bg p-8 flex flex-col relative group transition-all duration-300 border-t-4 border-transparent hover:border-co-yellow hover:-translate-y-2`}>
                    <h3 className="font-teko text-5xl text-white uppercase mb-2">{pkg.name}</h3>
                    <div className="flex items-baseline mb-8 pb-8 border-b border-zinc-800">
                      <span className="text-3xl font-bold text-co-yellow">$</span>
                      <span className="text-6xl font-teko font-bold text-white">{pkg.price}</span>
                      <span className="ml-2 text-zinc-500 text-sm font-medium uppercase tracking-wide">/ {pkg.billingPeriod}</span>
                    </div>
                    <p className="text-zinc-400 text-sm mb-8 min-h-[40px] leading-relaxed">{pkg.description}</p>
                    <ul className="space-y-4 mb-10 flex-grow">
                      {pkg.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-co-yellow flex-shrink-0 mt-0.5" />
                          <span className="text-zinc-300 text-sm font-medium">{feat}</span>
                        </li>
                      ))}
                    </ul>
                    <Link 
                      to={`/checkout/${pkg.id}`} 
                      className="block w-full py-4 bg-black border border-zinc-700 text-center uppercase font-teko text-2xl text-white hover:bg-co-yellow hover:text-black hover:border-transparent transition-all duration-300 tracking-wide"
                    >
                      Select Plan
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Class Packs */}
          {packageView === 'packs' && (
            <div className="animate-fade-in">
              <div className="text-center mb-12">
                <h3 className="font-teko text-5xl text-white uppercase mb-3">In-Season Class Packs</h3>
                <p className="text-zinc-400 max-w-3xl mx-auto">Perfect for athletes in-season who need flexible training. Buy a pack, use it at your pace, and keep your edge year-round.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {PACKAGES.filter(pkg => pkg.isClassPack).map((pkg) => (
                  <div key={pkg.id} className={`bg-card-bg p-8 flex flex-col relative group transition-all duration-300 border-t-4 ${pkg.color} hover:-translate-y-2`}>
                    <div className="absolute top-4 right-4 bg-co-yellow text-black text-xs px-3 py-1 font-bold uppercase tracking-wider">
                      {pkg.expirationMonths} Months
                    </div>
                    <h3 className="font-teko text-4xl text-white uppercase mb-2 leading-tight">{pkg.name}</h3>
                    <div className="flex items-baseline mb-8 pb-8 border-b border-zinc-800">
                      <span className="text-3xl font-bold text-co-yellow">$</span>
                      <span className="text-6xl font-teko font-bold text-white">{pkg.price}</span>
                      <span className="ml-2 text-zinc-500 text-sm font-medium uppercase tracking-wide">one-time</span>
                    </div>
                    <p className="text-zinc-400 text-sm mb-8 min-h-[40px] leading-relaxed">{pkg.description}</p>
                    <ul className="space-y-4 mb-10 flex-grow">
                      {pkg.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-co-yellow flex-shrink-0 mt-0.5" />
                          <span className="text-zinc-300 text-sm font-medium">{feat}</span>
                        </li>
                      ))}
                    </ul>
                    <Link 
                      to={`/checkout/${pkg.id}`} 
                      className="block w-full py-4 bg-black border border-zinc-700 text-center uppercase font-teko text-2xl text-white hover:bg-co-yellow hover:text-black hover:border-transparent transition-all duration-300 tracking-wide"
                    >
                      Buy Pack
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Discounts & Sponsorship */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Star size={100} />
              </div>
              <div className="flex items-center gap-4 mb-6 relative z-10">
                <Star className="text-co-yellow" size={32} />
                <h3 className="font-teko text-4xl text-white uppercase">Sibling Discounts</h3>
              </div>
              <p className="text-zinc-400 mb-6">Building a legacy? We support athletic families with significant discounts for multi-athlete households.</p>
              <ul className="text-sm text-zinc-300 space-y-4">
                <li className="flex justify-between border-b border-zinc-800 pb-2">
                  <span className="uppercase tracking-wide">Sibling Discount (1st Sibling)</span>
                  <span className="text-co-yellow font-teko text-2xl">45% OFF</span>
                </li>
                <li className="flex justify-between border-b border-zinc-800 pb-2">
                  <span className="uppercase tracking-wide">Additional Siblings</span>
                  <span className="text-co-yellow font-teko text-2xl">65% OFF</span>
                </li>
              </ul>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-10 rounded-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Heart size={100} />
              </div>
              <div className="flex items-center gap-4 mb-6 relative z-10">
                <Heart className="text-co-red" size={32} />
                <h3 className="font-teko text-4xl text-white uppercase">Community Support</h3>
              </div>
              <p className="text-zinc-400 mb-8">Every kid deserves a chance to compete. Donate to sponsor an athlete who needs financial assistance.</p>
              
              <div className="flex flex-col gap-4 relative z-10">
                <button 
                    onClick={() => setShowDonateModal(true)}
                    className="w-full bg-zinc-800 hover:bg-white hover:text-black text-white py-4 px-4 text-sm uppercase font-medium tracking-widest transition-colors duration-300 flex items-center justify-center gap-2"
                >
                  <DollarSign size={16} /> Donate
                </button>
                <button 
                    onClick={() => navigate('/sponsor')}
                    className="w-full border border-zinc-700 text-zinc-400 hover:border-co-yellow hover:text-co-yellow py-4 px-4 text-sm uppercase font-medium tracking-widest transition-colors duration-300"
                >
                  Sponsor an Athlete
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-co-red relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-black/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
          <h2 className="font-teko text-7xl md:text-8xl text-white uppercase mb-6 drop-shadow-lg">Ready to Ascend?</h2>
          <p className="text-red-100 text-xl md:text-2xl mb-12 max-w-2xl mx-auto font-light">
            Spots fill up fast. Create your account, register your athletes, and get to work.
          </p>
          <Link 
            to="/login" 
            className="group relative inline-block bg-white text-co-red px-16 py-5 font-teko text-3xl uppercase font-medium hover:bg-black hover:text-white shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all duration-300 transform -skew-x-12"
          >
             <span className="skew-x-12 inline-block">Join Now</span>
          </Link>
        </div>
      </section>

      {/* Donation Modal */}
      {showDonateModal && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={() => setShowDonateModal(false)}
        >
            <div 
                className="bg-zinc-900 border border-zinc-700 p-8 rounded-lg max-w-md w-full relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button 
                    onClick={() => setShowDonateModal(false)}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                >
                    <X size={24} />
                </button>
                <h2 className="font-teko text-4xl text-white uppercase mb-2 flex items-center gap-2">
                    <Heart className="text-co-red" /> Support The Team
                </h2>
                <p className="text-zinc-400 text-sm mb-8">
                    Your contribution helps provide equipment and scholarships for athletes in need.
                </p>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    {[10, 25, 50, 100].map(amt => (
                        <button
                            key={amt}
                            onClick={() => { setDonationAmount(amt); setCustomAmount(''); }}
                            className={`py-4 border rounded font-teko text-2xl transition-all ${donationAmount === amt ? 'bg-co-red border-co-red text-white' : 'bg-black border-zinc-800 text-zinc-400 hover:border-zinc-500'}`}
                        >
                            ${amt}
                        </button>
                    ))}
                </div>

                <div className="mb-6 relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                    <input 
                        type="number" 
                        placeholder="Custom Amount" 
                        value={customAmount}
                        onChange={(e) => { setCustomAmount(e.target.value); setDonationAmount(''); }}
                        className="w-full bg-black border border-zinc-700 rounded p-4 pl-8 text-white focus:border-co-yellow outline-none font-teko text-xl tracking-wide"
                    />
                </div>

                <button 
                    onClick={handleDonate}
                    disabled={processingDonation}
                    className="w-full bg-white hover:bg-zinc-200 text-black font-teko text-2xl uppercase py-4 rounded disabled:opacity-50 transition-colors"
                >
                    {processingDonation ? 'Processing...' : 'Proceed to Payment'}
                </button>
            </div>
        </div>
      )}
    </>
  );
};

export default HomePage;