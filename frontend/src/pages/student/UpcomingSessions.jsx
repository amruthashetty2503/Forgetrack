import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Clock, MapPin, Info, ArrowRight } from 'lucide-react';

export default function UpcomingSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .gte('date', today)
        .order('date', { ascending: true });
      
      setSessions(data || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-glow"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-accent-glow">
          <Clock size={20} />
          <span className="text-sm font-semibold tracking-wider uppercase">Schedule</span>
        </div>
        <h2 className="text-display-sm text-primary">Upcoming Sessions</h2>
        <p className="text-body text-secondary">Stay ahead of your schedule. Here are the next sessions planned for you.</p>
      </div>

      <div className="grid gap-6">
        {sessions.map((session) => (
          <div key={session.id} className="group card bg-surface-raised border-subtle hover:border-accent-glow/50 p-6 flex flex-col md:flex-row items-start md:items-center gap-6 transition-all">
            <div className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-surface-inset border border-subtle group-hover:bg-accent-glow group-hover:text-white transition-all">
              <span className="text-xs font-bold uppercase">{new Date(session.date).toLocaleString('default', { month: 'short' })}</span>
              <span className="text-2xl font-bold">{new Date(session.date).getDate()}</span>
            </div>
            
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                  session.session_type === 'offline' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                }`}>
                  {session.session_type}
                </span>
                <span className="text-xs text-tertiary font-medium">Duration: {session.duration_hours}h</span>
              </div>
              <h3 className="text-xl font-bold text-primary">{session.topic}</h3>
              <div className="flex items-center gap-4 text-sm text-tertiary">
                <div className="flex items-center gap-1.5">
                  <MapPin size={14} />
                  <span>{session.session_type === 'offline' ? 'Innovation Lab' : 'Zoom Meeting'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Info size={14} />
                  <span className="line-clamp-1">{session.notes || 'No specific instructions yet.'}</span>
                </div>
              </div>
            </div>

            <button className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-inset border border-subtle text-tertiary hover:text-accent-glow hover:bg-accent-glow/10 transition-all">
              <ArrowRight size={20} />
            </button>
          </div>
        ))}

        {sessions.length === 0 && (
          <div className="text-center py-20 bg-surface-inset rounded-3xl border border-dashed border-subtle">
            <Calendar size={48} className="mx-auto text-tertiary mb-4 opacity-10" />
            <p className="text-secondary">No upcoming sessions scheduled at the moment.</p>
          </div>
        )}
      </div>
    </div>
  );
}
