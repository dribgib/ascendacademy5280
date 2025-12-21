import React, { useEffect, useState } from 'react';
import { User, Child, Event } from '../types';
import { api } from '../services/api';
import { Plus, User as KidIcon, Calendar, CheckCircle, CreditCard, ExternalLink, FileSignature, ArrowRight, Loader2, Settings, Upload, Camera, AlertCircle, Shield, AlertTriangle, X } from 'lucide-react';
import { POPULAR_SPORTS } from '../constants';
import QRCodeDisplay from '../components/QRCodeDisplay';
import { useNavigate, useLocation } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import { useModal } from '../context/ModalContext';

interface UserDashboardProps {
  user: User;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ user }) => {
  const { showAlert, showConfirm } = useModal();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Admin Toggle State
  const [isAdminView, setIsAdminView] = useState(false);

  // Standard User Dashboard State
  const [kids, setKids] = useState<Child[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [systemError, setSystemError] = useState<string | null>(null);
  
  // Modals
  const [showAddKidModal, setShowAddKidModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  
  const [loading, setLoading] = useState(true);
  
  // New Kid Form State
  const [addStep, setAddStep] = useState(1); // 1 = Details, 2 = Waiver
  const [newKidName, setNewKidName] = useState({ first: '', last: '' });
  const [newKidDob, setNewKidDob] = useState('');
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [kidImage, setKidImage] = useState<File | null>(null);
  const [kidImagePreview, setKidImagePreview] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  
  // Account Form State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [accountMsg, setAccountMsg] = useState('');

  // Waiver State
  const [verifyingWaiver, setVerifyingWaiver] = useState(false);
  const [waiverSigned, setWaiverSigned] = useState(false);

  useEffect(() => {
    // Check for query param to auto-switch to admin view
    const params = new URLSearchParams(location.search);
    const view = params.get('view');
    
    // STRICT NAVIGATION LOGIC: 
    // If URL has ?view=admin AND user is admin -> Admin Mode
    // Otherwise -> Parent Mode (My Team)
    if (view === 'admin' && user.role === 'ADMIN') {
        setIsAdminView(true);
    } else {
        setIsAdminView(false);
    }
  }, [location.search, user.role]);

  useEffect(() => {
    // Only load family data if in Family View (or generally on mount)
    if (!isAdminView) {
        loadData();
    }
  }, [user.id, isAdminView]);

  const toggleView = (target: 'admin' | 'parent') => {
      if (target === 'admin') {
          navigate('/dashboard?view=admin');
      } else {
          navigate('/dashboard');
      }
  };

  const loadData = async () => {
    setSystemError(null);
    try {
      // Fetch concurrently but handle errors individually so one failure doesn't break the page
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
      setEvents(eventsData);
    } catch (e: any) {
      console.error("Critical Dashboard Load Error:", e);
      setSystemError("Unable to load dashboard data. Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setLoading(true);
      await api.billing.createPortalSession();
    } catch (e: any) {
      showAlert('Billing Error', e.message || 'Unable to open billing portal', 'error');
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

  // Image handling
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setKidImage(file);
      setKidImagePreview(URL.createObjectURL(file));
    }
  };

  // Step 1: Proceed to Waiver
  const handleDetailsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddStep(2);
  };

  // Step 2: Verify Waiver & Add Kid
  const handleVerifyAndAdd = async () => {
    setVerifyingWaiver(true);
    try {
        // 1. Check Waiver
        const isSigned = await (api as any).waivers.checkStatus(user.email, `${newKidName.first} ${newKidName.last}`);
        
        if (isSigned) {
            setWaiverSigned(true);
            setImageUploading(true);
            
            // 2. Upload Image (if any)
            let imageUrl = undefined;
            if (kidImage && (api as any).children.uploadImage) {
                const uploaded = await (api as any).children.uploadImage(kidImage);
                if (uploaded) imageUrl = uploaded;
            }

            // 3. Create Child in DB
            await api.children.create({
                parentId: user.id,
                firstName: newKidName.first,
                lastName: newKidName.last,
                dob: newKidDob,
                sports: selectedSports,
                imageUrl
            });
            
            // 4. Cleanup
            setShowAddKidModal(false);
            loadData();
            resetForm();
            showAlert('Success', 'Athlete added successfully!', 'success');
        } else {
            showAlert('Waiver Required', "Waiver signature not found. Please sign the document in the new tab and try again.", 'error');
        }
    } catch (e) {
        console.error(e);
        showAlert('Error', 'Error verifying waiver or adding child.', 'error');
    } finally {
        setVerifyingWaiver(false);
        setImageUploading(false);
    }
  };

  const resetForm = () => {
    setNewKidName({ first: '', last: '' });
    setSelectedSports([]);
    setNewKidDob('');
    setKidImage(null);
    setKidImagePreview(null);
    setAddStep(1);
    setWaiverSigned(false);
  };

  const toggleSport = (sport: string) => {
    if (selectedSports.includes(sport)) {
      setSelectedSports(selectedSports.filter(s => s !== sport));
    } else {
      setSelectedSports([...selectedSports, sport]);
    }
  };

  const handleRegister = async (eventId: string, kidId: string) => {
    const confirmed = await showConfirm("Confirm Registration", "Register for this session?");
    if (!confirmed) return;

    try {
      await api.registrations.register(eventId, kidId);
      loadData();
      showAlert('Success', 'Registration Successful!', 'success');
    } catch (e: any) {
      console.error(e);
      showAlert('Registration Failed', e.message || 'Please try again.', 'error');
    }
  };

  if (loading && !isAdminView) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-6 p-4">
        <div className="text-co-yellow font-teko text-5xl animate-pulse tracking-widest text-center uppercase">
          Loading Dashboard
        </div>
    </div>
  );

  return (
    // UPDATED: Use w-full max-w-full with padding for maximum space availability
    <div className="w-full max-w-[100rem] mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[80vh]">
      
      {/* --- HEADER SECTION --- */}
      {/* UPDATED: Changed breakpoint to xl for row layout, added flex-wrap to prevent collision */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-6 mb-10 border-b border-zinc-800 pb-8">
        
        {/* Left Side: Title & Toggle */}
        <div className="flex-1 w-full xl:w-auto">
           <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap">
              <h1 className="font-teko text-5xl md:text-6xl text-white uppercase leading-none whitespace-nowrap">
                {isAdminView ? "Coach's Dashboard" : "My Team"}
              </h1>
              {/* Admin Toggle */}
              {user.role === 'ADMIN' && (
                 <div className="flex bg-zinc-900 border border-zinc-700 p-1 rounded-lg self-start sm:self-auto">
                    <button 
                       onClick={() => toggleView('parent')}
                       className={`px-4 py-1 rounded-md font-teko text-lg uppercase transition-all whitespace-nowrap ${!isAdminView ? 'bg-white text-black font-bold' : 'text-zinc-500 hover:text-white'}`}
                    >
                       My Team
                    </button>
                    <button 
                       onClick={() => toggleView('admin')}
                       className={`px-4 py-1 rounded-md font-teko text-lg uppercase transition-all whitespace-nowrap ${isAdminView ? 'bg-co-yellow text-black font-bold' : 'text-zinc-500 hover:text-white'}`}
                    >
                       Coach
                    </button>
                 </div>
              )}
           </div>
           <p className="text-zinc-500 mt-2 max-w-xl">
              {isAdminView 
                  ? `Welcome back, ${user.firstName}. Access roster and schedule controls.` 
                  : "Manage your athletes, subscriptions, and schedules."
              }
           </p>
        </div>

        {/* Right Side: Action Buttons */}
        {!isAdminView && (
            <div className="flex flex-wrap gap-3 w-full xl:w-auto mt-4 xl:mt-0 justify-start xl:justify-end">
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
                    className="bg-co-yellow text-black px-8 py-3 font-teko text-xl uppercase font-bold rounded hover:bg-white transition-colors flex items-center justify-center gap-2 shadow-lg whitespace-nowrap flex-grow sm:flex-grow-0"
                >
                    <Plus size={20} /> Add Athlete
                </button>
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

      {/* --- CONTENT AREA --- */}
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
                        <div className={`absolute top-0 left-0 w-1 h-full ${kid.subscriptionStatus === 'active' ? 'bg-green-500' : 'bg-zinc-700'}`}></div>
                        <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-4">
                            {/* Kid Avatar */}
                            <div className="h-16 w-16 rounded-full overflow-hidden bg-zinc-800 border-2 border-zinc-700 flex-shrink-0">
                            {kid.image ? (
                                <img src={kid.image} alt={kid.firstName} className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center text-zinc-500">
                                    <KidIcon size={24} />
                                </div>
                            )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="font-teko text-3xl text-white uppercase leading-none mt-1 truncate">{kid.firstName} {kid.lastName}</h3>
                                <p className="text-zinc-500 text-sm mt-1">{kid.sports.join(', ')}</p>
                                
                                {/* Subscription Status & Limits */}
                                <div className="mt-3">
                                    {kid.subscriptionStatus === 'active' && kid.usageStats ? (
                                    <div>
                                        <span className="text-[10px] uppercase font-bold bg-green-900/40 text-green-400 px-2 py-1 rounded border border-green-900/50 mb-2 inline-block">
                                            {kid.usageStats.planName} Plan
                                        </span>
                                        {/* Usage Bar */}
                                        <div className="mt-2">
                                            <div className="flex justify-between text-[10px] text-zinc-400 mb-1 uppercase tracking-wider">
                                                <span>Usage</span>
                                                <span>{kid.usageStats.used} / {kid.usageStats.limit}</span>
                                            </div>
                                            <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full ${kid.usageStats.used >= kid.usageStats.limit ? 'bg-co-red' : 'bg-co-yellow'}`} 
                                                    style={{ width: `${Math.min((kid.usageStats.used / kid.usageStats.limit) * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                    ) : (
                                    <button 
                                        onClick={() => navigate('/checkout/p_elite')} 
                                        className="text-[10px] uppercase font-bold bg-red-900/40 text-red-200 px-2 py-1 rounded border border-red-900/50 hover:bg-red-900 transition-colors flex items-center gap-1"
                                    >
                                        No Active Plan <ExternalLink size={10} />
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
                    {events.length === 0 ? <p className="text-zinc-500">No events scheduled or system offline.</p> : events.map(evt => {
                        const isFull = evt.bookedSlots >= evt.maxSlots;
                        return (
                        <div key={evt.id} className="bg-black border border-zinc-800 p-5 rounded hover:border-zinc-700 transition-colors">
                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded font-mono">{evt.date}</span>
                                <span className="text-co-yellow font-bold text-sm">{evt.startTime} - {evt.endTime}</span>
                                </div>
                                <h4 className="font-bold text-white text-lg">{evt.title}</h4>
                                <p className="text-zinc-500 text-sm">{evt.description} @ {evt.location}</p>
                                <div className="mt-2 text-xs text-zinc-600">
                                {evt.bookedSlots} / {evt.maxSlots} Slots Taken
                                </div>
                            </div>

                            {/* Registration Actions */}
                            <div className="flex flex-col gap-2 min-w-[140px]">
                                {kids.map(kid => {
                                const isRegistered = evt.registeredKidIds.includes(kid.id);
                                const limitReached = kid.usageStats && kid.usageStats.used >= kid.usageStats.limit;
                                const hasPlan = kid.subscriptionStatus === 'active';

                                return (
                                    <button
                                    key={kid.id}
                                    disabled={isRegistered || isFull || (!isRegistered && limitReached) || !hasPlan}
                                    onClick={() => handleRegister(evt.id, kid.id)}
                                    className={`
                                        text-xs py-2 px-3 rounded uppercase font-bold transition-colors
                                        ${isRegistered 
                                        ? 'bg-green-900/30 text-green-500 border border-green-900 cursor-default' 
                                        : (isFull || limitReached || !hasPlan)
                                            ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-800'
                                            : 'bg-zinc-800 hover:bg-co-red hover:text-white text-zinc-300 border border-zinc-700'}
                                    `}
                                    >
                                    {isRegistered ? (
                                        <span className="flex items-center justify-center gap-1"><CheckCircle size={12} /> {kid.firstName} In</span>
                                    ) : !hasPlan ? (
                                        `Plan Required`
                                    ) : limitReached ? (
                                        `Limit Reached`
                                    ) : isFull ? (
                                        `${kid.firstName} (Full)`
                                    ) : (
                                        `Sign Up ${kid.firstName}`
                                    )}
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
      )}

      {/* Account Modal (Redesigned) */}
      {showAccountModal && (
        <div 
        className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
        onClick={() => setShowAccountModal(false)}
        >
        <div 
            className="bg-card-bg border border-zinc-700 p-8 rounded-lg max-w-md w-full relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
        >
            <button 
                onClick={() => setShowAccountModal(false)}
                className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
                <X size={24} />
            </button>
            
            <div className="text-center mb-8">
                <Settings className="mx-auto text-co-yellow mb-4" size={48} />
                <h2 className="font-teko text-4xl text-white uppercase tracking-wide">Account Settings</h2>
            </div>
            
            <div className="mb-8 p-4 bg-zinc-900/50 border border-zinc-800 rounded">
                <p className="text-zinc-500 text-xs uppercase font-bold mb-1 tracking-wider">Registered Email</p>
                <p className="text-white font-mono text-sm">{user.email}</p>
                <p className="text-zinc-600 text-[10px] mt-2 italic">Contact support to change email address.</p>
            </div>

            <form onSubmit={handleUpdatePassword} className="border-t border-zinc-800 pt-6">
                <p className="text-white text-xl font-teko uppercase mb-4">Change Password</p>
                <div className="space-y-4">
                    <div>
                        <input 
                            required 
                            type="password" 
                            placeholder="New Password"
                            minLength={6} 
                            value={newPassword} 
                            onChange={e => setNewPassword(e.target.value)} 
                            className="w-full bg-black border border-zinc-700 rounded px-4 py-3 text-white text-sm focus:border-co-yellow outline-none transition-colors" 
                        />
                    </div>
                    <div>
                        <input 
                            required 
                            type="password" 
                            placeholder="Confirm Password"
                            minLength={6} 
                            value={confirmPassword} 
                            onChange={e => setConfirmPassword(e.target.value)} 
                            className="w-full bg-black border border-zinc-700 rounded px-4 py-3 text-white text-sm focus:border-co-yellow outline-none transition-colors" 
                        />
                    </div>
                    <button 
                        type="submit" 
                        className="w-full bg-co-yellow hover:bg-white text-black py-3 uppercase font-teko text-xl font-bold rounded transition-colors shadow-lg mt-2"
                    >
                        Update Password
                    </button>
                </div>
                {accountMsg && (
                    <div className={`mt-4 text-center p-2 rounded text-sm ${accountMsg.includes('success') ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                        {accountMsg}
                    </div>
                )}
            </form>
        </div>
        </div>
      )}

      {/* Add Kid Modal */}
      {showAddKidModal && (
        <div 
        className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
        onClick={() => setShowAddKidModal(false)}
        >
        <div 
            className="bg-zinc-900 border border-zinc-700 p-8 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
        >
            
            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-8 text-sm">
                <span className={`font-bold ${addStep === 1 ? 'text-co-yellow' : 'text-green-500'}`}>1. Details</span>
                <span className="text-zinc-600">/</span>
                <span className={`font-bold ${addStep === 2 ? 'text-co-yellow' : 'text-zinc-600'}`}>2. Waiver</span>
            </div>

            {addStep === 1 && (
                <>
                <h2 className="font-teko text-3xl text-white uppercase mb-6">New Athlete Profile</h2>
                <form onSubmit={handleDetailsSubmit} className="space-y-4">
                
                {/* Image Upload Field */}
                <div className="flex items-center gap-6 mb-6 p-4 bg-black rounded border border-zinc-800">
                    <div className="h-20 w-20 rounded-full overflow-hidden bg-zinc-900 border border-zinc-700 flex items-center justify-center flex-shrink-0 relative">
                        {kidImagePreview ? (
                            <img src={kidImagePreview} alt="Preview" className="h-full w-full object-cover" />
                        ) : (
                            <Camera className="text-zinc-600" />
                        )}
                    </div>
                    <div className="flex-1">
                        <label className="block text-zinc-400 text-xs uppercase mb-2">Profile Photo (Optional)</label>
                        <label className="cursor-pointer inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded text-xs uppercase font-bold text-zinc-300 transition-colors">
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
                    <input required type="date" className="w-full bg-black border border-zinc-700 p-2 text-white" value={newKidDob} onChange={e => setNewKidDob(e.target.value)} />
                </div>
                <div>
                    <label className="block text-zinc-400 text-xs uppercase mb-2">Interests</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {POPULAR_SPORTS.map(sport => (
                        <button
                        type="button"
                        key={sport}
                        onClick={() => toggleSport(sport)}
                        className={`text-xs p-2 rounded border transition-colors ${selectedSports.includes(sport) ? 'bg-co-red border-co-red text-white' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
                        >
                        {sport}
                        </button>
                    ))}
                    </div>
                </div>
                <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => { setShowAddKidModal(false); resetForm(); }} className="flex-1 py-3 text-zinc-400 hover:text-white uppercase font-teko text-xl">Cancel</button>
                    <button type="submit" className="flex-1 bg-white hover:bg-zinc-200 text-black py-3 uppercase font-teko text-xl font-bold rounded flex items-center justify-center gap-2">
                        Next: Sign Waiver <ArrowRight size={18} />
                    </button>
                </div>
                </form>
                </>
            )}

            {addStep === 2 && (
                <div className="text-center">
                    <h2 className="font-teko text-3xl text-white uppercase mb-2">Liability Waiver</h2>
                    <p className="text-zinc-500 text-sm mb-8">
                        Participation in Ascend Academy 5280 requires a signed liability waiver for <span className="text-white font-bold">{newKidName.first} {newKidName.last}</span>.
                    </p>

                    <div className="bg-black/50 border border-zinc-800 p-6 rounded-lg mb-8">
                        <FileSignature className="mx-auto text-co-yellow mb-4" size={48} />
                        <p className="text-zinc-400 text-sm mb-4">Please click the link below to sign the document on WaiverSign.</p>
                        
                        <a 
                            href="https://app.waiversign.com/e/693223c22919426586c36778/doc/693225b12606e000127945da?event=none" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-co-red hover:text-white underline font-bold uppercase tracking-wide"
                        >
                            Open Waiver Form <ExternalLink size={16} />
                        </a>
                    </div>

                    <div className="flex gap-4">
                        <button type="button" onClick={() => setAddStep(1)} className="flex-1 py-3 text-zinc-400 hover:text-white uppercase font-teko text-xl">Back</button>
                        <button 
                            onClick={handleVerifyAndAdd}
                            disabled={verifyingWaiver || imageUploading}
                            className="flex-1 bg-co-yellow hover:bg-white text-black py-3 uppercase font-teko text-xl font-bold rounded flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {verifyingWaiver || imageUploading ? <Loader2 className="animate-spin" /> : 'Verify & Add Athlete'}
                        </button>
                    </div>
                </div>
            )}
        </div>
        </div>
      )}
    </div>
  );
};