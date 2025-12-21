import React, { useState, useEffect } from 'react';
import { User, Event, Child } from '../types';
import { api } from '../services/api';
import { QrCode, Plus, Calendar as CalendarIcon, Smartphone, Users, CheckCircle, Trash2, UserPlus, Grid, List } from 'lucide-react';
import { useModal } from '../context/ModalContext';

interface AdminDashboardProps {
  user: User;
  hideHeader?: boolean;
}

type TabView = 'schedule' | 'calendar' | 'users';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, hideHeader = false }) => {
  const { showAlert, showConfirm } = useModal();
  const [activeTab, setActiveTab] = useState<TabView>('schedule');
  const [events, setEvents] = useState<Event[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allChildren, setAllChildren] = useState<Child[]>([]);
  
  const [qrInput, setQrInput] = useState('');
  const [checkInStatus, setCheckInStatus] = useState<{msg: string, success: boolean} | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRosterModal, setShowRosterModal] = useState<Event | null>(null);

  const [newEvent, setNewEvent] = useState({
    title: '', description: '', date: '', startTime: '', endTime: '', location: '', maxSlots: 20
  });

  const [kidToAdd, setKidToAdd] = useState('');

  useEffect(() => {
    loadData();
  }, []);

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

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const startIso = new Date(`${newEvent.date}T${newEvent.startTime}`).toISOString();
      const endIso = new Date(`${newEvent.date}T${newEvent.endTime}`).toISOString();

      await api.events.create({
        title: newEvent.title,
        description: newEvent.description,
        startTime: startIso,
        endTime: endIso,
        location: newEvent.location,
        maxSlots: newEvent.maxSlots
      });

      setShowCreateModal(false);
      loadData();
      setNewEvent({ title: '', description: '', date: '', startTime: '', endTime: '', location: '', maxSlots: 20 });
      showAlert('Success', 'Event created successfully.', 'success');
    } catch (e: any) {
      showAlert('Error', e.message || 'Failed to create event.', 'error');
    }
  };

  const handleDeleteEvent = async (id: string) => {
      const confirmed = await showConfirm("Delete Session?", "Are you sure you want to cancel and delete this session? This cannot be undone.");
      if (!confirmed) return;

      try {
        await (api as any).admin.deleteEvent(id);
        loadData();
        showAlert('Deleted', 'Session has been cancelled.', 'success');
      } catch (e: any) {
          showAlert('Error', e.message, 'error');
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
      const updatedModalEvent = updatedEvents.find(e => e.id === showRosterModal.id);
      setShowRosterModal(updatedModalEvent || null);
      setKidToAdd('');
  };

  const handleRemoveKidFromRoster = async (childId: string) => {
      if (!showRosterModal) return;
      const confirmed = await showConfirm("Remove Athlete", "Are you sure you want to remove this athlete from the roster?");
      if (!confirmed) return;

      await (api as any).admin.removeRegistration(showRosterModal.id, childId);

       const updatedEvents = events.map(e => {
        if (e.id === showRosterModal.id) {
           return { ...e, registeredKidIds: e.registeredKidIds.filter(id => id !== childId) };
        }
        return e;
      });
      setEvents(updatedEvents);
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
            <button onClick={() => setShowCreateModal(true)} className="bg-co-red text-white px-4 py-1 text-sm font-bold uppercase rounded hover:bg-red-800 flex items-center gap-2">
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
                <button onClick={() => setShowRosterModal(evt)} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-2 rounded uppercase font-bold flex items-center gap-2">
                   <Users size={14} /> Manage Roster
                </button>
                <button onClick={() => handleDeleteEvent(evt.id)} className="text-xs text-co-red hover:text-red-400 ml-auto uppercase font-bold flex items-center gap-1">
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
                    <button onClick={() => setShowCreateModal(true)} className="bg-co-red text-white px-4 py-1 text-sm font-bold uppercase rounded hover:bg-red-800 flex items-center gap-2">
                        <Plus size={16} /> New Session
                    </button>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {Object.keys(grouped).map(date => (
                       <div key={date} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                           <div className="bg-zinc-950 p-3 border-b border-zinc-800 text-center">
                               <span className="text-co-yellow font-teko text-2xl">{new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                           </div>
                           <div className="p-4 space-y-3">
                               {grouped[date].map(evt => (
                                   <div key={evt.id} className="cursor-pointer hover:bg-zinc-800 p-2 rounded transition-colors" onClick={() => setShowRosterModal(evt)}>
                                       <div className="flex justify-between text-xs text-zinc-400 mb-1">
                                           <span>{evt.startTime}</span>
                                           <span>{evt.registeredKidIds.length}/{evt.maxSlots}</span>
                                       </div>
                                       <div className="text-white font-bold text-sm truncate">{evt.title}</div>
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
                        <th className="px-6 py-4 font-bold">Parent Name</th>
                        <th className="px-6 py-4 font-bold">Email / Phone</th>
                        <th className="px-6 py-4 font-bold">Children</th>
                        <th className="px-6 py-4 font-bold text-right">Role</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                    {allUsers.map(u => {
                        const kids = allChildren.filter(c => c.parentId === u.id);
                        return (
                            <tr key={u.id} className="hover:bg-zinc-800/50 transition-colors">
                                <td className="px-6 py-4 font-bold text-white">{u.firstName} {u.lastName}</td>
                                <td className="px-6 py-4 text-zinc-400">
                                    <div className="text-white">{u.email}</div>
                                    <div className="text-xs">{u.phone}</div>
                                </td>
                                <td className="px-6 py-4">
                                    {kids.length > 0 ? (
                                        <div className="flex flex-wrap gap-2">
                                            {kids.map(k => (
                                                <span key={k.id} className="bg-zinc-800 text-zinc-300 px-2 py-1 rounded text-xs border border-zinc-700">
                                                    {k.firstName} {k.lastName}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-zinc-600 italic">No kids added</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${u.role === 'ADMIN' ? 'bg-co-yellow text-black' : 'bg-zinc-800 text-zinc-400'}`}>
                                        {u.role}
                                    </span>
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
    <div className={!hideHeader ? `w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10` : "w-full"}>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        {!hideHeader && (
          <div>
            <h1 className="font-teko text-5xl text-white uppercase">Coach's Dashboard</h1>
            <p className="text-zinc-500">Welcome back, {user.firstName}.</p>
          </div>
        )}
        
        <div className={`flex bg-zinc-900 p-1 rounded-lg border border-zinc-800 ${hideHeader ? 'w-full md:w-auto' : ''}`}>
            {(['schedule', 'calendar', 'users'] as const).map(tab => (
                <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-2 rounded font-teko text-xl uppercase transition-all ${hideHeader ? 'flex-1 md:flex-none' : ''} ${activeTab === tab ? 'bg-co-yellow text-black shadow' : 'text-zinc-400 hover:text-white'}`}
                >
                    {tab}
                </button>
            ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {activeTab !== 'users' && (
            <div className="lg:col-span-1">
                <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 sticky top-24">
                    <div className="flex items-center gap-3 mb-6 pb-6 border-b border-zinc-800">
                        <QrCode className="text-co-yellow" size={28} />
                        <h2 className="font-teko text-3xl text-white uppercase">Check-In</h2>
                    </div>

                    <form onSubmit={handleCheckIn}>
                        <label className="block text-zinc-400 text-xs uppercase mb-2">1. Select Session</label>
                        <select 
                            value={selectedEventId} 
                            onChange={(e) => setSelectedEventId(e.target.value)}
                            className="w-full bg-black border border-zinc-700 p-3 mb-4 text-white rounded focus:border-co-yellow outline-none text-sm"
                        >
                            <option value="">-- Select --</option>
                            {events.map(e => (
                                <option key={e.id} value={e.id}>{e.date} | {e.title}</option>
                            ))}
                        </select>

                        <label className="block text-zinc-400 text-xs uppercase mb-2">2. Scan / Enter Code</label>
                        <div className="flex gap-2 mb-4">
                            <input 
                                type="text" 
                                value={qrInput}
                                onChange={(e) => setQrInput(e.target.value)}
                                placeholder="Scan QR..."
                                className="flex-1 bg-black border border-zinc-700 p-3 text-white rounded focus:border-co-yellow outline-none"
                            />
                            <button type="submit" className="bg-white text-black font-bold uppercase px-4 rounded hover:bg-zinc-200">
                                GO
                            </button>
                        </div>
                    </form>

                    {checkInStatus && (
                        <div className={`p-3 rounded text-center text-sm font-bold ${checkInStatus.success ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
                            {checkInStatus.msg}
                        </div>
                    )}
                </div>
            </div>
        )}

        <div className={activeTab === 'users' ? 'lg:col-span-3' : 'lg:col-span-2'}>
            {activeTab === 'schedule' && renderScheduleTab()}
            {activeTab === 'calendar' && renderCalendarTab()}
            {activeTab === 'users' && renderUsersTab()}
        </div>
      </div>
      
      {showRosterModal && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={() => setShowRosterModal(null)}>
            <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="font-teko text-4xl text-white uppercase">{showRosterModal.title}</h2>
                        <p className="text-zinc-500">{showRosterModal.date} @ {showRosterModal.startTime}</p>
                    </div>
                    <button onClick={() => setShowRosterModal(null)} className="text-zinc-500 hover:text-white">&times;</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase mb-4 border-b border-zinc-800 pb-2">Roster ({showRosterModal.registeredKidIds.length})</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {showRosterModal.registeredKidIds.length === 0 && <p className="text-zinc-600 text-sm italic">No athletes registered.</p>}
                            {showRosterModal.registeredKidIds.map(kidId => (
                                <div key={kidId} className="flex justify-between items-center bg-black p-2 rounded border border-zinc-800">
                                    <span className="text-zinc-300 text-sm">{getKidName(kidId)}</span>
                                    <button onClick={() => handleRemoveKidFromRoster(kidId)} className="text-red-500 hover:text-red-400">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-bold text-white uppercase mb-4 border-b border-zinc-800 pb-2">Add Athlete</h3>
                        <div className="flex gap-2">
                            <select 
                                value={kidToAdd} 
                                onChange={(e) => setKidToAdd(e.target.value)}
                                className="flex-1 bg-black border border-zinc-700 p-2 text-white text-sm rounded outline-none focus:border-co-yellow"
                            >
                                <option value="">-- Select Athlete --</option>
                                {allChildren
                                    .filter(c => !showRosterModal.registeredKidIds.includes(c.id)) 
                                    .map(c => (
                                    <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
                                ))}
                            </select>
                            <button 
                                onClick={handleAddKidToRoster}
                                disabled={!kidToAdd}
                                className="bg-co-yellow disabled:opacity-50 text-black px-3 rounded hover:bg-white transition-colors"
                            >
                                <Plus size={20} />
                            </button>
                        </div>
                        <p className="text-zinc-600 text-xs mt-2">
                            Adding an athlete manually bypasses subscription limits and payment checks.
                        </p>
                    </div>
                </div>
            </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
           <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-teko text-3xl text-white uppercase mb-6">Create New Session</h2>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-zinc-400 text-xs uppercase mb-1">Title</label>
                <input required className="w-full bg-black border border-zinc-700 p-2 text-white" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} />
              </div>
              <div>
                <label className="block text-zinc-400 text-xs uppercase mb-1">Description</label>
                <textarea className="w-full bg-black border border-zinc-700 p-2 text-white" value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-zinc-400 text-xs uppercase mb-1">Date</label>
                   {/* STYLED DATE PICKER */}
                   <input 
                      required 
                      type="date" 
                      className="w-full bg-black border border-zinc-700 p-2 text-white focus:border-co-yellow focus:ring-1 focus:ring-co-yellow rounded outline-none appearance-none" 
                      value={newEvent.date} 
                      onChange={e => setNewEvent({...newEvent, date: e.target.value})} 
                   />
                </div>
                <div>
                   <label className="block text-zinc-400 text-xs uppercase mb-1">Max Slots</label>
                   <input required type="number" className="w-full bg-black border border-zinc-700 p-2 text-white" value={newEvent.maxSlots} onChange={e => setNewEvent({...newEvent, maxSlots: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-zinc-400 text-xs uppercase mb-1">Start Time</label>
                   <input required type="time" className="w-full bg-black border border-zinc-700 p-2 text-white" value={newEvent.startTime} onChange={e => setNewEvent({...newEvent, startTime: e.target.value})} />
                </div>
                 <div>
                   <label className="block text-zinc-400 text-xs uppercase mb-1">End Time</label>
                   <input required type="time" className="w-full bg-black border border-zinc-700 p-2 text-white" value={newEvent.endTime} onChange={e => setNewEvent({...newEvent, endTime: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-zinc-400 text-xs uppercase mb-1">Location</label>
                <input required className="w-full bg-black border border-zinc-700 p-2 text-white" value={newEvent.location} onChange={e => setNewEvent({...newEvent, location: e.target.value})} />
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-3 text-zinc-400 hover:text-white uppercase font-teko text-xl">Cancel</button>
                <button type="submit" className="flex-1 bg-co-red hover:bg-red-800 text-white py-3 uppercase font-teko text-xl font-bold rounded">Create</button>
              </div>
            </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;