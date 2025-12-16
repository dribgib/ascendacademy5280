import React, { useEffect, useState } from 'react';
import { User, Child, Event } from '../types';
import { DataService } from '../services/mockService';
import { Plus, User as KidIcon, Calendar, CheckCircle } from 'lucide-react';
import { POPULAR_SPORTS } from '../constants';
import QRCodeDisplay from '../components/QRCodeDisplay';

interface UserDashboardProps {
  user: User;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user }) => {
  const [kids, setKids] = useState<Child[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [showAddKidModal, setShowAddKidModal] = useState(false);
  
  // New Kid Form State
  const [newKidName, setNewKidName] = useState({ first: '', last: '' });
  const [newKidDob, setNewKidDob] = useState('');
  const [selectedSports, setSelectedSports] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, [user.id]);

  const loadData = async () => {
    const [kidsData, eventsData] = await Promise.all([
      DataService.getChildren(user.id),
      DataService.getEvents()
    ]);
    setKids(kidsData);
    setEvents(eventsData);
  };

  const handleAddKid = async (e: React.FormEvent) => {
    e.preventDefault();
    await DataService.addChild({
      parentId: user.id,
      firstName: newKidName.first,
      lastName: newKidName.last,
      dob: newKidDob,
      sports: selectedSports
    });
    setShowAddKidModal(false);
    loadData();
    // Reset form
    setNewKidName({ first: '', last: '' });
    setSelectedSports([]);
  };

  const toggleSport = (sport: string) => {
    if (selectedSports.includes(sport)) {
      setSelectedSports(selectedSports.filter(s => s !== sport));
    } else {
      setSelectedSports([...selectedSports, sport]);
    }
  };

  const handleRegister = async (eventId: string, kidId: string) => {
    await DataService.registerForEvent(eventId, kidId);
    loadData();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="font-teko text-5xl text-white uppercase">My Team</h1>
          <p className="text-zinc-500">Manage your athletes and schedules.</p>
        </div>
        <button 
          onClick={() => setShowAddKidModal(true)}
          className="bg-co-yellow text-black px-6 py-2 font-teko text-xl uppercase font-bold rounded hover:bg-yellow-400 flex items-center gap-2"
        >
          <Plus size={20} /> Add Athlete
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Col: Kids & QR Codes */}
        <div className="lg:col-span-1 space-y-6">
          {kids.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-8 text-center">
              <p className="text-zinc-500">No athletes added yet.</p>
            </div>
          ) : (
            kids.map(kid => (
              <div key={kid.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-co-blue"></div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-teko text-3xl text-white uppercase">{kid.firstName} {kid.lastName}</h3>
                    <p className="text-zinc-500 text-sm">{kid.sports.join(', ')}</p>
                  </div>
                  <div className="bg-zinc-800 p-2 rounded-full">
                    <KidIcon size={20} className="text-zinc-400" />
                  </div>
                </div>
                
                <div className="flex flex-col items-center bg-white/5 p-4 rounded-lg">
                  <p className="text-xs text-zinc-400 mb-2 uppercase tracking-widest">Access Pass</p>
                  <QRCodeDisplay value={kid.qrCode} size={120} />
                  <p className="text-[10px] text-zinc-500 mt-2 font-mono">{kid.qrCode}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right Col: Schedule / Register */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h2 className="font-teko text-3xl text-white uppercase mb-6 flex items-center gap-2">
              <Calendar className="text-co-red" /> Upcoming Sessions
            </h2>

            <div className="space-y-4">
              {events.map(evt => {
                const isFull = evt.bookedSlots >= evt.maxSlots;
                return (
                  <div key={evt.id} className="bg-black border border-zinc-800 p-5 rounded hover:border-zinc-700 transition-colors">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div>
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
                          return (
                            <button
                              key={kid.id}
                              disabled={isRegistered || isFull}
                              onClick={() => handleRegister(evt.id, kid.id)}
                              className={`
                                text-xs py-2 px-3 rounded uppercase font-bold transition-colors
                                ${isRegistered 
                                  ? 'bg-green-900/30 text-green-500 border border-green-900 cursor-default' 
                                  : isFull 
                                    ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                                    : 'bg-zinc-800 hover:bg-co-blue hover:text-white text-zinc-300 border border-zinc-700'}
                              `}
                            >
                              {isRegistered ? (
                                <span className="flex items-center justify-center gap-1"><CheckCircle size={12} /> {kid.firstName} In</span>
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
      </div>

      {/* Add Kid Modal */}
      {showAddKidModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="font-teko text-3xl text-white uppercase mb-6">New Athlete Profile</h2>
            <form onSubmit={handleAddKid} className="space-y-4">
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
                <label className="block text-zinc-400 text-xs uppercase mb-2">Interests (Select all that apply)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {POPULAR_SPORTS.map(sport => (
                    <button
                      type="button"
                      key={sport}
                      onClick={() => toggleSport(sport)}
                      className={`text-xs p-2 rounded border transition-colors ${selectedSports.includes(sport) ? 'bg-co-blue border-co-blue text-white' : 'bg-black border-zinc-800 text-zinc-500 hover:border-zinc-600'}`}
                    >
                      {sport}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowAddKidModal(false)} className="flex-1 py-3 text-zinc-400 hover:text-white uppercase font-teko text-xl">Cancel</button>
                <button type="submit" className="flex-1 bg-co-yellow hover:bg-yellow-400 text-black py-3 uppercase font-teko text-xl font-bold rounded">Save Profile</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserDashboard;
