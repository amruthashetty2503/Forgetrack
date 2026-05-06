import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, CheckCircle, XCircle, TrendingUp, Info } from 'lucide-react';

export default function MyAttendance() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState({ total: 0, attended: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get the student's USN from their email (for demo)
      const usn = user.email.split('@')[0].toUpperCase();
      
      // 2. Find the student record
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('usn', usn)
        .single();

      if (!student) throw new Error('Student profile not found');

      // 3. Fetch all sessions
      const { data: sessions } = await supabase
        .from('sessions')
        .select('*')
        .order('date', { ascending: false });

      // 4. Fetch the student's attendance
      const { data: attRecords } = await supabase
        .from('attendance')
        .select('session_id, present')
        .eq('student_id', student.id);

      const attMap = {};
      attRecords?.forEach(r => attMap[r.session_id] = r.present);

      const today = new Date().toISOString().split('T')[0];
      const combined = sessions
        .filter(s => s.date <= today || attMap[s.id] !== undefined)
        .map(s => ({
          ...s,
          present: attMap[s.id] ?? null // null means not marked yet
        }));

      setAttendance(combined);
      
      const attended = attRecords?.filter(r => r.present).length || 0;
      setStats({ total: sessions.length, attended });
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  const percentage = stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-glow"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-accent-glow">
          <TrendingUp size={20} />
          <span className="text-sm font-semibold tracking-wider uppercase">My Progress</span>
        </div>
        <h2 className="text-display-sm text-primary">Attendance Overview</h2>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 card bg-surface-raised border-subtle p-8 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-glow/5 rounded-full blur-3xl -mr-32 -mt-32" />
          
          <div className="relative">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="58"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-surface-inset"
              />
              <circle
                cx="64"
                cy="64"
                r="58"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={364}
                strokeDashoffset={364 - (364 * percentage) / 100}
                strokeLinecap="round"
                className={`${percentage >= 75 ? 'text-accent-glow' : 'text-rose-500'} transition-all duration-1000`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">{percentage}%</span>
            </div>
          </div>

          <div className="space-y-4 text-center md:text-left z-10">
            <h3 className="text-xl font-bold text-primary">
              {percentage >= 75 ? "You're doing great!" : "You need to attend more classes"}
            </h3>
            <p className="text-secondary text-sm max-w-sm">
              Your current attendance is {percentage}%. Keep it above 75% to stay eligible for certifications.
            </p>
          </div>
        </div>

        <div className="card bg-surface-raised border-subtle p-8 flex flex-col justify-center items-center gap-2">
          <p className="text-xs font-bold text-tertiary uppercase tracking-widest">Classes Attended</p>
          <p className="text-5xl font-bold text-primary">{stats.attended} <span className="text-xl text-tertiary">/ {stats.total}</span></p>
        </div>
      </div>

      {/* History List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-primary flex items-center gap-2">
          <Calendar size={20} className="text-accent-glow" />
          Detailed History
        </h3>
        
        <div className="grid gap-3">
          {attendance.map((session) => (
            <div 
              key={session.id} 
              className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                session.present 
                  ? 'bg-emerald-500/5 border-emerald-500/20' 
                  : session.present === false 
                    ? 'bg-rose-500/5 border-rose-500/20' 
                    : 'bg-surface border-subtle'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${session.present ? 'bg-emerald-500/10' : 'bg-surface-inset'}`}>
                  {session.present ? <CheckCircle size={20} className="text-emerald-500" /> : <XCircle size={20} className="text-tertiary" />}
                </div>
                <div>
                  <p className="font-semibold text-primary">{session.topic}</p>
                  <p className="text-xs text-tertiary uppercase tracking-widest">{session.date}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                {session.present === null ? (
                  <span className="px-3 py-1 rounded-full bg-surface-inset border border-subtle text-[10px] font-bold text-tertiary uppercase tracking-widest">
                    Pending
                  </span>
                ) : (
                  <span className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest ${
                    session.present ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {session.present ? 'Present' : 'Absent'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
