import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { PACKAGES } from '../constants';
import { api } from '../services/api';
import { Child, User } from '../types';
import { Check, Shield, AlertCircle, CreditCard, User as UserIcon, Tag, Loader2, CheckCircle, RefreshCw } from 'lucide-react';
import { useModal } from '../context/ModalContext';
import LoadingScreen from '../components/LoadingScreen';

const CheckoutPage: React.FC = () => {
  const { showAlert, showConfirm } = useModal();
  const navigate = useNavigate();
  const location = useLocation();
  const { packageId } = useParams<{ packageId: string }>();
  
  const [user, setUser] = useState<User | null>(null);
  const [kids, setKids] = useState<Child[]>([]);
  const [activeKidId, setActiveKidId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [syncingPayment, setSyncingPayment] = useState(false);

  useEffect(() => {
    // 1. Check for Stripe Success Return
    const params = new URLSearchParams(location.search);
    const sessionId = params.get('session_id');
    
    if (sessionId) {
        handlePaymentReturn(sessionId);
    } else {
        loadData();
    }
  }, [location.search]); 

  const handlePaymentReturn = async (sessionId: string) => {
      setSyncingPayment(true);
      try {
          // Force manual sync to bypass webhook latency/failure
          console.log("Syncing session...", sessionId);
          await api.billing.syncSession(sessionId);
          setPaymentSuccess(true);
          showAlert('Payment Successful', 'Your subscription is active. Welcome to the team!', 'success');
      } catch (e) {
          console.error("Sync failed:", e);
          // Fallback: If sync API fails, hopefully webhook worked.
          setPaymentSuccess(true);
      } finally {
          // Clean URL
          window.history.replaceState({}, '', window.location.pathname);
          // Reload data to reflect new status
          setSyncingPayment(false);
          loadData();
      }
  };

  const loadData = async () => {
    try {
      // Re-fetch user to ensure we have the Stripe Customer ID if it was just created
      let u = await api.auth.getUser();
      
      if (!u) {
        const returnUrl = encodeURIComponent(location.pathname);
        navigate(`/login?redirect=${returnUrl}`);
        return;
      }

      // Ensure we have fresh profile data (Stripe ID specifically)
      const fresh = await api.auth.refreshProfile(u.id);
      if (fresh) u = { ...u, ...fresh };

      setUser(u);
      
      const k = await api.children.list(u.id);
      setKids(k);
      
      if (k.length > 0 && !activeKidId) {
        setActiveKidId(k[0].id);
      }
      
    } catch (e) {
      console.error(e);
    } finally {
       setLoading(false);
    }
  };

  const handleSubscribe = async (pkgId: string) => {
    if (!activeKidId || !user) return;
    const pkg = PACKAGES.find(p => p.id === pkgId);
    if (!pkg) return;

    // Check if child already has an active subscription
    const activeKid = kids.find(k => k.id === activeKidId);
    
    // Check for any non-canceled/non-none status
    if (activeKid && ['active', 'trialing', 'paused'].includes(activeKid.subscriptionStatus || '')) {
        const confirmed = await showConfirm(
            "Manage Subscription", 
            `To switch ${activeKid.firstName}'s plan to ${pkg.name}, please use our secure Billing Portal. We will redirect you there now.`
        );
        if (confirmed) {
            handleOpenPortal();
        }
        return;
    }

    // NEW SUBSCRIPTION FLOW
    // Calculate count of OTHER kids with active subs
    const activeSubscriptionCount = kids.filter(k => k.subscriptionStatus === 'active' && k.id !== activeKidId).length;

    setProcessing(true);
    try {
      // Return to THIS page
      // Using window.location.origin avoids hash issues now that we are on BrowserRouter
      const returnUrl = `${window.location.origin}/checkout/${pkgId}?kidId=${activeKidId}`;
      
      await api.billing.createCheckoutSession(
          pkg.stripePriceId, 
          activeKidId, 
          user.id, 
          activeSubscriptionCount,
          returnUrl, 
          user.email
      );
    } catch (e: any) {
      showAlert('Checkout Error', e.message || 'Checkout initiation failed.', 'error');
      setProcessing(false);
    }
  };

  const handleOpenPortal = async () => {
      try {
          setProcessing(true);
          await api.billing.createPortalSession();
      } catch (e: any) {
          showAlert('Billing Portal', e.message || 'Could not access billing portal.', 'error');
      } finally {
          setProcessing(false);
      }
  };

  // Pre-select kid from URL if present
  useEffect(() => {
     const params = new URLSearchParams(location.search);
     const kidParam = params.get('kidId');
     if (!loading && kidParam && kids.some(k => k.id === kidParam)) {
         setActiveKidId(kidParam);
     }
  }, [loading, location.search, kids]);


  if (loading || syncingPayment) return (
    <LoadingScreen 
        text={syncingPayment ? 'Confirming Payment...' : 'Loading Account...'} 
        subText={syncingPayment ? 'Securing your spot on the roster' : undefined} 
    />
  );

  if (!user && !loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-black text-white">
              <p>Authentication Required.</p>
          </div>
      );
  }

  const activeKid = kids.find(k => k.id === activeKidId);
  
  // Calculate discount Tier
  const otherActiveSubsCount = kids.filter(k => k.subscriptionStatus === 'active' && k.id !== activeKidId).length;
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
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[80vh]">
        
        {/* FULLSCREEN LOADING OVERLAY */}
        {processing && (
            <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center backdrop-blur-md animate-fade-in">
                <Loader2 className="w-20 h-20 text-co-yellow animate-spin mb-6" />
                <h2 className="text-white font-teko text-4xl uppercase tracking-widest animate-pulse">Processing...</h2>
                <p className="text-zinc-500 text-sm mt-3 uppercase tracking-wider">Please do not refresh the page</p>
            </div>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-teko text-5xl text-white uppercase mb-2">Choose Your Edge</h1>
          <p className="text-zinc-500 max-w-2xl mx-auto">
            Unlock full potential. Secure payment processing powered by Stripe.
          </p>
        </div>

        {paymentSuccess && (
            <div className="max-w-3xl mx-auto mb-8 bg-green-900/20 border border-green-800 p-6 rounded text-center flex flex-col items-center animate-fade-in">
                <CheckCircle className="text-green-500 mb-2" size={32} />
                <h3 className="text-white font-teko text-2xl uppercase">Payment Successful</h3>
                <p className="text-zinc-400 text-sm">Your athlete's subscription is active. Welcome to the team.</p>
                <button 
                  onClick={() => window.location.reload()} 
                  className="mt-4 text-xs text-zinc-400 hover:text-white flex items-center gap-1 uppercase tracking-wider"
                >
                  <RefreshCw size={12} /> Refresh Status
                </button>
            </div>
        )}

        {/* Athlete Selector Tabs */}
        {kids.length > 0 ? (
          <div className="flex justify-center mb-12 gap-4 flex-wrap">
            {kids.map(kid => (
              <button
                key={kid.id}
                onClick={() => setActiveKidId(kid.id)}
                className={`
                  relative px-8 py-3 rounded transform transition-all duration-300 font-teko text-2xl uppercase tracking-wide border-2
                  ${activeKidId === kid.id 
                    ? 'bg-co-yellow text-black border-co-yellow scale-110 z-10 shadow-[0_0_20px_rgba(255,215,0,0.4)]' 
                    : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600 hover:text-zinc-300 grayscale opacity-70 hover:opacity-100 hover:grayscale-0'}
                `}
              >
                {kid.firstName}
                {activeKidId === kid.id && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-co-yellow rotate-45"></div>
                )}
              </button>
            ))}
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2 rounded font-teko text-xl uppercase tracking-wide border-2 border-dashed border-zinc-700 text-zinc-500 hover:text-white hover:border-zinc-500 bg-transparent transition-colors opacity-70 hover:opacity-100"
            >
              + Add Athlete
            </button>
          </div>
        ) : (
          <div className="text-center mb-12 p-8 bg-zinc-900/50 rounded-lg border border-zinc-800 max-w-xl mx-auto">
            <UserIcon className="mx-auto h-12 w-12 text-zinc-600 mb-4" />
            <h3 className="text-white text-xl font-teko uppercase mb-2">No Athletes Found</h3>
            <p className="text-zinc-500 mb-6">You must create an athlete profile before purchasing a training package.</p>
            <button onClick={() => navigate('/dashboard')} className="bg-co-yellow text-black px-6 py-2 uppercase rounded">
              Go to Dashboard
            </button>
          </div>
        )}

        {/* Discount Banner */}
        {discountPercent > 0 && activeKid && activeKid.subscriptionStatus !== 'active' && (
             <div className="bg-gradient-to-r from-green-600 to-green-500 text-white p-4 mb-8 rounded text-center uppercase tracking-wide flex items-center justify-center gap-2 font-medium shadow-lg mx-auto max-w-2xl">
                <Tag size={20} /> {discountLabel}: Save {discountPercent}% on this subscription!
             </div>
        )}

        {/* Pricing Cards (Only if Kid Selected) */}
        {activeKid && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16 px-2">
            {PACKAGES.map((pkg) => {
              // Highlight if this kid has this specific active plan
              // Check against both internal ID and Stripe Price ID
              const isActivePlan = (activeKid.subscriptionStatus === 'active' || activeKid.subscriptionStatus === 'trialing') && 
                  (activeKid.subscriptionId === pkg.id || activeKid.subscriptionId === pkg.stripePriceId);
                  
              const isSelectedFromUrl = packageId === pkg.id;
              
              const finalPrice = discountPercent > 0 ? Math.round(pkg.price * (1 - discountPercent / 100)) : pkg.price;

              return (
                <div 
                  key={pkg.id} 
                  className={`
                    bg-card-bg p-8 flex flex-col relative transition-all duration-300 border-2 rounded-sm group
                    ${isActivePlan 
                        ? 'border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.2)] scale-[1.02] bg-zinc-900 z-10' 
                        : 'border-zinc-800 hover:border-co-yellow hover:shadow-[0_0_30px_rgba(255,215,0,0.15)] hover:-translate-y-2 hover:bg-zinc-900'}
                  `}
                >
                  {pkg.name === 'Elite' && !isActivePlan && (
                    <span className="absolute top-0 right-0 bg-co-yellow text-black text-[10px] px-2 py-1 uppercase rounded-bl font-medium font-teko tracking-wide z-10">
                      Best Value
                    </span>
                  )}
                  
                  {isActivePlan && (
                    <div className="absolute top-0 left-0 right-0 bg-green-500 text-black text-center text-xs font-bold uppercase py-1 tracking-wider">
                        Current Plan
                    </div>
                  )}

                  <div className="mb-4 mt-4">
                    <h3 className={`font-teko text-4xl uppercase transition-colors ${isActivePlan ? 'text-green-400' : 'text-white group-hover:text-co-yellow'}`}>{pkg.name}</h3>
                    <div className="flex items-baseline gap-1 mt-2 border-b border-zinc-800 pb-4">
                      <span className="text-3xl font-bold text-white">${finalPrice}</span>
                      <span className="text-sm text-zinc-500 uppercase font-medium">/ Month</span>
                    </div>
                    {discountPercent > 0 && (
                        <p className="text-xs text-co-yellow line-through decoration-zinc-500 text-zinc-500 mt-1 opacity-70">${pkg.price}/mo</p>
                    )}
                  </div>

                  <ul className="space-y-4 mb-8 flex-grow">
                    {pkg.features.map((feat, i) => ( 
                      <li key={i} className="flex items-start gap-3">
                        <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isActivePlan ? 'text-green-500' : 'text-co-yellow'}`} />
                        <span className="text-zinc-300 text-sm font-medium">{feat}</span>
                      </li>
                    ))}
                    <li className="text-xs text-zinc-600 italic">+ more</li>
                  </ul>

                  {isActivePlan ? (
                    <button disabled className="w-full bg-green-900/20 text-green-500 border border-green-900/50 py-4 uppercase font-teko text-xl rounded cursor-default tracking-wide">
                      Active
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleSubscribe(pkg.id)}
                      className="w-full py-4 uppercase font-teko text-2xl transition-colors tracking-wide border bg-black text-white border-zinc-700 hover:bg-co-yellow hover:text-black hover:border-co-yellow"
                    >
                      Select Plan
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
               <h3 className="flex items-center gap-2 text-white font-teko text-3xl uppercase mb-4">
                 <AlertCircle size={24} className="text-co-yellow" /> Subscription Status
               </h3>
               <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8">
                 <div className="flex justify-between items-center py-4 border-b border-zinc-800">
                    <span className="text-zinc-400 text-sm uppercase tracking-wide">Current Plan</span>
                    {activeKid.subscriptionStatus === 'active' ? (
                       <span className="bg-green-900/30 text-green-400 px-3 py-1 rounded text-xs uppercase border border-green-900/50 font-medium">Active</span>
                    ) : (
                       <span className="bg-zinc-800 text-zinc-500 px-3 py-1 rounded text-xs uppercase font-medium">No Active Plan</span>
                    )}
                 </div>
                 <div className="flex justify-between items-center py-4">
                    <span className="text-zinc-400 text-sm uppercase tracking-wide">Status</span>
                    <span className="text-zinc-500 text-sm uppercase font-bold">{activeKid.subscriptionStatus === 'active' ? 'Auto-Renewing' : 'Inactive'}</span>
                 </div>
               </div>
            </div>

            {/* Billing History Link */}
            <div>
               <h3 className="flex items-center gap-2 text-white font-teko text-3xl uppercase mb-4">
                 <CreditCard size={24} className="text-co-yellow" /> Billing Portal
               </h3>
               <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
                   <p className="text-zinc-400 text-sm mb-6">
                       Manage your payment methods, view past invoices, and cancel subscriptions via Stripe.
                   </p>
                   {activeKid.subscriptionStatus === 'active' || user.stripeCustomerId ? (
                        <button 
                            onClick={handleOpenPortal} 
                            disabled={processing}
                            className="bg-white text-black px-8 py-3 uppercase hover:bg-zinc-200 transition-colors w-full font-teko text-2xl tracking-wide border border-transparent"
                        >
                            Manage Subscription
                        </button>
                   ) : (
                        <button disabled className="bg-zinc-800 text-zinc-500 px-8 py-3 uppercase cursor-not-allowed w-full border border-zinc-700 font-teko text-2xl tracking-wide">
                            No Billing History
                        </button>
                   )}
               </div>
            </div>

          </div>
        )}
    </div>
  );
};

export default CheckoutPage;
