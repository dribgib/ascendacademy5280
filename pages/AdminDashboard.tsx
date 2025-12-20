import React, { useState, useEffect } from 'react';
import { User, Event } from '../types';
import { api } from '../services/api';
import { QrCode, Plus, Calendar, Smartphone, Users, CheckCircle } from 'lucide-react';

interface AdminDashboardProps {
  user: User;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [qrInput, setQrInput] = useState('');
  const [checkInStatus, setCheckInStatus] = useState<{msg: string, success: boolean} | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  
  // Create Event State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '', description: '', date: '', startTime: '', endTime: '', location: '', maxSlots: 20
  });

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events]);

  const loadEvents = async () => {
    const data = await api.events.list();
    setEvents(data);
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      setCheckInStatus({ msg: 'Please select an event first.', success: false });
      return;
    }

    const result = await api.registrations.checkIn(selectedEventId, qrInput);
    setCheckInStatus({ msg: result.message, success: result.success });
    setQrInput(''); // Clear input for next scan
    
    // Auto-clear success message after 3 seconds
    setTimeout(() => setCheckInStatus(null), 3000);
    loadEvents(); // Refresh stats
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Combine Date + Time into ISO string
      // Note: This naive approach assumes local time logic. In production, consider Timezones (MST/MDT for Denver)
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
      loadEvents();
      // Reset
      setNewEvent({ title: '', description: '', date: '', startTime: '', endTime: '', location: '', maxSlots: 20 });
    } catch (e) {
      console.error(e);
      alert('Failed to create event. Check console.');
    }
  };

  const handleSendReminders = async (eventId: string) => {
    await api.registrations.sendReminder(eventId);
    alert('Mock SMS reminders sent via Twilio!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="font-teko text-5xl text-white uppercase">Coach's Dashboard</h1>
          <p className="text-zinc-500">Manage sessions, roster, and attendance.</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-co-red text-white px-6 py-2 font-teko text-xl uppercase font-bold rounded hover:bg-red-800 flex items-center gap-2"
        >
          <Plus size={20} /> Create Session
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Check-In Station */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8">
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-zinc-800">
            <QrCode className="text-co-yellow" size={32} />
            <h2 className="font-teko text-3xl text-white uppercase">Scanner / Check-In</h2>
          </div>

          <div className="mb-6">
            <label className="block text-zinc-400 text-xs uppercase mb-2">Select Active Session</label>
            <select 
              value={selectedEventId} 
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full bg-black border border-zinc-700 p-3 text-white rounded focus:border-co-yellow outline-none"
            >
              <option value="">-- Select Session --</option>
              {events.map(e => (
                <option key={e.id} value={e.id}>{e.date} | {e.title} ({e.startTime})</option>
              ))}
            </select>
          </div>

          <form onSubmit={handleCheckIn}>
            <label className="block text-zinc-400 text-xs uppercase mb-2">Scan QR Code (or enter ID)</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="Click here and scan..."
                className="flex-1 bg-black border border-zinc-700 p-3 text-white rounded focus:border-co-yellow outline-none"
                autoFocus
              />
              <button type="submit" className="bg-white text-black font-bold uppercase px-6 rounded hover:bg-zinc-200">
                Check In
              </button>
            </div>
          </form>

          {checkInStatus && (
            <div className={`mt-4 p-4 rounded text-center font-bold ${checkInStatus.success ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
              {checkInStatus.msg}
            </div>
          )}
          
          <div className="mt-8">
            <h4 className="text-zinc-500 text-sm uppercase mb-2">Instructions</h4>
            <p className="text-zinc-600 text-xs">
              1. Connect QR Scanner to USB.<br/>
              2. Select the correct session above.<br/>
              3. Click the input box.<br/>
              4. Scan athlete's code.
            </p>
          </div>
        </div>

        {/* Event List */}
        <div className="space-y-6">
          <h2 className="font-teko text-3xl text-white uppercase flex items-center gap-2">
            <Calendar className="text-zinc-400" /> Scheduled Sessions
          </h2>
          {events.length === 0 && <div className="text-zinc-500 p-4">No events scheduled.</div>}
          {events.map(evt => (
            <div key={evt.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-lg relative">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-white text-xl">{evt.title}</h3>
                  <p className="text-zinc-500 text-sm">{evt.date} • {evt.startTime} - {evt.endTime}</p>
                  <p className="text-zinc-500 text-xs mt-1">{evt.location}</p>
                </div>
                <div className="text-right">
                   <div className="flex items-center gap-2 text-zinc-400 text-sm">
                      <Users size={16} />
                      <span>{evt.registeredKidIds.length} / {evt.maxSlots} Registered</span>
                   </div>
                   <div className="flex items-center gap-2 text-co-yellow text-sm mt-1 font-bold justify-end">
                      <CheckCircle size={16} />
                      <span>{evt.checkedInKidIds.length} Checked In</span>
                   </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-4 pt-4 border-t border-zinc-800">
                <button 
                  onClick={() => handleSendReminders(evt.id)}
                  className="text-xs flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
                >
                  <Smartphone size={14} /> Send SMS Reminder
                </button>
                <button className="text-xs text-co-red hover:text-red-400 ml-auto uppercase font-bold">
                  Cancel Event
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreateModal(false)}
        >
           <div 
             className="bg-zinc-900 border border-zinc-700 p-8 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto"
             onClick={(e) => e.stopPropagation()}
           >
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
                   <input required type="date" className="w-full bg-black border border-zinc-700 p-2 text-white" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
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