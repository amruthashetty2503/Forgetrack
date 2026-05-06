import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Clock, FileText, TrendingUp, ArrowRight, CheckCircle, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    stats: { total: 0, attended: 0, percentage: 0 },
    nextSession: null,
    recentMaterials: []
  });

  useEffect(() => {
    if (user) fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const usn = user.email.split('@')[0].toUpperCase();
      
      // 1. Get Student Info
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('usn', usn)
        .single();

      if (!student) throw new Error('Profile not found');

      // 2. Get Sessions
      const { data: sessions } = await supabase
        .from('sessions')
        .select('*')
        .order('date', { ascending: true });

      // 3. Get Attendance
      const { data: attendance } = await supabase
        .from('attendance')
        .select('session_id, present')
        .eq('student_id', student.id);

      const attendedIds = new Set(attendance?.map(a => a.session_id) || []);
      const presentCount = attendance?.filter(a => a.present).length || 0;
      
      const today = new Date().toISOString().split('T')[0];
      const pastSessions = sessions?.filter(s => s.date <= today || attendedIds.has(s.id)) || [];
      const upcomingSessions = sessions?.filter(s => s.date > today && !attendedIds.has(s.id)) || [];

      // 4. Get Materials
      const { data: materials } = await supabase
        .from('materials')
        .select('*, sessions(topic, date)')
        .order('created_at', { ascending: false })
        .limit(3);

      setData({
        stats: {
          total: pastSessions.length,
          attended: presentCount,
          percentage: pastSessions.length > 0 ? Math.round((presentCount / pastSessions.length) * 100) : 0
        },
        nextSession: upcomingSessions[0] || null,
        recentMaterials: materials || []
      });
    } catch (err) {
      console.error('Error loading student dashboard:', err);
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
    <div className="max-w-7xl mx-auto p-6 space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-display-sm text-primary">
            Welcome back, <span className="text-accent-glow">{user?.user_metadata?.display_name || 'Student'}</span>
          </h2>
          <p className="text-body text-secondary">Track your learning journey and upcoming milestones.</p>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-micro text-tertiary uppercase tracking-widest">Current Status</p>
          <p className="text-sm font-bold text-emerald-400">Active Learner</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-surface-raised border-subtle p-6 hover:border-accent-glow/30 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent-glow/10 flex items-center justify-center text-accent-glow group-hover:bg-accent-glow group-hover:text-white transition-all">
              <TrendingUp size={20} />
            </div>
            <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest">Attendance</span>
          </div>
          <p className="text-3xl font-bold text-primary">{data.stats.percentage}%</p>
          <p className="text-xs text-tertiary mt-1">Overall Participation</p>
        </div>

        <div className="card bg-surface-raised border-subtle p-6 hover:border-emerald-500/30 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-all">
              <CheckCircle size={20} />
            </div>
            <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest">Classes</span>
          </div>
          <p className="text-3xl font-bold text-primary">{data.stats.attended} <span className="text-lg text-tertiary">/ {data.stats.total}</span></p>
          <p className="text-xs text-tertiary mt-1">Sessions Attended</p>
        </div>

        <div className="lg:col-span-2 card bg-void border-accent-glow/20 p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-accent-glow/5 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="relative h-full flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-primary">Your Next Class</h3>
                {data.nextSession ? (
                  <p className="text-sm text-accent-glow font-medium mt-1">
                    Scheduled for {new Date(data.nextSession.date).toLocaleDateString()}
                  </p>
                ) : (
                  <p className="text-sm text-tertiary mt-1">No sessions scheduled yet.</p>
                )}
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface-raised flex items-center justify-center text-tertiary">
                <Clock size={20} />
              </div>
            </div>
            
            {data.nextSession && (
              <div className="mt-4 flex items-center justify-between">
                <h4 className="text-xl font-bold text-primary line-clamp-1">{data.nextSession.topic}</h4>
                <button 
                  onClick={() => navigate('/me/upcoming')}
                  className="flex items-center gap-2 text-xs font-bold text-accent-glow hover:underline"
                >
                  View Details <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Materials */}
        <div className="lg:col-span-2 card bg-surface-raised border-subtle p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-primary">New Resources Available</h3>
            <button 
              onClick={() => navigate('/me/materials')}
              className="text-xs font-bold text-accent-glow hover:underline flex items-center gap-1"
            >
              All Materials <ArrowRight size={14} />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.recentMaterials.map((m) => (
              <a 
                key={m.id} 
                href={m.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-4 rounded-xl bg-void border border-subtle hover:border-accent-glow/30 transition-all space-y-3"
              >
                <div className="w-8 h-8 rounded-lg bg-surface-inset flex items-center justify-center text-tertiary">
                  <FileText size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold text-primary line-clamp-1">{m.title}</p>
                  <p className="text-[10px] text-tertiary uppercase mt-1">{m.sessions?.topic || 'General'}</p>
                </div>
              </a>
            ))}
            {data.recentMaterials.length === 0 && (
              <div className="col-span-3 py-10 text-center border border-dashed border-subtle rounded-xl">
                <p className="text-tertiary text-sm">No materials uploaded yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Learning Progress / Quick Links */}
        <div className="card bg-surface-raised border-subtle p-8 space-y-6">
          <h3 className="text-lg font-bold text-primary">Quick Navigation</h3>
          <div className="space-y-3">
            <div 
              onClick={() => navigate('/me/attendance')}
              className="flex items-center gap-4 p-4 rounded-xl bg-surface-inset border border-subtle hover:border-accent-glow/30 transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-accent-glow/10 flex items-center justify-center text-accent-glow group-hover:bg-accent-glow group-hover:text-white transition-all">
                <Calendar size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-primary">Check History</p>
                <p className="text-[10px] text-tertiary uppercase tracking-widest">Full Records</p>
              </div>
            </div>
            
            <div 
              onClick={() => navigate('/me/materials')}
              className="flex items-center gap-4 p-4 rounded-xl bg-surface-inset border border-subtle hover:border-blue-500/30 transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                <BookOpen size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-primary">Study Notes</p>
                <p className="text-[10px] text-tertiary uppercase tracking-widest">Resources</p>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-xl bg-accent-glow/5 border border-accent-glow/10 text-center">
              <p className="text-xs text-secondary leading-relaxed">
                "Consistency is the key to mastering new skills. Keep attending and keep growing!"
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
