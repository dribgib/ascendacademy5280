import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Event, User, Child } from '../types';
import { ChevronLeft, ChevronRight, Clock, MapPin, Calendar, Info, X, AlertCircle, CheckCircle, Users } from 'lucide-react';
import { useModal } from '../context/ModalContext';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '../components/LoadingScreen';
import { calculateAge } from '../constants';

interface SchedulePageProps {
  user: User | null;
}

const SchedulePage: React.FC<SchedulePageProps> = ({ user }) => {
  const { showConfirm, showAlert } = useModal();
  const navigate = useNavigate();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  
  // User children data for registration
  const [kids, setKids] = useState<Child[]>([]);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (user) {
        loadKids();
    }
  }, [user]);

  const loadEvents = async () => {
    try {
      const data = await api.events.list();
      setEvents(data);
    } catch (e) {
      console.error("Failed to load events", e);
    } finally {
      setLoading(false);
    }
  };

  const loadKids = async () => {
    if (!user) return;
    try {
        const data = await api.children.list(user.id);
        setKids(data);
    } catch (e) {
        console.error("Failed to load athletes", e);
    }
  };

  const handleRegister = async (event: Event, kid: Child, isWaitlist: boolean) => {
    if (!user) {
        navigate('/login');
        return;
    }

    // CHECK AGE RESTRICTION
    if (event.minAge !== undefined && event.maxAge !== undefined && kid.dob) {
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
      await api.registrations.register(event.id, kid.id);
      await loadEvents(); // Reload events to update slot counts
      await loadKids(); // Reload kids to update usage stats if needed
      
      // Update the selected event in the modal locally to reflect changes immediately
      const updatedEvents = await api.events.list();
      const updatedSelected = updatedEvents.find(e => e.id === event.id);
      if (updatedSelected) setSelectedEvent(updatedSelected);

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
      await loadEvents();
      await loadKids();

      // Update local modal state
      const updatedEvents = await api.events.list();
      const updatedSelected = updatedEvents.find(e => e.id === eventId);
      if (updatedSelected) setSelectedEvent(updatedSelected);

      showAlert('Success', 'Registration cancelled.', 'success');
    } catch (e: any) {
      console.error(e);
      showAlert('Error', e.message || 'Failed to cancel.', 'error');
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if(!e.target.value) return;
    const date = new Date(e.target.value + 'T12:00:00'); // simple parse to avoid timezone shifts on just setting month
    setCurrentDate(date);
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-32 bg-zinc-900/50 border-b border-r border-zinc-800/50"></div>);
    }

    // Days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = events.filter(e => e.date === dateStr);
      const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

      days.push(
        <div key={day} className={`h-32 bg-zinc-900 border-b border-r border-zinc-800 p-2 overflow-y-auto custom-scrollbar ${isToday ? 'bg-zinc-800/50 ring-1 ring-inset ring-co-yellow' : ''}`}>
          <div className={`text-right text-sm mb-2 ${isToday ? 'text-co-yellow font-bold' : 'text-zinc-500'}`}>{day}</div>
          <div className="space-y-1">
            {dayEvents.map(evt => {
                const isFull = evt.bookedSlots >= evt.maxSlots;
                return (
                    <button
                        key={evt.id}
                        onClick={() => setSelectedEvent(evt)}
                        className={`w-full text-left text-[10px] p-1.5 rounded truncate border transition-colors
                            ${isFull 
                                ? 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-co-red' 
                                : 'bg-co-yellow/10 text-co-yellow border-co-yellow/20 hover:bg-co-yellow hover:text-black'}
                        `}
                    >
                        <span className="font-bold mr-1">{evt.startTime}</span>
                        {evt.title}
                    </button>
                );
            })}
          </div>
        </div>
      );
    }

    return days;
  };

  if (loading) return <LoadingScreen text="Loading Schedule..." />;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[80vh]">
      <div className="text-center mb-10">
        <h1 className="font-teko text-6xl text-white uppercase mb-4">Training Schedule</h1>
        <p className="text-zinc-500 max-w-2xl mx-auto">
            View upcoming sessions. Select a session to view details and availability status. 
        </p>
      </div>

      {/* Calendar Controls */}
      <div className="flex items-center justify-between mb-6 bg-zinc-900 p-4 rounded-t-lg border border-zinc-800">
        <button onClick={prevMonth} className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors">
            <ChevronLeft size={24} />
        </button>
        
        <div className="relative group cursor-pointer">
            <h2 className="font-teko text-4xl text-white uppercase flex items-center gap-3">
                {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                <Calendar size={24} className="text-zinc-500 group-hover:text-co-yellow transition-colors" />
            </h2>
            {/* The hidden input sits on top of the text to trigger the picker on click */}
            <input 
                type="date" 
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                onChange={handleDateSelect}
                onClick={(e) => (e.target as HTMLInputElement).showPicker()}
            />
        </div>

        <button onClick={nextMonth} className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors">
            <ChevronRight size={24} />
        </button>
      </div>

      {/* SCROLLABLE CALENDAR WRAPPER */}
      <div className="border border-zinc-800 rounded-b-lg overflow-hidden mb-12">
        <div className="overflow-x-auto custom-scrollbar">
            <div className="min-w-[800px]">
                {/* Calendar Grid Header */}
                <div className="grid grid-cols-7 bg-zinc-950 border-b border-zinc-800">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="py-3 text-center text-zinc-500 text-sm font-bold uppercase tracking-wider border-r border-zinc-800 last:border-r-0">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Grid Body */}
                <div className="grid grid-cols-7 bg-zinc-900">
                    {renderCalendarDays()}
                </div>
            </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-6 justify-center text-sm mb-12 flex-wrap">
        <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-co-yellow/10 border border-co-yellow rounded"></div>
            <span className="text-zinc-400">Open Slots</span>
        </div>
        <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-zinc-800 border border-zinc-700 rounded"></div>
            <span className="text-zinc-400">Waitlist Only</span>
        </div>
      </div>
      
      <div className="md:hidden text-center text-zinc-600 text-xs mb-8 -mt-8 flex items-center justify-center gap-2">
        <ChevronLeft size={12} /> Swipe calendar to view details <ChevronRight size={12} />
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div 
            className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
            onClick={() => setSelectedEvent(null)}
        >
            <div 
                className="bg-card-bg border border-zinc-700 p-8 rounded-lg max-w-md w-full relative shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <button 
                    onClick={() => setSelectedEvent(null)}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                >
                    <X size={24} />
                </button>

                <div className="mb-6">
                    <span className="bg-zinc-800 text-zinc-400 text-xs px-2 py-1 rounded font-mono uppercase tracking-wider">
                        {new Date(selectedEvent.isoStart).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </span>
                    <h2 className="font-teko text-4xl text-white uppercase mt-2 leading-none">
                        {selectedEvent.title}
                    </h2>
                </div>

                <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3 text-zinc-300">
                        <Clock className="text-co-yellow" size={20} />
                        <span>{selectedEvent.startTime} - {selectedEvent.endTime}</span>
                    </div>
                    {selectedEvent.minAge && (
                        <div className="flex items-center gap-3 text-zinc-300">
                            <Users className="text-co-yellow" size={20} />
                            <span className="font-bold text-co-yellow">
                                Ages {selectedEvent.minAge} - {selectedEvent.maxAge}
                            </span>
                        </div>
                    )}
                    <div className="flex items-center gap-3 text-zinc-300">
                        <MapPin className="text-co-red" size={20} />
                        <span>{selectedEvent.location}</span>
                    </div>
                    <div className="flex items-start gap-3 text-zinc-400">
                        <Info className="text-zinc-500 mt-1" size={20} />
                        <p className="text-sm leading-relaxed">{selectedEvent.description}</p>
                    </div>
                </div>

                {/* Status Badge */}
                <div className="mb-6">
                    {selectedEvent.bookedSlots >= selectedEvent.maxSlots ? (
                        <div className="flex items-center gap-2 text-zinc-400 bg-zinc-900 p-3 rounded border border-zinc-800">
                            <AlertCircle size={20} />
                            <span className="font-bold uppercase tracking-wide">Waitlist Only</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-black bg-co-yellow p-3 rounded font-bold uppercase tracking-wide justify-center">
                            <div className="w-2 h-2 bg-black rounded-full animate-pulse"></div>
                            Registration Open
                        </div>
                    )}
                </div>

                {/* Registration Buttons */}
                <div className="border-t border-zinc-800 pt-6">
                    <h3 className="font-teko text-2xl text-white uppercase mb-4">Register Athletes</h3>
                    
                    {!user ? (
                        <button 
                            onClick={() => navigate('/login')}
                            className="w-full bg-zinc-800 hover:bg-white hover:text-black text-white py-3 uppercase font-teko text-xl rounded transition-colors"
                        >
                            Login to Register
                        </button>
                    ) : kids.length === 0 ? (
                        <div className="text-center">
                             <p className="text-zinc-500 text-sm mb-3">No athletes found on your account.</p>
                             <button 
                                onClick={() => navigate('/dashboard')}
                                className="text-co-yellow underline uppercase font-teko text-xl"
                            >
                                Add Athlete on Dashboard
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                             {kids.map(kid => {
                                const isRegistered = selectedEvent.registeredKidIds.includes(kid.id);
                                const limitReached = kid.usageStats && kid.usageStats.used >= kid.usageStats.limit;
                                const hasPlan = kid.subscriptionStatus === 'active';
                                const isFull = selectedEvent.bookedSlots >= selectedEvent.maxSlots;

                                return (
                                    <button
                                        key={kid.id}
                                        disabled={(!isRegistered && limitReached) || (!isRegistered && !hasPlan)}
                                        onClick={() => isRegistered ? handleUnregister(selectedEvent.id, kid.id) : handleRegister(selectedEvent, kid, isFull)}
                                        className={`
                                            w-full flex items-center justify-between p-3 rounded uppercase font-bold text-sm transition-colors border
                                            ${isRegistered 
                                                ? 'bg-green-900/20 text-green-500 border-green-900 hover:bg-red-900/50 hover:text-red-200 hover:border-red-900 cursor-pointer' 
                                                : (!hasPlan || limitReached)
                                                    ? 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
                                                    : isFull
                                                        ? 'bg-zinc-800 text-white border-zinc-700 hover:border-co-yellow'
                                                        : 'bg-zinc-900 text-white border-zinc-700 hover:bg-co-yellow hover:text-black hover:border-co-yellow'}
                                        `}
                                    >
                                        <span>{kid.firstName}</span>
                                        <span>
                                            {isRegistered ? (
                                                <span className="flex items-center gap-1"><CheckCircle size={14} /> Registered</span>
                                            ) : !hasPlan ? (
                                                <span className="text-zinc-600 text-[10px] font-normal">Plan Required</span>
                                            ) : limitReached ? (
                                                 <span className="text-zinc-600 text-[10px] font-normal">Limit Reached</span>
                                            ) : isFull ? (
                                                "Waitlist"
                                            ) : (
                                                "Sign Up"
                                            )}
                                        </span>
                                    </button>
                                );
                             })}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default SchedulePage;