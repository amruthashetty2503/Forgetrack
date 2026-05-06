import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Clock, MapPin, Info, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function UpcomingSessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const usn = user.email.split('@')[0].toUpperCase();
      
      // 1. Find the student record
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('usn', usn)
        .single();

      if (!student) throw new Error('Student profile not found');

      // 2. Fetch future sessions
      const today = new Date().toISOString().split('T')[0];
      const { data: allFutureSessions } = await supabase
        .from('sessions')
        .select('*')
        .gte('date', today)
        .order('date', { ascending: true });

      // 3. Fetch the student's attendance to see what's already "held"
      const { data: attRecords } = await supabase
        .from('attendance')
        .select('session_id')
        .eq('student_id', student.id);

      const attendedSessionIds = new Set(attRecords?.map(r => r.session_id) || []);

      // 4. Filter: only show sessions that DON'T have attendance records yet
      const filtered = allFutureSessions?.filter(s => !attendedSessionIds.has(s.id)) || [];
      
      setSessions(filtered);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
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
          <div key={session.id} className="group card bg-surface-raised border-subtle overflow-hidden transition-all duration-500">
            <div className="p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
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
                </div>
              </div>

              <button 
                onClick={() => toggleExpand(session.id)}
                className={`flex items-center justify-center w-12 h-12 rounded-full bg-surface-inset border border-subtle text-tertiary hover:text-accent-glow hover:bg-accent-glow/10 transition-all ${expandedId === session.id ? 'rotate-90 text-accent-glow bg-accent-glow/10' : ''}`}
              >
                <ArrowRight size={20} />
              </button>
            </div>

            {expandedId === session.id && (
              <div className="px-6 pb-6 pt-2 border-t border-subtle bg-surface-inset/50 animate-in slide-in-from-top-4 duration-300">
                <div className="grid md:grid-cols-2 gap-8 py-4">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-accent-glow uppercase tracking-[0.2em]">Detailed Notes</h4>
                    <p className="text-sm text-secondary leading-relaxed">
                      {session.notes || "No specific instructions have been provided for this session yet. Please stay tuned for updates."}
                    </p>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-accent-glow uppercase tracking-[0.2em]">Session Logistics</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-sm text-tertiary">
                        <Clock size={16} className="text-accent-glow" />
                        <span>Estimated Duration: {session.duration_hours} Hours</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-tertiary">
                        <MapPin size={16} className="text-accent-glow" />
                        <span>Venue: {session.session_type === 'offline' ? 'Main Innovation Lab, Floor 2' : 'Virtual Classroom (Link in Email)'}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-tertiary">
                        <Info size={16} className="text-accent-glow" />
                        <span>Type: {session.session_type === 'offline' ? 'In-person Workshop' : 'Online Webinar'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
