
// ... existing imports ...
import React, { useEffect, useState, useRef } from 'react';
import { User, Child, Event } from '../types';
import { api } from '../services/api';
import { Plus, User as KidIcon, Calendar, CheckCircle, CreditCard, ExternalLink, FileSignature, ArrowRight, Loader2, Settings, Upload, Camera, AlertTriangle, X, Trash2, RefreshCw, ChevronRight, PauseCircle, PlayCircle, ShieldAlert, Image as ImageIcon } from 'lucide-react';
import { POPULAR_SPORTS, WAIVER_CONFIG, PACKAGES, calculateAge } from '../constants';
import QRCodeDisplay from '../components/QRCodeDisplay';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import { useModal } from '../context/ModalContext';
import LoadingScreen from '../components/LoadingScreen';

// ... existing component definition ...
interface UserDashboardProps {
  user: User;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ user }) => {
  const { showAlert, showConfirm } = useModal();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isAdminView, setIsAdminView] = useState(false);
  const [kids, setKids] = useState<Child[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [systemError, setSystemError] = useState<string | null>(null);
  
  const [showAddKidModal, setShowAddKidModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  
  const [loading, setLoading] = useState(true);
  
  // New Kid Form State
  const [addStep, setAddStep] = useState(1);
  const [newKidName, setNewKidName] = useState({ first: '', last: '' });
  const [newKidDob, setNewKidDob] = useState('');
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [kidImage, setKidImage] = useState<File | null>(null);
  const [kidImagePreview, setKidImagePreview] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountMsg, setAccountMsg] = useState('');

  // Verification State
  const [polling, setPolling] = useState(false);
  const [verificationFailed, setVerificationFailed] = useState(false);
  const [manualOverride, setManualOverride] = useState(false);
  const [failMessage, setFailMessage] = useState('');
  const pollIntervalRef = useRef<number | null>(null);
  const pollTimeoutRef = useRef<number | null>(null);

  // ... (keep all useEffects and handlers the same until the render) ...
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    if (view === 'admin' && user.role === 'ADMIN') {
        setIsAdminView(true);
    } else {
        setIsAdminView(false);
    }
  }, [location.search, user.role]);

  useEffect(() => {
    if (!isAdminView) loadData();
    else setLoading(false);
  }, [user.id, isAdminView]);

  useEffect(() => {
      return () => stopPolling();
  }, []);

  const stopPolling = () => {
      if (pollIntervalRef.current) window.clearInterval(pollIntervalRef.current);
      if (pollTimeoutRef.current) window.clearTimeout(pollTimeoutRef.current);
      setPolling(false);
  };

  const toggleView = (target: 'admin' | 'parent') => {
      if (target === 'admin') navigate('/dashboard?view=admin');
      else navigate('/dashboard');
  };

  const loadData = async () => {
    setSystemError(null);
    try {
      const kidsPromise = api.children.list(user.id).catch(e => {
          console.error("Children fetch failed:", e);
          return [];
      });
      const eventsPromise = api.events.list().catch(e => {
          console.error("Events fetch failed:", e);
          return [];
      });

      const [kidsData, eventsData] = await Promise.all([kidsPromise, eventsPromise]);
      setKids(kidsData);
      
      const now = new Date();
      const futureEvents = eventsData.filter(evt => new Date(evt.isoStart) > now);
      setEvents(futureEvents);
    } catch (e: any) {
      console.error("Critical Dashboard Load Error:", e);
      setSystemError("Unable to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setLoading(true);
      await api.billing.createPortalSession();
    } catch (e: any) {
      console.error("Billing Error:", e);
      const msg = e.message || '';
      if (msg.includes('No billing history') || msg.includes('No billing account') || msg.includes('subscribe')) {
         showAlert('No Billing History', 'You do not have any active subscriptions or payment history yet. Subscribe to a plan first.', 'info');
      } else {
         showAlert('Portal Unavailable', msg || 'Could not connect to billing portal.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setAccountMsg("Passwords do not match.");
      return;
    }
    try {
      setAccountMsg("Updating...");
      const { error } = await api.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setAccountMsg("Password updated successfully.");
      setTimeout(() => {
         setShowAccountModal(false);
         setAccountMsg('');
         setNewPassword('');
         setConfirmPassword('');
      }, 1500);
    } catch (err: any) {
      setAccountMsg(err.message || "Failed to update.");
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setKidImage(file);
      setKidImagePreview(URL.createObjectURL(file));
    }
  };

  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddStep(2);
  };

  const createChildProfile = async () => {
      stopPolling();
      setImageUploading(true);
      let imageUrl = undefined;
      
      if (kidImage && (api as any).children.uploadImage) {
          try {
              const uploaded = await (api as any).children.uploadImage(kidImage, user.id);
              if (uploaded) imageUrl = uploaded;
          } catch (uploadErr) {
              console.error("Image upload failed, proceeding without image:", uploadErr);
          }
      }

      await api.children.create({
          parentId: user.id,
          firstName: newKidName.first,
          lastName: newKidName.last,
          dob: newKidDob,
          sports: selectedSports,
          imageUrl
      });
      
      setShowAddKidModal(false);
      loadData();
      resetForm();
      showAlert('Success', 'Athlete added successfully!', 'success');
  };

  const startVerification = () => {
      setAddStep(4);
      setPolling(true);
      setVerificationFailed(false);
      setFailMessage('');

      pollTimeoutRef.current = window.setTimeout(() => {
          stopPolling();
          setVerificationFailed(true);
          setFailMessage("Verification timed out. Systems may be slow.");
      }, 120000); 

      checkWaivers();
      pollIntervalRef.current = window.setInterval(checkWaivers, 5000);
  };

  const checkWaivers = async () => {
      try {
          const result = await (api as any).waivers.checkStatus(user.email, `${newKidName.first} ${newKidName.last}`);
          if (result.verified) {
              stopPolling();
              await createChildProfile();
          } 
      } catch (e) {
          console.error("Waiver poll error:", e);
      }
  };

  const handleManualOverride = async () => {
      if (!manualOverride) return;
      await createChildProfile();
  };

  const handleDeleteKid = async (kid: Child) => {
    const confirmed = await showConfirm(
      "Remove Athlete?", 
      `Are you sure you want to remove ${kid.firstName} from your profile? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      await (api.children as any).delete(kid.id);
      loadData();
      showAlert('Deleted', 'Athlete profile removed.', 'success');
    } catch (e: any) {
      console.error(e);
      showAlert('Error', e.message || 'Failed to delete profile.', 'error');
    }
  };
  
  const handlePauseSubscription = async (kid: Child) => {
      const confirmed = await showConfirm(
          "Pause Subscription?",
          `Are you sure you want to pause billing for ${kid.firstName}? This will void upcoming invoices but keep the account on file.`
      );
      if (!confirmed) return;
      
      try {
          await (api.billing as any).pauseSubscription(kid.id);
          loadData();
          showAlert('Paused', 'Subscription has been paused.', 'success');
      } catch (e: any) {
          showAlert('Error', e.message || 'Failed to pause.', 'error');
      }
  };

  const handleResumeSubscription = async (kid: Child) => {
      const confirmed = await showConfirm(
          "Resume Subscription?",
          `Resume billing for ${kid.firstName}? This will reactivate the subscription immediately.`
      );
      if (!confirmed) return;

      try {
          await (api.billing as any).resumeSubscription(kid.id);
          loadData();
          showAlert('Resumed', 'Subscription is active again!', 'success');
      } catch (e: any) {
          showAlert('Error', e.message || 'Failed to resume.', 'error');
      }
  };

  const resetForm = () => {
    setNewKidName({ first: '', last: '' });
    setSelectedSports([]);
    setNewKidDob('');
    setKidImage(null);
    setKidImagePreview(null);
    setAddStep(1);
    stopPolling();
    setVerificationFailed(false);
    setManualOverride(false);
    setFailMessage('');
    setImageUploading(false);
  };

  const toggleSport = (sport: string) => {
    if (selectedSports.includes(sport)) {
      setSelectedSports(selectedSports.filter(s => s !== sport));
    } else {
      setSelectedSports([...selectedSports, sport]);
    }
  };

  const handleRegister = async (event: Event, kidId: string, isWaitlist: boolean) => {
    const kid = kids.find(k => k.id === kidId);
    if (kid && event.minAge !== undefined && event.maxAge !== undefined && kid.dob) {
        const age = calculateAge(kid.dob);
        if (age < event.minAge || age > event.maxAge) {
           showAlert(
               "Age Restriction", 
               `This session is for athletes aged ${event.minAge}-${event.maxAge}. ${kid.firstName} is currently ${age}.`, 
               'info'
           );
           return;
        }
    }

    const action = isWaitlist ? "Join Waitlist" : "Register";
    const confirmed = await showConfirm(`Confirm ${action}`, `${action} for this session?`);
    if (!confirmed) return;

    try {
      await api.registrations.register(event.id, kidId);
      loadData();
      showAlert('Success', isWaitlist ? 'Added to Waitlist!' : 'Registration Successful!', 'success');
    } catch (e: any) {
      console.error(e);
      showAlert('Registration Failed', e.message || 'Please try again.', 'error');
    }
  };

  const handleUnregister = async (eventId: string, kidId: string) => {
    const confirmed = await showConfirm("Cancel Registration?", "Are you sure you want to remove this athlete from the session?");
    if (!confirmed) return;

    try {
      await api.registrations.unregister(eventId, kidId);
      loadData();
      showAlert('Success', 'Registration cancelled.', 'success');
    } catch (e: any) {
      console.error(e);
      showAlert('Error', e.message || 'Failed to cancel.', 'error');
    }
  };
  
  const getPackageIdForUrl = (subId?: string) => {
      if (!subId) return 'p_elite'; 
      const pkg = PACKAGES.find(p => p.id === subId || p.stripePriceId === subId);
      return pkg ? pkg.id : subId;
  };

  if (loading && !isAdminView) return <LoadingScreen text="Loading Dashboard" />;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[80vh]">
      
      {/* --- HEADER --- */}
      <div className="flex flex-col mb-10 border-b border-zinc-800 pb-8">
        <div className="flex flex-wrap justify-between items-start gap-6">
            <div className="flex-1 min-w-[300px]">
                <h1 className="font-teko text-5xl md:text-6xl text-white uppercase leading-none whitespace-nowrap mb-2">
                    {isAdminView ? "Coach's Dashboard" : "My Team"}
                </h1>
                <p className="text-zinc-500 max-w-xl">
                    {isAdminView 
                        ? `Welcome back, ${user.firstName}. Access roster and schedule controls.` 
                        : "Manage your athletes, subscriptions, and schedules."
                    }
                </p>
            </div>

            {!isAdminView && (
                <div className="flex flex-wrap gap-3 w-full lg:w-auto mt-4 lg:mt-0 justify-start lg:justify-end">
                    <button 
                        onClick={() => setShowAccountModal(true)}
                        className="border border-zinc-700 text-zinc-300 px-6 py-3 font-teko text-xl uppercase hover:bg-zinc-800 hover:text-white rounded flex items-center justify-center gap-2 transition-colors whitespace-nowrap flex-grow sm:flex-grow-0"
                    >
                        <Settings size={18} /> Account
                    </button>
                    <button 
                        onClick={handleManageBilling}
                        className="border border-zinc-700 text-zinc-300 px-6 py-3 font-teko text-xl uppercase hover:bg-zinc-800 hover:text-white rounded flex items-center justify-center gap-2 transition-colors whitespace-nowrap flex-grow sm:flex-grow-0"
                    >
                        <CreditCard size={18} /> Billing
                    </button>
                    <button 
                        onClick={() => setShowAddKidModal(true)}
                        className="bg-co-yellow text-black px-8 py-3 font-teko text-xl uppercase rounded hover:bg-white transition-colors flex items-center justify-center gap-2 shadow-lg whitespace-nowrap flex-grow sm:flex-grow-0"
                    >
                        <Plus size={20} /> Add Athlete
                    </button>
                </div>
            )}
        </div>

        {user.role === 'ADMIN' && (
            <div className="mt-8 flex">
                <div className="bg-zinc-900 border border-zinc-700 p-1 rounded-lg inline-flex">
                    <button 
                        onClick={() => toggleView('parent')}
                        className={`px-6 py-2 rounded-md font-teko text-xl uppercase transition-all whitespace-nowrap ${!isAdminView ? 'bg-white text-black' : 'text-zinc-500 hover:text-white'}`}
                    >
                        My Team
                    </button>
                    <button 
                        onClick={() => toggleView('admin')}
                        className={`px-6 py-2 rounded-md font-teko text-xl uppercase transition-all whitespace-nowrap ${isAdminView ? 'bg-co-yellow text-black' : 'text-zinc-500 hover:text-white'}`}
                    >
                        Coach
                    </button>
                </div>
            </div>
        )}
      </div>

      {systemError && (
          <div className="bg-red-900/20 border border-red-900 p-4 rounded-lg mb-8 flex items-center gap-4 text-red-200">
              <AlertTriangle size={24} />
              <div>
                  <h3 className="font-bold uppercase">System Alert</h3>
                  <p className="text-sm opacity-80">{systemError}</p>
              </div>
          </div>
      )}

      {/* --- CONTENT --- */}
      {isAdminView ? (
          <AdminDashboard user={user} hideHeader={true} />
      ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Col: Kids */}
                <div className="lg:col-span-1 space-y-6">
                {kids.length === 0 ? (
                    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-10 text-center">
                        <KidIcon className="mx-auto text-zinc-700 mb-4" size={48} />
                        <h3 className="text-white font-teko text-2xl uppercase mb-2">No Athletes Found</h3>
                        <p className="text-zinc-500 text-sm mb-6">Add your child to start scheduling sessions.</p>
                        <button onClick={() => setShowAddKidModal(true)} className="text-co-yellow underline uppercase font-teko text-xl">
                            Add First Athlete
                        </button>
                    </div>
                ) : (
                    kids.map(kid => (
                    <div key={kid.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 relative overflow-hidden group hover:border-zinc-600 transition-colors">
                        <div className={`absolute top-0 left-0 w-1 h-full ${kid.subscriptionStatus === 'active' ? 'bg-green-500' : kid.subscriptionStatus === 'paused' ? 'bg-amber-500' : 'bg-zinc-700'}`}></div>
                        
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteKid(kid); }}
                            className="absolute top-4 right-4 text-zinc-600 hover:text-red-500 transition-colors z-10"
                            title="Remove Athlete"
                        >
                            <Trash2 size={16} />
                        </button>

                        <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-4">
                            <div className="h-16 w-16 rounded-full overflow-hidden bg-zinc-800 border-2 border-zinc-700 flex-shrink-0">
                            {kid.image ? (
                                <img src={kid.image} alt={kid.firstName} className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-zinc-500">
                                    <KidIcon size={24} />
                                </div>
                            )}
                            </div>

                            <div className="flex-1 min-w-0 pr-6">
                                <h3 
                                    className={`font-teko text-3xl text-white uppercase leading-none mt-1 truncate ${kid.subscriptionStatus !== 'active' && kid.subscriptionStatus !== 'paused' ? 'cursor-pointer hover:text-co-yellow' : ''}`}
                                    onClick={() => {
                                        if (kid.subscriptionStatus !== 'active' && kid.subscriptionStatus !== 'paused') {
                                            navigate(`/checkout/p_elite?kidId=${kid.id}`);
                                        }
                                    }}
                                >
                                    {kid.firstName} {kid.lastName}
                                </h3>
                                <p className="text-zinc-500 text-sm mt-1">{kid.sports.join(', ')}</p>
                                
                                <div className="mt-4">
                                    {kid.subscriptionStatus === 'active' && kid.usageStats ? (
                                    <div className="flex flex-col items-start gap-3">
                                        <div className="flex flex-wrap gap-2 items-center">
                                            <span className="text-[10px] uppercase font-medium bg-green-900/40 text-green-400 px-2 py-1 rounded border border-green-900/50 inline-block">
                                                {kid.usageStats.planName} Plan
                                            </span>
                                            <span className="text-[10px] text-zinc-500">
                                                {kid.usageStats.used} / {kid.usageStats.limit} Sessions This Month
                                            </span>
                                        </div>
                                        
                                        {/* Class Pack Credits */}
                                        {kid.classPacks && kid.classPacks.length > 0 && (
                                            <div className="w-full bg-blue-950/30 border border-blue-900/50 rounded p-3">
                                                <div className="text-[10px] uppercase font-bold text-blue-400 mb-2 tracking-wider">Class Packs Available</div>
                                                <div className="flex flex-col gap-1.5">
                                                    {kid.classPacks.map((pack: any, idx: number) => {
                                                        const expiresAt = new Date(pack.expiresAt);
                                                        const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                                        const isExpiringSoon = daysLeft <= 7;
                                                        return (
                                                            <div key={idx} className="flex items-center justify-between text-[10px]">
                                                                <span className="text-zinc-300 font-medium">
                                                                    {pack.packType.replace('pack_', '').replace('_', ' ')} Pack
                                                                </span>
                                                                <span className={`font-bold ${isExpiringSoon ? 'text-amber-400' : 'text-blue-400'}`}>
                                                                    {pack.creditsRemaining} / {pack.creditsTotal} credits • {daysLeft} days left
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                        
                                        <div className="flex gap-2 w-full">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/checkout/${getPackageIdForUrl(kid.subscriptionId)}?kidId=${kid.id}`);
                                                }}
                                                className="flex-1 bg-white hover:bg-zinc-200 text-black text-[10px] uppercase font-bold py-2 px-2 rounded transition-colors flex items-center justify-center gap-1 shadow-sm font-teko tracking-wide"
                                            >
                                                <RefreshCw size={12} /> Change Plan
                                            </button>
                                            <button
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    navigate(`/checkout/pack_10_45min?kidId=${kid.id}`); 
                                                }}
                                                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] uppercase font-bold py-2 px-2 rounded transition-colors flex items-center justify-center gap-1 border border-blue-500 font-teko tracking-wide"
                                            >
                                                <Plus size={12} /> Buy Pack
                                            </button>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handlePauseSubscription(kid); }}
                                            className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] uppercase font-bold py-2 px-2 rounded transition-colors flex items-center justify-center gap-1 border border-zinc-700 font-teko tracking-wide"
                                        >
                                            <PauseCircle size={12} /> Pause Subscription
                                        </button>
                                    </div>
                                    ) : kid.subscriptionStatus === 'paused' ? (
                                        <div className="flex flex-col items-start gap-3">
                                            <span className="text-[10px] uppercase font-medium bg-amber-900/40 text-amber-400 px-2 py-1 rounded border border-amber-900/50 inline-block">
                                                Subscription Paused
                                            </span>
                                            
                                            {/* Class Pack Credits for paused subscriptions */}
                                            {kid.classPacks && kid.classPacks.length > 0 && (
                                                <div className="w-full bg-blue-950/30 border border-blue-900/50 rounded p-3">
                                                    <div className="text-[10px] uppercase font-bold text-blue-400 mb-2 tracking-wider">Class Packs Available</div>
                                                    <div className="flex flex-col gap-1.5">
                                                        {kid.classPacks.map((pack: any, idx: number) => {
                                                            const expiresAt = new Date(pack.expiresAt);
                                                            const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                                            const isExpiringSoon = daysLeft <= 7;
                                                            return (
                                                                <div key={idx} className="flex items-center justify-between text-[10px]">
                                                                    <span className="text-zinc-300 font-medium">
                                                                        {pack.packType.replace('pack_', '').replace('_', ' ')} Pack
                                                                    </span>
                                                                    <span className={`font-bold ${isExpiringSoon ? 'text-amber-400' : 'text-blue-400'}`}>
                                                                        {pack.creditsRemaining} / {pack.creditsTotal} credits • {daysLeft} days left
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            <div className="flex gap-2 w-full">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleResumeSubscription(kid); }}
                                                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-black text-[10px] uppercase font-bold py-2 px-4 rounded transition-colors flex items-center justify-center gap-1 shadow-sm font-teko tracking-wide"
                                                >
                                                    <PlayCircle size={12} /> Resume
                                                </button>
                                                <button
                                                    onClick={(e) => { 
                                                        e.stopPropagation(); 
                                                        navigate(`/checkout/pack_10_45min?kidId=${kid.id}`); 
                                                    }}
                                                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-[10px] uppercase font-bold py-2 px-2 rounded transition-colors flex items-center justify-center gap-1 font-teko tracking-wide"
                                                >
                                                    <Plus size={12} /> Buy Pack
                                                </button>
                                            </div>
                                        </div>
                                    ) : kid.classPacks && kid.classPacks.length > 0 ? (
                                        <div className="flex flex-col items-start gap-3">
                                            <span className="text-[10px] uppercase font-medium text-zinc-400 px-2 py-1 rounded border border-zinc-700 inline-block">
                                                Class Pack Only
                                            </span>
                                            
                                            {/* Show class pack credits */}
                                            <div className="w-full bg-blue-950/30 border border-blue-900/50 rounded p-3">
                                                <div className="text-[10px] uppercase font-bold text-blue-400 mb-2 tracking-wider">Class Packs Available</div>
                                                <div className="flex flex-col gap-1.5">
                                                    {kid.classPacks.map((pack: any, idx: number) => {
                                                        const expiresAt = new Date(pack.expiresAt);
                                                        const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                                        const isExpiringSoon = daysLeft <= 7;
                                                        return (
                                                            <div key={idx} className="flex items-center justify-between text-[10px]">
                                                                <span className="text-zinc-300 font-medium">
                                                                    {pack.packType.replace('pack_', '').replace('_', ' ')} Pack
                                                                </span>
                                                                <span className={`font-bold ${isExpiringSoon ? 'text-amber-400' : 'text-blue-400'}`}>
                                                                    {pack.creditsRemaining} / {pack.creditsTotal} credits • {daysLeft} days left
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            
                                            <button 
                                                onClick={() => navigate(`/checkout/pack_10_45min?kidId=${kid.id}`)} 
                                                className="w-full bg-blue-600 hover:bg-blue-500 text-white text-[10px] uppercase font-bold py-2 px-3 rounded transition-colors flex items-center justify-center gap-1 shadow-sm font-teko tracking-wide"
                                            >
                                                Buy More Credits <ChevronRight size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                    <button 
                                        onClick={() => navigate(`/checkout/p_elite?kidId=${kid.id}`)} 
                                        className="w-full text-xs uppercase font-medium bg-red-900/40 text-red-200 px-3 py-2 rounded border border-red-900/50 hover:bg-red-900 transition-colors flex items-center justify-center gap-1 mt-2"
                                    >
                                        No Active Plan <ChevronRight size={12} />
                                    </button>
                                    )}
                                </div>
                            </div>
                        </div>
                        </div>
                        
                        <div className="flex flex-col items-center bg-white/5 p-4 rounded-lg mt-4">
                            <p className="text-xs text-zinc-400 mb-2 uppercase tracking-widest">Access Pass</p>
                            <QRCodeDisplay value={kid.qrCode} size={120} />
                            <p className="text-[10px] text-zinc-500 mt-2 font-mono">{kid.qrCode}</p>
                        </div>
                    </div>
                    ))
                )}
                </div>

                {/* Right Col: Schedule */}
                <div className="lg:col-span-2">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
                    <h2 className="font-teko text-3xl text-white uppercase mb-6 flex items-center gap-2">
                    <Calendar className="text-co-red" /> Upcoming Sessions
                    </h2>
                    <div className="space-y-4">
                    {events.length === 0 ? <p className="text-zinc-500">No upcoming sessions found.</p> : events.map(evt => {
                        const isFull = evt.bookedSlots >= evt.maxSlots;
                        const ageLabel = (evt.minAge && evt.maxAge) ? `Ages ${evt.minAge}-${evt.maxAge}` : 'All Ages';

                        return (
                        <div key={evt.id} className="bg-black border border-zinc-800 p-5 rounded hover:border-zinc-700 transition-colors">
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded font-mono">{evt.date}</span>
                                <span className="text-co-yellow font-bold text-sm">{evt.startTime} - {evt.endTime}</span>
                                
                                <span className="bg-zinc-900 text-co-yellow text-[10px] px-2 py-1 rounded border border-zinc-800 uppercase font-bold">
                                    {ageLabel}
                                </span>
                                </div>
                                <h4 className="font-bold text-white text-lg">{evt.title}</h4>
                                <p className="text-zinc-500 text-sm">{evt.description} @ {evt.location}</p>
                                <div className="mt-2 text-xs text-zinc-600">
                                {evt.bookedSlots} / {evt.maxSlots} Slots Taken
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 min-w-[140px]">
                                {kids.map(kid => {
                                const isRegistered = evt.registeredKidIds.includes(kid.id);
                                const limitReached = kid.usageStats && kid.usageStats.used >= kid.usageStats.limit;
                                const hasPlan = kid.subscriptionStatus === 'active';
                                return (
                                    <button
                                    key={kid.id}
                                    disabled={(!isRegistered && limitReached) || (!isRegistered && !hasPlan)}
                                    onClick={() => isRegistered ? handleUnregister(evt.id, kid.id) : handleRegister(evt, kid.id, isFull)}
                                    className={`
                                        text-xs py-2 px-3 rounded uppercase font-bold transition-colors
                                        ${isRegistered 
                                        ? 'bg-green-900/30 text-green-500 border border-green-900 hover:bg-red-900/50 hover:text-red-200 hover:border-red-900 cursor-pointer' 
                                        : (limitReached || !hasPlan)
                                            ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-800'
                                            : isFull
                                                ? 'bg-zinc-800 border border-zinc-700 text-white hover:border-co-yellow'
                                                : 'bg-zinc-800 hover:bg-co-red hover:text-white text-zinc-300 border border-zinc-700'}
                                    `}
                                    >
                                    {isRegistered ? (
                                        <span className="flex items-center justify-center gap-1"><CheckCircle size={12} /> {kid.firstName} In</span>
                                    ) : !hasPlan ? `Plan Required for ${kid.firstName}` : limitReached ? `Limit Reached` : isFull ? `Waitlist ${kid.firstName}` : `Sign Up ${kid.firstName}`}
                                    </button>
                                );
                                })}
                                {kids.length === 0 && <span className="text-xs text-zinc-600 italic">Add athlete to register</span>}
                            </div>
                            </div>
                        </div>
                        );
                    })}
                    </div>
                </div>
                </div>
          </div>
      )}

      {/* Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowAccountModal(false)}>
        <div className="bg-card-bg border border-zinc-700 p-8 rounded-lg max-w-md w-full relative shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowAccountModal(false)} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X size={24} /></button>
            <div className="text-center mb-8">
                <Settings className="mx-auto text-co-yellow mb-4" size={48} />
                <h2 className="font-teko text-4xl text-white uppercase tracking-wide">Account Settings</h2>
            </div>
            <div className="mb-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded">
                <p className="text-zinc-500 text-xs uppercase font-medium mb-1 tracking-wider">Registered Email</p>
                <p className="text-white font-mono text-sm">{user.email}</p>
                <p className="text-zinc-600 text-[10px] mt-2 italic">Contact support to change email address.</p>
            </div>
            <form onSubmit={handleUpdatePassword} className="border-t border-zinc-800 pt-6">
                <p className="text-white text-xl font-teko uppercase mb-4">Change Password</p>
                <div className="space-y-4">
                    <div>
                        <input required type="password" placeholder="New Password" minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-black border border-zinc-700 rounded px-4 py-3 text-white text-sm focus:border-co-yellow outline-none transition-colors" />
                    </div>
                    <div>
                        <input required type="password" placeholder="Confirm Password" minLength={6} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-black border border-zinc-700 rounded px-4 py-3 text-white text-sm focus:border-co-yellow outline-none transition-colors" />
                    </div>
                    <button type="submit" className="w-full bg-co-yellow hover:bg-white text-black py-3 uppercase font-teko text-xl rounded transition-colors shadow-lg mt-2">Update Password</button>
                </div>
                {accountMsg && <div className={`mt-4 text-center p-2 rounded text-sm ${accountMsg.includes('success') ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>{accountMsg}</div>}
            </form>
        </div>
        </div>
      )}

      {/* Add Kid Modal - Wizard Steps */}
      {showAddKidModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => { setShowAddKidModal(false); resetForm(); }}>
        <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center gap-2 mb-8 text-xs uppercase tracking-wide">
                <span className={`font-bold ${addStep === 1 ? 'text-co-yellow' : addStep > 1 ? 'text-green-500' : 'text-zinc-600'}`}>1. Details</span>
                <span className="text-zinc-600">/</span>
                <span className={`font-bold ${addStep === 2 ? 'text-co-yellow' : addStep > 2 ? 'text-green-500' : 'text-zinc-600'}`}>2. Liability</span>
                <span className="text-zinc-600">/</span>
                <span className={`font-bold ${addStep === 3 ? 'text-co-yellow' : addStep > 3 ? 'text-green-500' : 'text-zinc-600'}`}>3. Photo</span>
                <span className="text-zinc-600">/</span>
                <span className={`font-bold ${addStep === 4 ? 'text-co-yellow' : 'text-zinc-600'}`}>4. Verify</span>
            </div>

            {addStep === 1 && (
                <>
                <h2 className="font-teko text-3xl text-white uppercase mb-6">New Athlete Profile</h2>
                <form onSubmit={handleDetailsSubmit} className="space-y-4">
                <div className="flex items-center gap-6 mb-6 p-4 bg-black rounded border border-zinc-800">
                    <div className="h-20 w-20 rounded-full overflow-hidden bg-zinc-900 border border-zinc-700 flex items-center justify-center flex-shrink-0 relative">
                        {kidImagePreview ? <img src={kidImagePreview} alt="Preview" className="h-full w-full object-cover" /> : <Camera className="text-zinc-600" />}
                    </div>
                    <div className="flex-1">
                        <label className="block text-zinc-400 text-xs uppercase mb-2">Profile Photo (Optional)</label>
                        <label className="cursor-pointer inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded text-xs uppercase font-medium text-zinc-300 transition-colors">
                            <Upload size={14} /> Choose Image
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                        </label>
                        {kidImage && <p className="text-[10px] text-green-500 mt-2">Image Selected</p>}
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-zinc-400 text-xs uppercase mb-1">First Name</label>
                        <input required type="text" className="w-full bg-black border border-zinc-700 p-2 text-white" value={newKidName.first} onChange={e => setNewKidName({...newKidName, first: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-zinc-400 text-xs uppercase mb-1">Last Name</label>
                        <input required type="text" className="w-full bg-black border border-zinc-700 p-2 text-white" value={newKidName.last} onChange={e => setNewKidName({...newKidName, last: e.target.value})} />
                    </div>
                </div>
                <div>
                    <label className="block text-zinc-400 text-xs uppercase mb-1">Date of Birth</label>
                    <div className="relative">
                         <input 
                             required 
                             type="date" 
                             className="w-full bg-black border border-zinc-700 p-2 text-white rounded focus:border-co-yellow outline-none [color-scheme:dark] cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0" 
                             value={newKidDob} 
                             onChange={e => setNewKidDob(e.target.value)} 
                             onClick={(e) => (e.target as HTMLInputElement).showPicker()} 
                         />
                         <Calendar className="absolute right-3 top-2.5 text-zinc-500 pointer-events-none" size={16} />
                    </div>
                </div>
                <div>
                    <label className="block text-zinc-400 text-xs uppercase mb-2">Interests</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {POPULAR_SPORTS.map(sport => (
                        <button type="button" key={sport} onClick={() => toggleSport(sport)} className={`text-xs p-2 rounded border transition-colors ${selectedSports.includes(sport) ? 'bg-co-red border-co-red text-white' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}>
                        {sport}
                        </button>
                    ))}
                    </div>
                </div>
                <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => { setShowAddKidModal(false); resetForm(); }} className="flex-1 py-3 text-zinc-400 hover:text-white uppercase font-teko text-xl">Cancel</button>
                    <button type="submit" className="flex-1 bg-white hover:bg-zinc-200 text-black py-3 uppercase font-teko text-xl font-medium rounded flex items-center justify-center gap-2">Next: Waiver <ArrowRight size={18} /></button>
                </div>
                </form>
                </>
            )}

            {addStep === 2 && (
                <div className="text-center">
                    <h2 className="font-teko text-3xl text-white uppercase mb-2">Liability Waiver</h2>
                    <p className="text-zinc-500 text-sm mb-8">
                        Step 1 of 2: General Liability Release.
                    </p>

                    <div className="bg-black/50 border border-zinc-800 p-6 rounded-lg mb-8">
                        <FileSignature className="mx-auto text-co-yellow mb-4" size={48} />
                        <p className="text-zinc-400 text-sm mb-4">
                            Click below to sign the liability waiver for <strong>{newKidName.first}</strong>.
                        </p>
                        <a href={WAIVER_CONFIG.liability.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-co-red hover:text-white underline font-bold uppercase tracking-wide">
                            Open Liability Form <ExternalLink size={16} />
                        </a>
                    </div>

                    <div className="flex gap-4">
                        <button type="button" onClick={() => setAddStep(1)} className="flex-1 py-3 text-zinc-400 hover:text-white uppercase font-teko text-xl">Back</button>
                        <button 
                            onClick={() => setAddStep(3)}
                            className="flex-1 bg-white hover:bg-zinc-200 text-black py-3 uppercase font-teko text-xl rounded flex items-center justify-center gap-2 font-medium"
                        >
                            Next Step <ArrowRight size={18} />
                        </button>
                    </div>
                </div>
            )}

            {addStep === 3 && (
                <div className="text-center">
                    <h2 className="font-teko text-3xl text-white uppercase mb-2">Photo & Video Waiver</h2>
                    <p className="text-zinc-500 text-sm mb-8">
                        Step 2 of 2: Media Release.
                    </p>

                    <div className="bg-black/50 border border-zinc-800 p-6 rounded-lg mb-8">
                        <ImageIcon className="mx-auto text-co-yellow mb-4" size={48} />
                        <p className="text-zinc-400 text-sm mb-4">
                            Click below to sign the media release form for <strong>{newKidName.first}</strong>.
                        </p>
                        <a href={WAIVER_CONFIG.photo.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-co-red hover:text-white underline font-bold uppercase tracking-wide">
                            Open Media Form <ExternalLink size={16} />
                        </a>
                    </div>

                    <div className="flex gap-4">
                        <button type="button" onClick={() => setAddStep(2)} className="flex-1 py-3 text-zinc-400 hover:text-white uppercase font-teko text-xl">Back</button>
                        <button 
                            onClick={startVerification}
                            className="flex-1 bg-co-yellow hover:bg-white text-black py-3 uppercase font-teko text-xl rounded flex items-center justify-center gap-2 font-medium"
                        >
                            Verify & Add <CheckCircle size={18} />
                        </button>
                    </div>
                </div>
            )}

            {addStep === 4 && (
                <div className="text-center">
                    <h2 className="font-teko text-3xl text-white uppercase mb-4">Verifying Documents</h2>
                    
                    {polling ? (
                        <div className="py-12">
                            <div className="relative w-20 h-20 mx-auto mb-6">
                                <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-co-yellow rounded-full border-t-transparent animate-spin"></div>
                            </div>
                            <p className="text-white text-lg font-bold animate-pulse mb-2">Checking with WaiverSign...</p>
                            <p className="text-zinc-500 text-xs max-w-xs mx-auto">
                                This may take up to 2 minutes. Please keep this window open.
                            </p>
                        </div>
                    ) : verificationFailed ? (
                        <div className="py-6">
                            <div className="mb-8 bg-red-900/20 border border-red-900/50 p-4 rounded text-left">
                                <div className="flex items-start gap-3">
                                    <ShieldAlert className="text-red-500 flex-shrink-0" />
                                    <div>
                                        <h4 className="text-red-400 font-bold uppercase text-sm mb-1">Verification Failed</h4>
                                        <p className="text-red-300 text-xs">{failMessage}</p>
                                        
                                        <div className="mt-4 pt-4 border-t border-red-900/30">
                                            <label className="flex items-start gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    className="mt-1"
                                                    checked={manualOverride}
                                                    onChange={(e) => setManualOverride(e.target.checked)}
                                                />
                                                <span className="text-zinc-400 text-xs">
                                                    I attest that I have physically signed <strong>BOTH</strong> waivers for this athlete and understand that falsifying this information is a violation of the terms of service.
                                                </span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button type="button" onClick={() => setAddStep(3)} className="flex-1 py-3 text-zinc-400 hover:text-white uppercase font-teko text-xl">Back</button>
                                <button 
                                    onClick={handleManualOverride}
                                    disabled={!manualOverride}
                                    className="flex-1 bg-red-900 hover:bg-red-800 text-white py-3 uppercase font-teko text-xl rounded flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    Force Add Athlete
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="py-12">
                            <p className="text-green-500 font-bold uppercase text-xl flex items-center justify-center gap-2">
                                <CheckCircle /> Verified!
                            </p>
                            <p className="text-zinc-500 text-sm mt-2">Creating profile...</p>
                        </div>
                    )}
                </div>
            )}
        </div>
        </div>
      )}
    </div>
  );
};
