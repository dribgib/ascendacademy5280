import React from 'react';
import { PACKAGES } from '../constants';
import { Check, Star, Trophy, Users, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

const HomePage: React.FC = () => {
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
              className="group relative bg-co-yellow text-black px-12 py-4 font-teko text-3xl uppercase tracking-wide font-bold hover:bg-white transition-all duration-300 -skew-x-12 shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)]"
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
                <p className="text-zinc-400 text-sm tracking-[0.2em] uppercase mt-2 font-bold">Head Trainer</p>
              </div>
            </div>
            <div className="pl-0 md:pl-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-16 h-1 bg-co-red"></div>
                <span className="uppercase tracking-[0.2em] text-zinc-400 text-sm font-bold">About The Coach</span>
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PACKAGES.map((pkg) => (
              <div key={pkg.id} className={`bg-card-bg p-8 flex flex-col relative group transition-all duration-300 border-t-4 border-transparent hover:border-co-yellow hover:-translate-y-2`}>
                <h3 className="font-teko text-5xl text-white uppercase mb-2">{pkg.name}</h3>
                <div className="flex items-baseline mb-8 pb-8 border-b border-zinc-800">
                  <span className="text-3xl font-bold text-co-yellow">$</span>
                  <span className="text-6xl font-teko font-bold text-white">{pkg.price}</span>
                  <span className="ml-2 text-zinc-500 text-sm font-bold uppercase tracking-wide">/ {pkg.billingPeriod}</span>
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
                <button className="w-full bg-zinc-800 hover:bg-white hover:text-black text-white py-4 px-4 text-sm uppercase font-bold tracking-widest transition-colors duration-300 flex items-center justify-center gap-2">
                  Donate $10+
                </button>
                <button className="w-full border border-zinc-700 text-zinc-400 hover:border-co-yellow hover:text-co-yellow py-4 px-4 text-sm uppercase font-bold tracking-widest transition-colors duration-300">
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
            className="group relative inline-block bg-white text-co-red px-16 py-5 font-teko text-3xl uppercase font-bold hover:bg-black hover:text-white shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all duration-300 transform -skew-x-12"
          >
             <span className="skew-x-12 inline-block">Join Now</span>
          </Link>
        </div>
      </section>
    </>
  );
};

export default HomePage;