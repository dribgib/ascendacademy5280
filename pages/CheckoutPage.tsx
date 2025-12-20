import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PACKAGES } from '../constants';
import { api } from '../services/api';
import { Child, User } from '../types';
import { Check, Shield, Trophy, Heart, Users, CreditCard } from 'lucide-react';

const CheckoutPage: React.FC = () => {
  const { packageId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [kids, setKids] = useState<Child[]>([]);
  const [selectedKidIds, setSelectedKidIds] = useState<string[]>([]);
  
  // Extra Options
  const [donationAmount, setDonationAmount] = useState<number>(0);
  const [isSponsorship, setIsSponsorship] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);

  // Loading
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const selectedPackage = PACKAGES.find(p => p.id === packageId);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const u = await api.auth.getUser();
      if (!u) {
        // Redirect to login if not authenticated, keeping the return url
        navigate(`/login?redirect=/checkout/${packageId}`);
        return;
      }
      setUser(u);
      
      const k = await api.children.list(u.id);
      setKids(k);
      
      // Auto-select first kid if exists
      if (k.length > 0) setSelectedKidIds([k[0].id]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleKid = (id: string) => {
    if (selectedKidIds.includes(id)) {
      setSelectedKidIds(selectedKidIds.filter(k => k !== id));
    } else {
      setSelectedKidIds([...selectedKidIds, id]);
    }
  };

  const handleApplyPromo = () => {
    if (promoCode.toLowerCase() === 'family5280') {
      setAppliedPromo('FRIENDS_FAMILY');
      alert('Friends & Family Discount Applied: 50% OFF!');
    } else {
      alert('Invalid code');
      setAppliedPromo(null);
    }
  };

  // --- PRICING LOGIC ---
  const calculateTotal = () => {
    if (!selectedPackage) return 0;
    
    let subtotal = 0;
    const basePrice = selectedPackage.price;

    if (appliedPromo === 'FRIENDS_FAMILY') {
      // Flat 50% off everything
      subtotal = (basePrice * 0.5) * selectedKidIds.length;
    } else {
      // Sibling Discount Logic
      // 1st Kid: Full Price
      // 2nd Kid: 45% Off (price * 0.55)
      // 3rd+ Kid: 65% Off (price * 0.35)
      selectedKidIds.forEach((_, index) => {
        if (index === 0) {
          subtotal += basePrice;
        } else if (index === 1) {
          subtotal += basePrice * 0.55; 
        } else {
          subtotal += basePrice * 0.35;
        }
      });
    }

    // Sponsorship
    if (isSponsorship) {
       // Sponsorship adds 1 full base price
       subtotal += basePrice; 
    }

    return subtotal + donationAmount;
  };

  const handlePayment = async () => {
    if (selectedKidIds.length === 0 && !isSponsorship && donationAmount === 0) {
      alert('Please select an athlete or a donation option.');
      return;
    }

    setProcessing(true);

    try {
      // 1. In a real app, we call our backend to create a Stripe PaymentIntent/Session
      // const response = await fetch('/api/create-checkout-session', { ... });
      
      // 2. MOCK SUCCESS for Demo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 3. Save "Subscription" records to Supabase manually for the demo
      if (user && selectedPackage) {
        // Save for each selected kid
        for (const kidId of selectedKidIds) {
          await api.subscriptions.create(user.id, kidId, selectedPackage.id);
        }
        
        // Save sponsorship if selected (no child ID)
        if (isSponsorship) {
           await api.subscriptions.create(user.id, null, 'sponsorship');
        }
      }

      alert('Payment Successful! Welcome to the Academy.');
      navigate('/dashboard');

    } catch (e) {
      console.error(e);
      alert('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-co-yellow font-teko text-2xl">LOADING CHECKOUT...</div>;

  if (!selectedPackage) return <div className="text-white pt-20 text-center">Package not found</div>;

  const total = calculateTotal();

  return (
    <div className="min-h-screen bg-dark-bg pt-24 pb-12 px-4 sm:px-6 lg:px-8 font-poppins">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* LEFT COLUMN: Configuration */}
        <div>
          <h1 className="font-teko text-5xl text-white uppercase mb-2">Secure Checkout</h1>
          <p className="text-zinc-400 mb-8">Complete your registration to secure your spot.</p>

          {/* 1. Package Review */}
          <div className={`bg-card-bg border-l-4 ${selectedPackage.color} p-6 mb-6 rounded-r-lg`}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-2xl font-teko text-white uppercase">{selectedPackage.name} Package</h3>
                <p className="text-zinc-400 text-sm">{selectedPackage.billingPeriod} Billing</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-white">${selectedPackage.price}</span>
              </div>
            </div>
          </div>

          {/* 2. Select Athletes */}
          <div className="mb-8">
            <h3 className="text-xl font-teko text-white uppercase mb-4 flex items-center gap-2">
              <Users className="text-zinc-500" /> Select Athletes
            </h3>
            {kids.length === 0 ? (
               <div className="bg-red-900/20 border border-red-900 p-4 rounded text-red-200 text-sm">
                 You haven't added any athletes yet. Please go to your dashboard to add them first.
               </div>
            ) : (
              <div className="space-y-3">
                {kids.map((kid, index) => {
                  const isSelected = selectedKidIds.includes(kid.id);
                  return (
                    <div 
                      key={kid.id} 
                      onClick={() => toggleKid(kid.id)}
                      className={`
                        cursor-pointer p-4 rounded border flex items-center justify-between transition-all
                        ${isSelected ? 'bg-zinc-800 border-co-yellow' : 'bg-black border-zinc-800 hover:border-zinc-600'}
                      `}
                    >
                      <div>
                        <p className="text-white font-bold">{kid.firstName} {kid.lastName}</p>
                        <p className="text-xs text-zinc-500">{kid.sports.join(', ')}</p>
                      </div>
                      {isSelected && (
                         <div className="text-xs font-bold text-co-yellow uppercase">
                            {index === 0 ? 'Full Price' : index === 1 ? '45% OFF' : '65% OFF'}
                         </div>
                      )}
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center ${isSelected ? 'bg-co-yellow border-co-yellow' : 'border-zinc-600'}`}>
                        {isSelected && <Check size={14} className="text-black" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Community & Donation */}
          <div className="mb-8 bg-zinc-900/30 p-6 rounded border border-zinc-800">
            <h3 className="text-xl font-teko text-white uppercase mb-4 flex items-center gap-2">
              <Heart className="text-co-red" /> Community Support
            </h3>
            
            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isSponsorship}
                  onChange={(e) => setIsSponsorship(e.target.checked)}
                  className="form-checkbox h-5 w-5 text-co-red rounded focus:ring-0 bg-black border-zinc-700" 
                />
                <span className="text-zinc-300 text-sm">
                  Sponsor an Athlete (Add <strong>${selectedPackage.price}</strong>) - <span className="text-xs text-zinc-500">Includes Tax Write-off Ticket</span>
                </span>
              </label>

              <div>
                <p className="text-sm text-zinc-400 mb-2">Donate to the Equipment Fund</p>
                <div className="flex gap-2">
                  {[10, 20, 50, 100].map(amt => (
                    <button 
                      key={amt}
                      onClick={() => setDonationAmount(donationAmount === amt ? 0 : amt)}
                      className={`px-4 py-2 rounded text-sm font-bold border ${donationAmount === amt ? 'bg-white text-black border-white' : 'bg-black text-zinc-400 border-zinc-700'}`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Summary & Payment */}
        <div className="bg-white text-black p-8 rounded-lg h-fit shadow-2xl">
          <h2 className="font-teko text-4xl uppercase mb-6 border-b border-gray-200 pb-4">Order Summary</h2>
          
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Selected Package</span>
              <span className="font-bold">{selectedPackage.name} (${selectedPackage.price})</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Athletes</span>
              <span className="font-bold">{selectedKidIds.length}</span>
            </div>
            
            {isSponsorship && (
              <div className="flex justify-between text-sm text-co-red">
                <span>Sponsorship</span>
                <span>+${selectedPackage.price}</span>
              </div>
            )}
            
            {donationAmount > 0 && (
              <div className="flex justify-between text-sm text-zinc-800 font-bold">
                <span>Donation</span>
                <span>+${donationAmount}</span>
              </div>
            )}

            {appliedPromo && (
              <div className="flex justify-between text-sm text-green-600 font-bold">
                 <span>Promo: {appliedPromo}</span>
                 <span>-50% Applied</span>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center border-t border-gray-200 pt-4 mb-8">
            <span className="font-teko text-2xl uppercase">Total Due</span>
            <span className="font-teko text-4xl font-bold text-co-red">${total.toFixed(2)}</span>
          </div>

          {/* Promo Code Input */}
          <div className="flex gap-2 mb-8">
            <input 
              type="text" 
              placeholder="Promo Code" 
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              className="flex-1 bg-gray-100 border-none rounded px-4 py-2 text-sm uppercase"
            />
            <button 
              onClick={handleApplyPromo}
              className="bg-black text-white px-4 py-2 text-sm font-bold uppercase rounded hover:bg-zinc-800"
            >
              Apply
            </button>
          </div>

          {/* Mock Stripe Element */}
          <div className="mb-6">
             <h4 className="text-xs uppercase font-bold text-gray-400 mb-2 flex items-center gap-2">
                <Shield size={12} /> Secure Credit Card Payment
             </h4>
             <div className="bg-gray-50 border border-gray-200 p-4 rounded text-gray-400 text-sm flex items-center justify-between">
                <span>**** **** **** 4242</span>
                <CreditCard size={18} />
             </div>
             <p className="text-[10px] text-gray-400 mt-2">
                Powered by Stripe. Your data is encrypted.
             </p>
          </div>

          <button 
            onClick={handlePayment}
            disabled={processing}
            className="w-full bg-co-red text-white py-4 font-teko text-2xl uppercase font-bold hover:bg-red-800 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : `Pay $${total.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;