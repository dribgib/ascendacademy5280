import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PACKAGES } from '../constants';
import { api } from '../services/api';
import { Child, User } from '../types';
import { Check, Shield, AlertCircle, CreditCard, User as UserIcon, Tag } from 'lucide-react';
import { useModal } from '../context/ModalContext';

const CheckoutPage: React.FC = () => {
  const { showAlert } = useModal();
  const navigate = useNavigate();
  const location = useLocation();
  const { packageId } = useParams<{ packageId: string }>();
  
  const [user, setUser] = useState<User | null>(null);
  const [kids, setKids] = useState<Child[]>([]);
  const [activeKidId, setActiveKidId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const u = await api.auth.getUser();
      
      // If no user, redirect to login but save the current location so we can return
      if (!u) {
        const returnUrl = encodeURIComponent(location.pathname);
        navigate(`/login?redirect=${returnUrl}`);
        // We do NOT stop loading here, because we are redirecting.
        // If we stop loading, the UI might flash before redirect.
        return;
      }

      setUser(u);
      const k = await api.children.list(u.id);
      setKids(k);
      
      if (k.length > 0) {
        setActiveKidId(k[0].id);
      }
      
    } catch (e) {
      console.error(e);
    } finally {
       // CRITICAL: Always turn off loading even if no kids are found or error occurs
       // This prevents the "PREPARING CHECKOUT..." stuck screen.
       setLoading(false);
    }
  };

  const handleSubscribe = async (pkgId: string) => {
    if (!activeKidId || !user) return;
    const pkg = PACKAGES.find(p => p.id === pkgId);
    if (!pkg) return;

    // Calculate count of OTHER kids with active subs (excluding current one if they are updating)
    // For a new sub, it counts all existing active ones.
    const activeSubscriptionCount = kids.filter(k => k.subscriptionStatus === 'active' && k.id !== activeKidId).length;

    setProcessing(true);
    try {
      // Direct call to Billing Service which handles Stripe Checkout
      await api.billing.createCheckoutSession(pkg.stripePriceId, activeKidId, user.id, activeSubscriptionCount);
    } catch (e: any) {
      showAlert('Checkout Error', e.message || 'Checkout initiation failed.', 'error');
      setProcessing(false);
    }
  };

  // Pre-select the package from URL if it matches one of the cards
  useEffect(() => {
    if (!loading && activeKidId && packageId && packageId !== 'all') {
        // Logic to scroll to or highlight could go here
    }
  }, [loading, activeKidId, packageId]);

  if (loading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 p-4">
        <div className="text-co-yellow font-teko text-4xl animate-pulse tracking-widest text-center">
          PREPARING CHECKOUT...
        </div>
        <div className="w-64 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-co-red animate-[shimmer_1s_infinite] w-1/2"></div>
        </div>
    </div>
  );

  // If no user (and redirect failed for some reason), don't crash
  if (!user && !loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-black text-white">
              <p>Authentication Required.</p>
          </div>
      );
  }

  const activeKid = kids.find(k => k.id === activeKidId);
  const otherActiveSubsCount = kids.filter(k => k.subscriptionStatus === 'active' && k.id !== activeKidId).length;
  
  // Calculate discount Tier
  let discountLabel = '';
  let discountPercent = 0;

  if (otherActiveSubsCount === 1) {
      discountPercent = 45;
      discountLabel = "Sibling Discount Applied";
  } else if (otherActiveSubsCount >= 2) {
      discountPercent = 65;
      discountLabel = "Multi-Sibling Discount Applied";
  }

  return (
    <div className="min-h-screen bg-dark-bg pt-24 pb-12 font-poppins">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-teko text-5xl text-white uppercase mb-2">Choose Your Edge</h1>
          <p className="text-zinc-500 max-w-2xl mx-auto">
            Unlock full potential. Secure payment processing powered by Stripe.
            Manage subscriptions for each athlete below.
          </p>
        </div>

        {/* Athlete Selector Tabs */}
        {kids.length > 0 ? (
          <div className="flex justify-center mb-8 gap-2 flex-wrap">
            {kids.map(kid => (
              <button
                key={kid.id}
                onClick={() => setActiveKidId(kid.id)}
                className={`
                  px-6 py-2 rounded font-teko text-xl uppercase tracking-wide transition-colors border
                  ${activeKidId === kid.id 
                    ? 'bg-white text-black border-white' 
                    : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-500 hover:text-white'}
                `}
              >
                {kid.firstName} {kid.lastName}
              </button>
            ))}
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2 rounded font-teko text-xl uppercase tracking-wide border border-dashed border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-500"
            >
              + Add Athlete
            </button>
          </div>
        ) : (
          <div className="text-center mb-12 p-8 bg-zinc-900/50 rounded-lg border border-zinc-800 max-w-xl mx-auto">
            <UserIcon className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
            <h3 className="text-white text-xl font-teko uppercase mb-2">No Athletes Found</h3>
            <p className="text-zinc-500 mb-6">You must create an athlete profile before purchasing a training package.</p>
            <button onClick={() => navigate('/dashboard')} className="bg-co-yellow text-black px-6 py-2 font-bold uppercase rounded">
              Go to Dashboard
            </button>
          </div>
        )}

        {/* Discount Banner */}
        {discountPercent > 0 && activeKid && activeKid.subscriptionStatus !== 'active' && (
             <div className="bg-gradient-to-r from-co-yellow to-yellow-600 text-black p-4 mb-8 rounded font-bold text-center uppercase tracking-wide flex items-center justify-center gap-2 animate-pulse">
                <Tag size={20} /> {discountLabel}: Save {discountPercent}% on this subscription!
             </div>
        )}

        {/* Pricing Cards (Only if Kid Selected) */}
        {activeKid && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {PACKAGES.map((pkg) => {
              // Highlight if this kid has this specific active plan (mock logic)
              const isActivePlan = activeKid.subscriptionStatus === 'active' && activeKid.subscriptionId?.includes(pkg.id); // Loose matching for demo
              const isSelectedFromUrl = packageId === pkg.id;
              
              // Calculate Price
              const finalPrice = discountPercent > 0 ? Math.round(pkg.price * (1 - discountPercent / 100)) : pkg.price;

              return (
                <div 
                  key={pkg.id} 
                  className={`
                    relative bg-zinc-900 border p-6 flex flex-col rounded-lg transition-all duration-300
                    ${pkg.name === 'Elite' ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'border-zinc-800'}
                    ${isSelectedFromUrl ? 'ring-2 ring-co-yellow scale-105 z-10' : ''}
                  `}
                >
                  {pkg.name === 'Elite' && (
                    <span className="absolute top-0 right-0 bg-green-500 text-black text-[10px] font-bold px-2 py-1 uppercase rounded-bl">
                      Best Value
                    </span>
                  )}

                  <div className="mb-4">
                    <h3 className="font-teko text-3xl text-white uppercase">{pkg.name}</h3>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-bold text-white">${finalPrice}</span>
                      <span className="text-xs text-zinc-500 uppercase">/ Month</span>
                    </div>
                    {discountPercent > 0 && (
                        <p className="text-xs text-co-yellow line-through decoration-zinc-500 text-zinc-500">${pkg.price}/mo</p>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8 flex-grow">
                    {pkg.features.slice(0, 3).map((feat, i) => ( // Show top 3 features for compactness
                      <li key={i} className="flex items-start gap-2 text-sm text-zinc-400">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                    <li className="text-xs text-zinc-600 italic">+ more</li>
                  </ul>

                  {isActivePlan ? (
                    <button disabled className="w-full bg-green-900/30 text-green-500 border border-green-900 py-3 font-bold uppercase rounded cursor-default">
                      Current Plan
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleSubscribe(pkg.id)}
                      disabled={processing}
                      className={`
                        w-full py-3 font-bold uppercase rounded transition-colors text-sm tracking-widest
                        ${pkg.name === 'Elite' 
                          ? 'bg-green-500 text-black hover:bg-green-400' 
                          : 'bg-white text-black hover:bg-zinc-200'}
                      `}
                    >
                      {processing ? 'Processing...' : (isSelectedFromUrl ? 'Select This Plan' : 'Subscribe')}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Subscription Status & Billing History Panel */}
        {activeKid && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Status Panel */}
            <div>
               <h3 className="flex items-center gap-2 text-white font-teko text-2xl uppercase mb-4">
                 <AlertCircle size={20} className="text-green-500" /> Subscription Status
               </h3>
               <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                 <div className="flex justify-between items-center py-4 border-b border-zinc-800">
                    <span className="text-zinc-400 text-sm">Current Plan</span>
                    {activeKid.subscriptionStatus === 'active' ? (
                       <span className="bg-green-900/30 text-green-500 px-3 py-1 rounded text-xs font-bold uppercase border border-green-900">Active</span>
                    ) : (
                       <span className="bg-zinc-800 text-zinc-500 px-3 py-1 rounded text-xs font-bold uppercase">No Active Plan</span>
                    )}
                 </div>
                 <div className="flex justify-between items-center py-4">
                    <span className="text-zinc-400 text-sm">Status</span>
                    <span className="text-zinc-500 text-xs uppercase">{activeKid.subscriptionStatus === 'active' ? 'Auto-Renewing' : 'Inactive'}</span>
                 </div>
               </div>
            </div>

            {/* Billing History Stub */}
            <div>
               <h3 className="flex items-center gap-2 text-white font-teko text-2xl uppercase mb-4">
                 <CreditCard size={20} className="text-green-500" /> Billing History
               </h3>
               <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-950 text-zinc-500 uppercase text-xs">
                        <tr>
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium">Description</th>
                          <th className="px-4 py-3 font-medium text-right">Amount</th>
                          <th className="px-4 py-3 font-medium text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {/* Mock Rows or Empty State */}
                        {activeKid.subscriptionStatus === 'active' ? (
                          <tr>
                            <td className="px-4 py-3 text-zinc-300">Dec 15, 2023</td>
                            <td className="px-4 py-3 text-zinc-300">
                               <div className="font-bold">Stripe Payment</div>
                               <div className="text-[10px] text-zinc-600">tx_mock_12345</div>
                            </td>
                            <td className="px-4 py-3 text-zinc-300 text-right">$9.00</td>
                            <td className="px-4 py-3 text-right">
                              <span className="bg-green-900/30 text-green-500 text-[10px] px-2 py-1 rounded font-bold">PAID</span>
                            </td>
                          </tr>
                        ) : (
                          <tr>
                            <td colSpan={4} className="px-4 py-6 text-center text-zinc-600 text-xs italic">
                              No billing history available.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                 </div>
                 <div className="p-4 bg-zinc-950 border-t border-zinc-800 text-center">
                    <button onClick={() => api.billing.createPortalSession()} className="text-xs text-zinc-400 hover:text-white uppercase font-bold tracking-widest">
                       View All in Stripe Portal
                    </button>
                 </div>
               </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default CheckoutPage;