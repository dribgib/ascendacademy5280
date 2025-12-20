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
            className="w-full h-full object-cover opacity-80"
          />
          {/* Dark Overlay for Text Contrast */}
          <div className="absolute inset-0 bg-black/80"></div>
          {/* Gradient for smooth transition to content */}
          <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-transparent to-transparent"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 text-center sm:px-6 lg:px-8">
          <h1 className="font-teko text-7xl md:text-9xl font-bold text-white uppercase leading-none tracking-tighter mb-4 animate-fade-in-up drop-shadow-2xl">
            Rise Above <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-co-yellow to-co-red">The Competition</span>
          </h1>
          <p className="mt-4 text-xl md:text-2xl text-zinc-200 max-w-3xl mx-auto font-light tracking-wide drop-shadow-md leading-relaxed">
            Elite athletic performance training in Colorado. <br className="block mt-2" /> Join the Academy.
          </p>
          <div className="mt-10 flex justify-center gap-6">
            <a 
              href="#packages"
              className="bg-co-yellow text-black px-10 py-4 font-teko text-2xl uppercase tracking-wider font-bold hover:bg-white transition-colors duration-300 -skew-x-12 shadow-lg"
            >
              <span className="skew-x-12 inline-block">Start Training</span>
            </a>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-black via-co-red to-co-yellow"></div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 bg-card-bg relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="relative">
              <div className="absolute -inset-4 bg-zinc-700/20 rounded-lg transform rotate-3"></div>
              <img 
                src="https://api.ascendacademy5280.com/storage/v1/object/public/media/rod1.png" 
                alt="Trainer" 
                className="relative rounded-lg shadow-2xl grayscale hover:grayscale-0 transition-all duration-500"
              />
              <div className="absolute -bottom-6 -right-6 bg-zinc-950 p-6 border-l-4 border-co-yellow">
                <p className="font-teko text-4xl text-white">RODERRICK JACKSON</p>
                <p className="text-zinc-400 text-sm tracking-widest uppercase">Head Trainer</p>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-12 h-1 bg-co-red"></span>
                <span className="uppercase tracking-widest text-zinc-400 text-sm font-semibold">About The Coach</span>
              </div>
              <h2 className="font-teko text-5xl md:text-6xl text-white mb-6 uppercase">Built Different.</h2>
              <p className="text-zinc-400 text-lg mb-6 leading-relaxed">
                Former D1 football player at Wyoming and Arena League veteran, Roderrick Jackson brings professional-grade intensity and knowledge to youth fitness.
              </p>
              <p className="text-zinc-400 text-lg mb-8 leading-relaxed">
                Ascend Academy 5280 isn't just a gym. It's a laboratory for building better athletes and better people. We focus on speed, agility, strength, and mental toughness.
              </p>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-zinc-800 rounded-full text-co-yellow"><Trophy size={24} /></div>
                  <div>
                    <h4 className="font-bold text-white">D1 Experience</h4>
                    <p className="text-xs text-zinc-500">Proven at top levels</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-zinc-800 rounded-full text-co-red"><Users size={24} /></div>
                  <div>
                    <h4 className="font-bold text-white">Mentorship</h4>
                    <p className="text-xs text-zinc-500">Character building</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Packages Section */}
      <section id="packages" className="py-24 bg-dark-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-teko text-6xl text-white uppercase mb-4">Training Packages</h2>
            <p className="text-zinc-400 text-xl max-w-2xl mx-auto">Choose your level of commitment. From Rookie foundations to Elite performance.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PACKAGES.map((pkg) => (
              <div key={pkg.id} className={`bg-card-bg p-8 flex flex-col relative group transition-all duration-300 border-t-4 border-transparent hover:border-co-yellow`}>
                <h3 className="font-teko text-4xl text-white uppercase mb-2">{pkg.name}</h3>
                <div className="flex items-baseline mb-6">
                  <span className="text-3xl font-bold text-white">$</span>
                  <span className="text-5xl font-teko font-bold text-white">{pkg.price}</span>
                  <span className="ml-2 text-zinc-500 text-sm">/ {pkg.billingPeriod}</span>
                </div>
                <p className="text-zinc-400 text-sm mb-6 h-10">{pkg.description}</p>
                <ul className="space-y-4 mb-8 flex-grow">
                  {pkg.features.map((feat, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-zinc-500 flex-shrink-0 mt-0.5" />
                      <span className="text-zinc-300 text-sm">{feat}</span>
                    </li>
                  ))}
                </ul>
                <Link 
                  to={`/checkout/${pkg.id}`} 
                  className="block w-full py-3 bg-transparent border border-zinc-700 text-center uppercase font-teko text-xl text-white hover:bg-white hover:text-black hover:border-transparent transition-colors duration-300"
                >
                  Select Plan
                </Link>
              </div>
            ))}
          </div>

          {/* Discounts & Sponsorship */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-lg">
              <div className="flex items-center gap-4 mb-4">
                <Star className="text-co-yellow" size={32} />
                <h3 className="font-teko text-3xl text-white uppercase">Sibling Discounts</h3>
              </div>
              <p className="text-zinc-400 mb-4">Building a legacy? We support athletic families.</p>
              <ul className="text-sm text-zinc-300 space-y-2">
                <li className="flex justify-between border-b border-zinc-800 pb-2">
                  <span>Sibling Discount (1st Sibling)</span>
                  <span className="text-co-yellow font-bold">45% OFF</span>
                </li>
                <li className="flex justify-between border-b border-zinc-800 pb-2">
                  <span>Additional Siblings</span>
                  <span className="text-co-yellow font-bold">65% OFF</span>
                </li>
              </ul>
            </div>

            <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-lg">
              <div className="flex items-center gap-4 mb-4">
                <Heart className="text-co-red" size={32} />
                <h3 className="font-teko text-3xl text-white uppercase">Community Support</h3>
              </div>
              <p className="text-zinc-400 mb-6">Every kid deserves a chance to compete. Donate to sponsor an athlete.</p>
              
              <div className="flex flex-col gap-4">
                <button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-3 px-4 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2 hover:bg-white hover:text-black duration-300">
                  Donate $10+
                </button>
                <button className="w-full border border-zinc-600 text-zinc-300 hover:bg-white hover:text-black hover:border-transparent py-3 px-4 rounded text-sm font-medium transition-colors duration-300">
                  Sponsor an Athlete (Tax Deductible)
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-co-red relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
        <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
          <h2 className="font-teko text-6xl text-white uppercase mb-6">Ready to Ascend?</h2>
          <p className="text-red-100 text-xl mb-10 max-w-2xl mx-auto">
            Spots fill up fast. Create your account, register your athletes, and get to work.
          </p>
          <Link 
            to="/login" 
            className="inline-block bg-white text-co-red px-12 py-4 font-teko text-2xl uppercase font-bold hover:bg-black hover:text-white shadow-xl transition-colors duration-300 rounded-sm"
          >
            Join Now
          </Link>
        </div>
      </section>
    </>
  );
};

export default HomePage;