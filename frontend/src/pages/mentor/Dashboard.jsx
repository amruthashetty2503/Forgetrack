import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Calendar, AlertTriangle, TrendingUp, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    avgAttendance: 0,
    atRiskCount: 0,
    recentSession: null,
    upcomingSessions: []
  });
  const [upcomingAssignments, setUpcomingAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Get total students
      const { count: studentCount } = await supabase.from('students').select('*', { count: 'exact', head: true });

      // 2. Get sessions and attendance
      const { data: sessions } = await supabase.from('sessions').select('*').order('date', { ascending: false });
      const { data: attendance } = await supabase.from('attendance').select('*');

      // 3. Calculate avg attendance
      const totalPossible = (studentCount || 0) * (sessions?.length || 0);
      const totalPresent = attendance?.filter(a => a.present).length || 0;
      const avg = totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;

      // 4. Calculate at risk (simplified for dashboard)
      const studentStats = {};
      attendance?.forEach(a => {
        if (!studentStats[a.student_id]) studentStats[a.student_id] = { attended: 0 };
        if (a.present) studentStats[a.student_id].attended++;
      });
      
      const atRisk = Object.values(studentStats).filter(s => (s.attended / (sessions?.length || 1)) < 0.75).length;

      const today = new Date().toISOString().split('T')[0];
      const attendedSessionIds = new Set(attendance?.map(a => a.session_id) || []);
      
      const upcoming = sessions?.filter(s => s.date >= today && !attendedSessionIds.has(s.id)).reverse() || [];
      const recent = sessions?.filter(s => s.date < today || attendedSessionIds.has(s.id))[0] || sessions?.[0] || null;

      setStats({
        totalStudents: studentCount || 0,
        avgAttendance: avg,
        atRiskCount: atRisk,
        recentSession: recent,
        upcomingSessions: upcoming.slice(0, 3) // Show top 3 upcoming
      });

      // 5. Get upcoming assignments
      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select('*')
        .gte('due_date', today)
        .order('due_date', { ascending: true })
        .limit(3);
      
      setUpcomingAssignments(assignmentsData || []);

    } catch (err) {
      console.error('Dashboard fetch error:', err);
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
            Welcome back, <span className="text-accent-glow">{user?.user_metadata?.display_name || 'Mentor'}</span>
          </h2>
          <p className="text-body text-secondary">A birds-eye view of your cohort's performance and engagement.</p>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-micro text-tertiary uppercase tracking-widest">Role</p>
          <p className="text-sm font-bold text-accent-glow">Lead Mentor</p>
        </div>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-surface-raised border-subtle p-6 hover:border-accent-glow/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent-glow/10 flex items-center justify-center text-accent-glow">
              <Users size={20} />
            </div>
            <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest">Cohort Size</span>
          </div>
          <p className="text-3xl font-bold text-primary">{stats.totalStudents}</p>
          <p className="text-xs text-tertiary mt-1">Active Students</p>
        </div>

        <div className="card bg-surface-raised border-subtle p-6 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <TrendingUp size={20} />
            </div>
            <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest">Avg Attendance</span>
          </div>
          <p className="text-3xl font-bold text-primary">{stats.avgAttendance}%</p>
          <p className="text-xs text-tertiary mt-1">Across all sessions</p>
        </div>


        <div className="card bg-surface-raised border-accent-glow/20 p-6 shadow-[0_8px_32px_rgba(99,102,241,0.1)] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent-glow flex items-center justify-center text-white">
              <Calendar size={20} />
            </div>
            <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest">Quick Link</span>
          </div>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/attendance')}
              className="w-full btn-primary text-xs py-2"
            >
              Take Attendance
            </button>
            <button 
              onClick={() => navigate('/attendance')}
              className="w-full btn-secondary text-xs py-2"
            >
              Schedule Class
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Sessions Reminder */}
        <div className="lg:col-span-3 card bg-void border-accent-glow/20 p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent-glow/5 rounded-full blur-[100px] -mr-48 -mt-48" />
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-accent-glow flex items-center justify-center text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] group-hover:scale-110 transition-transform">
                <Clock size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-primary">Upcoming Schedule Reminder</h3>
                <p className="text-sm text-secondary">You have {stats.upcomingSessions.length} sessions planned for this week.</p>
              </div>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto">
              {stats.upcomingSessions.length > 0 ? stats.upcomingSessions.map(s => (
                <div key={s.id} className="min-w-[200px] p-4 rounded-xl bg-surface-raised border border-subtle hover:border-accent-glow/50 transition-all">
                  <p className="text-[10px] font-bold text-accent-glow uppercase tracking-widest mb-1">{s.date}</p>
                  <p className="text-sm font-bold text-primary line-clamp-1">{s.topic}</p>
                  <p className="text-[10px] text-tertiary mt-1 capitalize">{s.session_type} • {s.duration_hours}h</p>
                </div>
              )) : (
                <p className="text-sm text-tertiary italic">No upcoming sessions scheduled.</p>
              )}
            </div>
            <button onClick={() => navigate('/attendance')} className="btn-secondary whitespace-nowrap">View All</button>
          </div>
        </div>
        {/* Recent Session */}
        <div className="lg:col-span-2 card bg-surface-raised border-subtle p-8 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-primary">Latest Session Activity</h3>
            <span className="text-xs text-tertiary uppercase font-bold tracking-widest">{stats.recentSession?.date}</span>
          </div>
          
          {stats.recentSession ? (
            <div className="p-6 rounded-2xl bg-void border border-subtle flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-accent-glow font-bold uppercase tracking-widest">Current Topic</p>
                <h4 className="text-2xl font-bold text-primary">{stats.recentSession.topic}</h4>
                <p className="text-sm text-secondary">{stats.recentSession.notes}</p>
              </div>
              <div className="text-right">
                <button 
                  onClick={() => navigate('/attendance')}
                  className="btn-primary"
                >
                  Edit Attendance
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center border border-dashed border-subtle rounded-2xl">
              <p className="text-tertiary">No recent sessions found.</p>
            </div>
          )}
        </div>

        {/* Upcoming Assignments */}
        <div className="card bg-surface-raised border-subtle p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-primary">Upcoming Deadlines</h3>
            <span className="px-2 py-0.5 rounded bg-accent-glow/10 text-accent-glow text-[10px] font-bold uppercase">Assignments</span>
          </div>
          <div className="space-y-4">
            {upcomingAssignments.length > 0 ? upcomingAssignments.map(assignment => {
              const diffTime = new Date(assignment.due_date) - new Date();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              
              return (
                <div 
                  key={assignment.id} 
                  className="flex items-start gap-4 p-4 rounded-xl bg-surface-inset border border-subtle hover:border-accent-glow/30 transition-all cursor-pointer group"
                  onClick={() => navigate('/assignments')}
                >
                  <div className="mt-1">
                    <div className={`w-2 h-2 rounded-full ${diffDays <= 2 ? 'bg-rose-500 animate-pulse' : 'bg-accent-glow'}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-primary truncate">{assignment.title}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-tertiary">Due in {diffDays} days</p>
                      <p className="text-[10px] font-bold text-secondary">{new Date(assignment.due_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-10 opacity-40">
                <p className="text-sm italic text-tertiary">No upcoming assignments.</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => navigate('/assignments')}
            className="w-full text-center text-xs font-bold text-accent-glow hover:underline"
          >
            Manage All Assignments
          </button>
        </div>
      </div>
    </div>
  );
}
