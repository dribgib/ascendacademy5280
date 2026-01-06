
import React, { useState, useEffect } from 'react';
import { User, Event, Child } from '../types';
import { api } from '../services/api';
import { QrCode, Plus, Calendar as CalendarIcon, Smartphone, Users, CheckCircle, Trash2, Edit, Grid, List, X, ShieldCheck } from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { PACKAGES } from '../constants';

interface AdminDashboardProps {
  user: User;
  hideHeader?: boolean;
}

type TabView = 'schedule' | 'calendar' | 'users';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, hideHeader = false }) => {
  const { showAlert, showConfirm } = useModal();
  const activeTabKey = 'admin_active_tab';
  const [activeTab, setActiveTab] = useState<TabView>(() => {
    return (localStorage.getItem(activeTabKey) as TabView) || 'schedule';
  });
  
  const [events, setEvents] = useState<Event[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allChildren, setAllChildren] = useState<Child[]>([]);
  
  const [qrInput, setQrInput] = useState('');
  const [checkInStatus, setCheckInStatus] = useState<{msg: string, success: boolean} | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const [showRosterModal, setShowRosterModal] = useState<Event | null>(null);

  const [eventForm, setEventForm] = useState({
    title: '', 
    description: '', 
    date: '', 
    startTime: '', 
    endTime: '', 
    location: '', 
    maxSlots: 20,
    allowedPackages: [] as string[]
  });

  const [kidToAdd, setKidToAdd] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const handleTabChange = (tab: TabView) => {
    setActiveTab(tab);
    localStorage.setItem(activeTabKey, tab);
  };

  const loadData = async () => {
    try {
      const [evts, usrs, kids] = await Promise.all([
        api.events.list(),
        (api as any).admin.getAllUsers(),
        (api as any).admin.getAllChildren()
      ]);
      setEvents(evts);
      setAllUsers(usrs);
      setAllChildren(kids);

      if (evts.length > 0 && !selectedEventId) {
        setSelectedEventId(evts[0].id);
      }
    } catch (e) {
      console.error("Failed to load admin data", e);
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      setCheckInStatus({ msg: 'Please select an event first.', success: false });
      return;
    }
    const result = await api.registrations.checkIn(selectedEventId, qrInput);
    setCheckInStatus({ msg: result.message, success: result.success });
    setQrInput('');
    setTimeout(() => setCheckInStatus(null), 3000);
    loadData();
  };

  const openCreateModal = () => {
      setIsEditing(false);
      setEditingEventId(null);
      setEventForm({ title: '', description: '', date: '', startTime: '', endTime: '', location: '', maxSlots: 20, allowedPackages: [] });
      setShowCreateModal(true);
  };

  const openEditModal = (evt: Event) => {
      setIsEditing(true);
      setEditingEventId(evt.id);
      setEventForm({
          title: evt.title,
          description: evt.description,
          date: evt.date, // Formatted YYYY-MM-DD
          startTime: evt.startTime24 || '', // Use the 24h format for <input type="time">
          endTime: evt.endTime24 || '',     // Use the 24h format for <input type="time">
          location: evt.location,
          maxSlots: evt.maxSlots,
          allowedPackages: evt.allowedPackages || []
      });
      setShowCreateModal(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const startIso = new Date(`${eventForm.date}T${eventForm.startTime}`).toISOString();
      const endIso = new Date(`${eventForm.date}T${eventForm.endTime}`).toISOString();

      const payload = {
        title: eventForm.title,
        description: eventForm.description,
        startTime: startIso,
        endTime: endIso,
        location: eventForm.location,
        maxSlots: eventForm.maxSlots,
        allowedPackages: eventForm.allowedPackages
      };

      if (isEditing && editingEventId) {
          await (api.events as any).update(editingEventId, payload);
          showAlert('Updated', 'Session details updated successfully.', 'success');
      } else {
          await api.events.create(payload);
          showAlert('Success', 'Event created successfully.', 'success');
      }

      setShowCreateModal(false);
      loadData();
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to save event.', 'error');
    }
  };

  const handleTogglePackage = (pkgId: string) => {
      setEventForm(prev => {
          if (prev.allowedPackages.includes(pkgId)) {
              return { ...prev, allowedPackages: prev.allowedPackages.filter(p => p !== pkgId) };
          } else {
              return { ...prev, allowedPackages: [...prev.allowedPackages, pkgId] };
          }
      });
  };

  const handleDeleteEvent = async (id: string) => {
      const confirmed = await showConfirm("Delete Session?", "Are you sure you want to cancel and delete this session? This will REFUND usage tokens to registered athletes.");
      if (!confirmed) return;

      try {
        await (api as any).admin.deleteEvent(id);
        loadData();
        showAlert('Deleted', 'Session has been cancelled and athlete tokens refunded.', 'success');
      } catch (e: any) {
          showAlert('Error', e.message, 'error');
      }
  };

  const handleDeleteUser = async (userToDelete: User) => {
      if (userToDelete.id === user.id) {
          showAlert("Operation Denied", "You cannot delete your own admin account.", 'error');
          return;
      }
      
      const confirmed = await showConfirm(
          "Delete User?", 
          `Are you sure you want to delete ${userToDelete.firstName} ${userToDelete.lastName}? This will remove their profile and associated athletes.`
      );
      if (!confirmed) return;

      try {
          await (api as any).admin.deleteUser(userToDelete.id);
          loadData();
          showAlert('Success', 'User profile deleted.', 'success');
      } catch (e: any) {
          showAlert('Error', e.message || 'Failed to delete user.', 'error');
      }
  };

  const handleAddKidToRoster = async () => {
      if (!showRosterModal || !kidToAdd) return;
      await (api as any).admin.addRegistration(showRosterModal.id, kidToAdd);
      
      const updatedEvents = events.map(e => {
          if (e.id === showRosterModal.id) {
             return { ...e, registeredKidIds: [...e.registeredKidIds, kidToAdd] };
          }
          return e;
      });
      setEvents(updatedEvents);
      loadData();
      
      const updatedModalEvent = updatedEvents.find(e => e.id === showRosterModal.id);
      setShowRosterModal(updatedModalEvent || null);
      setKidToAdd('');
  };

  const handleRemoveKidFromRoster = async (childId: string) => {
      if (!showRosterModal) return;
      const confirmed = await showConfirm("Remove Athlete", "Are you sure you want to remove this athlete from the roster? This will REFUND their usage token.");
      if (!confirmed) return;

      await (api as any).admin.removeRegistration(showRosterModal.id, childId);

      const updatedEvents = events.map(e => {
        if (e.id === showRosterModal.id) {
           return { ...e, registeredKidIds: e.registeredKidIds.filter(id => id !== childId) };
        }
        return e;
      });
      setEvents(updatedEvents);
      loadData();

      const updatedModalEvent = updatedEvents.find(e => e.id === showRosterModal.id);
      setShowRosterModal(updatedModalEvent || null);
  };

  const getKidName = (id: string) => {
      const kid = allChildren.find(c => c.id === id);
      return kid ? `${kid.firstName} ${kid.lastName}` : 'Unknown Athlete';
  };

  const renderScheduleTab = () => (
      <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="font-teko text-3xl text-white uppercase flex items-center gap-2">
                <List className="text-zinc-400" /> Upcoming Sessions
            </h2>
            <button onClick={openCreateModal} className="bg-co-red text-white px-4 py-1 text-sm uppercase rounded hover:bg-red-800 flex items-center gap-2 font-medium">
                <Plus size={16} /> New Session
            </button>
          </div>
          
          {events.length === 0 && <div className="text-zinc-500 p-4 border border-zinc-800 rounded">No events scheduled.</div>}
          
          {events.map(evt => (
            <div key={evt.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg relative hover:border-zinc-700 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                     <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded font-mono uppercase">{evt.date}</span>
                     <span className="text-co-yellow font-bold text-sm">{evt.startTime} - {evt.endTime}</span>
                     {evt.allowedPackages && evt.allowedPackages.length > 0 && (
                         <span className="bg-zinc-800 text-zinc-400 text-[10px] px-2 py-1 rounded border border-zinc-700 uppercase">
                             Restricted ({evt.allowedPackages.length})
                         </span>
                     )}
                  </div>
                  <h3 className="font-bold text-white text-xl">{evt.title}</h3>
                  <p className="text-zinc-500 text-sm mt-1">{evt.location}</p>
                </div>
                <div className="text-right">
                   <div className="flex items-center gap-2 text-zinc-400 text-sm justify-end">
                      <Users size={16} />
                      <span>{evt.registeredKidIds.length} / {evt.maxSlots}</span>
                   </div>
                   <div className="flex items-center gap-2 text-green-500 text-sm mt-1 font-bold justify-end">
                      <CheckCircle size={16} />
                      <span>{evt.checkedInKidIds.length} In</span>
                   </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-4 pt-4 border-t border-zinc-800">
                <button onClick={() => setShowRosterModal(evt)} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded uppercase font-medium flex items-center gap-2">
                   <Users size={14} /> Roster
                </button>
                <button onClick={() => openEditModal(evt)} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded uppercase font-medium flex items-center gap-2">
                   <Edit size={14} /> Edit
                </button>
                <button onClick={() => handleDeleteEvent(evt.id)} className="text-xs text-co-red hover:text-red-400 ml-auto uppercase font-medium flex items-center gap-1">
                   <Trash2 size={14} /> Cancel
                </button>
              </div>
            </div>
          ))}
      </div>
  );

  const renderCalendarTab = () => {
      const sortedEvents = [...events].sort((a, b) => new Date(a.isoStart).getTime() - new Date(b.isoStart).getTime());
      
      const grouped: { [key: string]: Event[] } = {};
      sortedEvents.forEach(evt => {
          if (!grouped[evt.date]) grouped[evt.date] = [];
          grouped[evt.date].push(evt);
      });

      return (
          <div className="space-y-8">
               <div className="flex justify-between items-center">
                    <h2 className="font-teko text-3xl text-white uppercase flex items-center gap-2">
                        <CalendarIcon className="text-zinc-400" /> Calendar View
                    </h2>
                    <button onClick={openCreateModal} className="bg-co-red text-white px-4 py-1 text-sm font-medium uppercase rounded hover:bg-red-800 flex items-center gap-2">
                        <Plus size={16} /> New Session
                    </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {Object.keys(grouped).map(date => (
                       <div key={date} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                           <div className="bg-zinc-950 p-3 border-b border-zinc-800 text-center">
                               {/* Date string here is already formatted by API as YYYY-MM-DD in Denver time. 
                                   We parse it back to local just for getting the weekday name, or we can rely on string parsing to be safe */}
                               <span className="text-co-yellow font-teko text-2xl">
                                  {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                               </span>
                           </div>
                           <div className="p-4 space-y-3">
                               {grouped[date].map(evt => (
                                   <div key={evt.id} className="cursor-pointer hover:bg-zinc-800 p-2 rounded transition-colors group" onClick={() => setShowRosterModal(evt)}>
                                       <div className="flex justify-between text-xs text-zinc-400 mb-1">
                                           <span>{evt.startTime}</span>
                                           <span>{evt.registeredKidIds.length}/{evt.maxSlots}</span>
                                       </div>
                                       <div className="text-white font-medium text-sm truncate">{evt.title}</div>
                                       <button onClick={(e) => { e.stopPropagation(); openEditModal(evt); }} className="text-xs text-zinc-500 hover:text-co-yellow mt-1">Edit</button>
                                   </div>
                               ))}
                           </div>
                       </div>
                   ))}
                   {Object.keys(grouped).length === 0 && <p className="text-zinc-500">No events found.</p>}
               </div>
          </div>
      );
  };

  const renderUsersTab = () => (
      <div>
         <h2 className="font-teko text-3xl text-white uppercase mb-6 flex items-center gap-2">
            <Users className="text-zinc-400" /> Athletes & Parents
         </h2>
         <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[800px]">
                <thead className="bg-zinc-950 text-zinc-500 uppercase text-xs border-b border-zinc-800">
                    <tr>
                        <th className="px-6 py-4 font-medium">Parent Name</th>
                        <th className="px-6 py-4 font-medium">Email / Phone</th>
                        <th className="px-6 py-4 font-medium">Athletes (Usage)</th>
                        <th className="px-6 py-4 font-medium">Role</th>
                        <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                    {allUsers.map(u => {
                        const kids = allChildren.filter(c => c.parentId === u.id);
                        return (
                            <tr key={u.id} className="hover:bg-zinc-800/50 transition-colors">
                                <td className="px-6 py-4 text-white font-medium">{u.firstName} {u.lastName}</td>
                                <td className="px-6 py-4 text-zinc-400">
                                    <div>{u.email}</div>
                                    <div className="text-xs opacity-60">{u.phone}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-wrap gap-2">
                                        {kids.length > 0 ? kids.map(k => {
                                            const hasStats = k.subscriptionStatus === 'active' && k.usageStats;
                                            const isLimitReached = hasStats && k.usageStats!.used >= k.usageStats!.limit;
                                            
                                            return (
                                                <div key={k.id} className={`flex items-center gap-2 px-2 py-1 rounded border text-xs ${isLimitReached ? 'bg-red-900/20 border-red-900 text-red-300' : 'bg-zinc-800 border-zinc-700 text-zinc-300'}`}>
                                                    <span className="font-bold">{k.firstName}</span>
                                                    {hasStats ? (
                                                        <span className={`text-[10px] ${isLimitReached ? 'text-red-400' : 'text-co-yellow'}`}>
                                                            {k.usageStats!.used}/{k.usageStats!.limit}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] text-zinc-600">No Plan</span>
                                                    )}
                                                </div>
                                            );
                                        }) : <span className="text-zinc-600 italic">None</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`text-xs px-2 py-1 rounded uppercase font-bold ${u.role === 'ADMIN' ? 'bg-co-yellow text-black' : 'bg-zinc-700 text-zinc-300'}`}>
                                        {u.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {u.role !== 'ADMIN' && (
                                        <button 
                                            onClick={() => handleDeleteUser(u)}
                                            className="text-zinc-500 hover:text-red-500 transition-colors"
                                            title="Delete User"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
         </div>
      </div>
  );

  return (
    <div className={`w-full max-w-7xl mx-auto ${hideHeader ? '' : 'px-4 sm:px-6 lg:px-8 py-10 min-h-[80vh]'}`}>
      {!hideHeader && (
          <div className="flex justify-between items-center mb-10">
            <div>
                <h1 className="font-teko text-6xl text-white uppercase mb-2">Coach's Dashboard</h1>
                <p className="text-zinc-500">Manage schedule, roster, and check-ins.</p>
            </div>
          </div>
      )}

      {/* --- QUICK CHECK-IN BAR --- */}
      <div className="bg-card-bg border border-zinc-700 p-6 rounded-lg mb-8 shadow-xl">
          <h2 className="font-teko text-3xl text-white uppercase mb-4 flex items-center gap-2">
              <QrCode className="text-co-yellow" /> Quick Check-In
          </h2>
          <form onSubmit={handleCheckIn} className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-grow w-full md:w-auto">
                  <label className="block text-zinc-400 text-xs uppercase mb-1">Select Session</label>
                  <select 
                      className="w-full bg-black border border-zinc-700 p-3 text-white rounded focus:border-co-yellow outline-none"
                      value={selectedEventId}
                      onChange={(e) => setSelectedEventId(e.target.value)}
                  >
                      <option value="">-- Select Event --</option>
                      {events.filter(e => new Date(e.isoStart) > new Date(new Date().getTime() - 86400000)).map(e => (
                          <option key={e.id} value={e.id}>
                              {e.date} | {e.startTime} - {e.title}
                          </option>
                      ))}
                  </select>
              </div>
              <div className="flex-grow w-full md:w-auto">
                   <label className="block text-zinc-400 text-xs uppercase mb-1">Scan QR / Enter Code</label>
                   <div className="relative">
                        <Smartphone className="absolute left-3 top-3 text-zinc-600" size={20} />
                        <input 
                            type="text" 
                            className="w-full bg-black border border-zinc-700 p-3 pl-10 text-white rounded focus:border-co-yellow outline-none font-mono"
                            placeholder="Scan or type code..."
                            value={qrInput}
                            onChange={e => setQrInput(e.target.value)}
                            autoFocus
                        />
                   </div>
              </div>
              <button 
                type="submit" 
                className="w-full md:w-auto bg-white text-black font-teko text-xl uppercase px-8 py-3 rounded hover:bg-zinc-200 transition-colors"
              >
                  Check In
              </button>
          </form>
          {checkInStatus && (
              <div className={`mt-4 p-3 rounded flex items-center gap-2 ${checkInStatus.success ? 'bg-green-900/30 text-green-400 border border-green-900' : 'bg-red-900/30 text-red-400 border border-red-900'}`}>
                  {checkInStatus.success ? <CheckCircle size={20} /> : <Trash2 size={20} />}
                  <span className="font-bold uppercase">{checkInStatus.msg}</span>
              </div>
          )}
      </div>

      {/* --- TABS --- */}
      <div className="flex gap-4 border-b border-zinc-800 mb-8 overflow-x-auto">
          <button 
              onClick={() => handleTabChange('schedule')}
              className={`pb-3 px-2 font-teko text-2xl uppercase tracking-wide transition-colors whitespace-nowrap ${activeTab === 'schedule' ? 'text-co-yellow border-b-2 border-co-yellow' : 'text-zinc-500 hover:text-white'}`}
          >
              <List className="inline-block mr-2 relative -top-[2px]" size={18} /> Schedule List
          </button>
          <button 
              onClick={() => handleTabChange('calendar')}
              className={`pb-3 px-2 font-teko text-2xl uppercase tracking-wide transition-colors whitespace-nowrap ${activeTab === 'calendar' ? 'text-co-yellow border-b-2 border-co-yellow' : 'text-zinc-500 hover:text-white'}`}
          >
              <CalendarIcon className="inline-block mr-2 relative -top-[2px]" size={18} /> Calendar View
          </button>
          <button 
              onClick={() => handleTabChange('users')}
              className={`pb-3 px-2 font-teko text-2xl uppercase tracking-wide transition-colors whitespace-nowrap ${activeTab === 'users' ? 'text-co-yellow border-b-2 border-co-yellow' : 'text-zinc-500 hover:text-white'}`}
          >
              <Users className="inline-block mr-2 relative -top-[2px]" size={18} /> Manage Users
          </button>
      </div>

      {/* --- TAB CONTENT --- */}
      <div className="animate-fade-in">
          {activeTab === 'schedule' && renderScheduleTab()}
          {activeTab === 'calendar' && renderCalendarTab()}
          {activeTab === 'users' && renderUsersTab()}
      </div>

      {/* --- MODALS --- */}
      
      {/* Create / Edit Event Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowCreateModal(false)}>
            <div className="bg-card-bg border border-zinc-700 p-8 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <h2 className="font-teko text-4xl text-white uppercase mb-6">{isEditing ? 'Edit Session' : 'Create New Session'}</h2>
                <form onSubmit={handleSaveEvent} className="space-y-4">
                    <div>
                        <label className="block text-zinc-400 text-xs uppercase mb-1">Title</label>
                        <input required type="text" className="w-full bg-black border border-zinc-700 p-2 text-white" value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-zinc-400 text-xs uppercase mb-1">Description</label>
                        <textarea className="w-full bg-black border border-zinc-700 p-2 text-white" value={eventForm.description} onChange={e => setEventForm({...eventForm, description: e.target.value})} />
                    </div>
                    
                    {/* Allowed Packages Section */}
                    <div>
                        <label className="block text-zinc-400 text-xs uppercase mb-2 flex items-center gap-2">
                             <ShieldCheck size={14} /> Allowed Packages (Restricted Access)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {PACKAGES.map(pkg => {
                                const isSelected = eventForm.allowedPackages.includes(pkg.id);
                                return (
                                    <button
                                        type="button"
                                        key={pkg.id}
                                        onClick={() => handleTogglePackage(pkg.id)}
                                        className={`text-xs p-2 rounded border transition-colors ${isSelected ? 'bg-co-yellow text-black border-co-yellow' : 'bg-black border-zinc-700 text-zinc-500 hover:border-zinc-500'}`}
                                    >
                                        {pkg.name}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[10px] text-zinc-600 mt-1">If no packages selected, anyone with an active subscription can join.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-zinc-400 text-xs uppercase mb-1">Date</label>
                            <input required type="date" className="w-full bg-black border border-zinc-700 p-2 text-white [color-scheme:dark]" value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-zinc-400 text-xs uppercase mb-1">Max Capacity</label>
                            <input required type="number" className="w-full bg-black border border-zinc-700 p-2 text-white" value={eventForm.maxSlots} onChange={e => setEventForm({...eventForm, maxSlots: parseInt(e.target.value)})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-zinc-400 text-xs uppercase mb-1">Start Time</label>
                            <input required type="time" className="w-full bg-black border border-zinc-700 p-2 text-white [color-scheme:dark]" value={eventForm.startTime} onChange={e => setEventForm({...eventForm, startTime: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-zinc-400 text-xs uppercase mb-1">End Time</label>
                            <input required type="time" className="w-full bg-black border border-zinc-700 p-2 text-white [color-scheme:dark]" value={eventForm.endTime} onChange={e => setEventForm({...eventForm, endTime: e.target.value})} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-zinc-400 text-xs uppercase mb-1">Location</label>
                        <input required type="text" className="w-full bg-black border border-zinc-700 p-2 text-white" value={eventForm.location} onChange={e => setEventForm({...eventForm, location: e.target.value})} />
                    </div>
                    <div className="flex gap-4 pt-4">
                        <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 text-zinc-400 hover:text-white uppercase font-teko text-xl">Cancel</button>
                        <button type="submit" className="flex-1 bg-co-red hover:bg-white hover:text-black text-white py-3 uppercase font-teko text-xl rounded">
                            {isEditing ? 'Save Changes' : 'Create Session'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* Roster Management Modal */}
      {showRosterModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowRosterModal(null)}>
            <div className="bg-card-bg border border-zinc-700 p-8 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="font-teko text-4xl text-white uppercase">{showRosterModal.title}</h2>
                        <p className="text-zinc-500">{showRosterModal.date} @ {showRosterModal.startTime}</p>
                    </div>
                    <button onClick={() => setShowRosterModal(null)} className="text-zinc-500 hover:text-white"><X size={24} /></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Current Roster */}
                    <div>
                        <h3 className="font-teko text-2xl text-white uppercase mb-4 border-b border-zinc-800 pb-2">Registered Athletes ({showRosterModal.registeredKidIds.length})</h3>
                        <ul className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                            {showRosterModal.registeredKidIds.map(kidId => {
                                const isCheckedIn = showRosterModal.checkedInKidIds.includes(kidId);
                                return (
                                    <li key={kidId} className="flex justify-between items-center bg-zinc-900 p-3 rounded border border-zinc-800">
                                        <div>
                                            <div className="text-white font-medium">{getKidName(kidId)}</div>
                                            {isCheckedIn && <div className="text-[10px] text-green-500 font-bold uppercase flex items-center gap-1"><CheckCircle size={10} /> Checked In</div>}
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveKidFromRoster(kidId)}
                                            className="text-zinc-600 hover:text-red-500 p-1"
                                            title="Remove"
                                        >
                                            <X size={16} />
                                        </button>
                                    </li>
                                );
                            })}
                            {showRosterModal.registeredKidIds.length === 0 && <p className="text-zinc-600 italic">No athletes registered.</p>}
                        </ul>
                    </div>

                    {/* Add Athlete */}
                    <div>
                        <h3 className="font-teko text-2xl text-white uppercase mb-4 border-b border-zinc-800 pb-2">Add to Roster</h3>
                        <div className="flex gap-2 mb-4">
                            <select 
                                className="flex-1 bg-black border border-zinc-700 p-2 text-white rounded text-sm outline-none"
                                value={kidToAdd}
                                onChange={e => setKidToAdd(e.target.value)}
                            >
                                <option value="">Select Athlete...</option>
                                {allChildren
                                    .filter(c => !showRosterModal.registeredKidIds.includes(c.id))
                                    .sort((a,b) => a.lastName.localeCompare(b.lastName))
                                    .map(c => (
                                        <option key={c.id} value={c.id}>{c.lastName}, {c.firstName}</option>
                                    ))
                                }
                            </select>
                            <button 
                                onClick={handleAddKidToRoster}
                                disabled={!kidToAdd}
                                className="bg-white text-black px-4 uppercase font-teko text-lg rounded hover:bg-zinc-200 disabled:opacity-50"
                            >
                                Add
                            </button>
                        </div>
                        <p className="text-xs text-zinc-500">
                            Manually adding an athlete bypasses subscription limits and checks. Use for drop-ins or corrections.
                        </p>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
