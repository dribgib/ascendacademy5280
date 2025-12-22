import React, { useState } from 'react';
import { Mail, Send, Heart } from 'lucide-react';
import { api } from '../services/api';

const SponsorPage: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: ''
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    
    // Call API to send email (simulated)
    await (api as any).general.sendSponsorshipInquiry(formData);
    
    setSending(false);
    setSent(true);
  };

  if (sent) {
      return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
            <Heart size={64} className="text-co-red mb-6 animate-bounce" />
            <h1 className="font-teko text-6xl text-white uppercase mb-4">Thank You!</h1>
            <p className="text-zinc-400 max-w-lg mb-8 text-lg">
                We have received your sponsorship inquiry. Roderrick Jackson will be in touch with you shortly at <span className="text-white font-bold">{formData.email}</span>.
            </p>
            <button 
                onClick={() => window.location.href = '/'}
                className="text-co-yellow uppercase font-teko text-xl underline hover:text-white font-medium"
            >
                Return Home
            </button>
        </div>
      );
  }

  return (
    // Standardized Box Layout: w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 min-h-[80vh]">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
            <h1 className="font-teko text-6xl text-white uppercase mb-4">Sponsor An Athlete</h1>
            <p className="text-zinc-500 text-lg">
                Make a difference in a young athlete's life. 100% of sponsorship funds go directly towards training fees and equipment for families in need.
            </p>
        </div>

        <div className="bg-card-bg border border-zinc-800 p-8 rounded-lg shadow-xl relative overflow-hidden">
            {/* Decorative line */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-co-red to-co-yellow"></div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-zinc-500 text-xs uppercase font-medium mb-2">Your Name</label>
                        <input 
                            required
                            type="text" 
                            className="w-full bg-black border border-zinc-700 p-4 text-white rounded focus:border-co-yellow outline-none"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-zinc-500 text-xs uppercase font-medium mb-2">Company (Optional)</label>
                        <input 
                            type="text" 
                            className="w-full bg-black border border-zinc-700 p-4 text-white rounded focus:border-co-yellow outline-none"
                            value={formData.company}
                            onChange={(e) => setFormData({...formData, company: e.target.value})}
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-zinc-500 text-xs uppercase font-medium mb-2">Email Address</label>
                    <input 
                        required
                        type="email" 
                        className="w-full bg-black border border-zinc-700 p-4 text-white rounded focus:border-co-yellow outline-none"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                </div>

                <div>
                    <label className="block text-zinc-500 text-xs uppercase font-medium mb-2">Message</label>
                    <textarea 
                        required
                        rows={5}
                        className="w-full bg-black border border-zinc-700 p-4 text-white rounded focus:border-co-yellow outline-none"
                        placeholder="I would like to sponsor..."
                        value={formData.message}
                        onChange={(e) => setFormData({...formData, message: e.target.value})}
                    ></textarea>
                </div>

                <button 
                    type="submit" 
                    disabled={sending}
                    className="w-full bg-co-red hover:bg-white hover:text-black text-white py-4 font-teko text-2xl uppercase font-medium rounded flex items-center justify-center gap-2 transition-colors"
                >
                    {sending ? 'Sending...' : <><Send size={20} /> Send Inquiry</>}
                </button>
            </form>
            
            <div className="mt-8 pt-8 border-t border-zinc-800 text-center">
                <p className="text-zinc-600 text-sm flex items-center justify-center gap-2">
                    <Mail size={14} /> Direct Email: rod@ascendacademy5280.com
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SponsorPage;