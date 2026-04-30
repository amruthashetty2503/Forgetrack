import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Users, Calendar, AlertTriangle, TrendingUp, ArrowRight, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    avgAttendance: 0,
    atRiskCount: 0,
    recentSession: null
  });
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

      setStats({
        totalStudents: studentCount || 0,
        avgAttendance: avg,
        atRiskCount: atRisk,
        recentSession: sessions?.[0] || null
      });
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
      <div className="space-y-2">
        <h2 className="text-display-sm text-primary">ForgeTrack Intelligence</h2>
        <p className="text-body text-secondary">A birds-eye view of your cohort's performance and engagement.</p>
      </div>

      {/* Primary Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        <div className="card bg-surface-raised border-subtle p-6 hover:border-rose-500/30 transition-all">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
              <AlertTriangle size={20} />
            </div>
            <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest">At Risk</span>
          </div>
          <p className="text-3xl font-bold text-primary">{stats.atRiskCount}</p>
          <p className="text-xs text-tertiary mt-1">Below 75% threshold</p>
        </div>

        <div className="card bg-surface-raised border-accent-glow/20 p-6 shadow-[0_8px_32px_rgba(99,102,241,0.1)]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent-glow flex items-center justify-center text-white">
              <Calendar size={20} />
            </div>
            <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest">Next Step</span>
          </div>
          <button 
            onClick={() => navigate('/attendance')}
            className="flex items-center gap-2 text-sm font-bold text-primary hover:text-accent-glow transition-colors"
          >
            Mark Attendance <ArrowRight size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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

        {/* Quick Actions */}
        <div className="card bg-surface-raised border-subtle p-8 space-y-6">
          <h3 className="text-lg font-bold text-primary">Priority Tasks</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-surface-inset border border-subtle hover:border-accent-glow/30 transition-all cursor-pointer group" onClick={() => navigate('/upload')}>
              <div className="mt-1">
                <div className="w-2 h-2 rounded-full bg-accent-glow group-hover:scale-150 transition-all" />
              </div>
              <div>
                <p className="text-sm font-bold text-primary">Import Batch Data</p>
                <p className="text-xs text-tertiary">New CSV records available for Month 6.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl bg-surface-inset border border-subtle hover:border-emerald-500/30 transition-all cursor-pointer group" onClick={() => navigate('/history')}>
              <div className="mt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-primary">Check Low Attendance</p>
                <p className="text-xs text-tertiary">{stats.atRiskCount} students need intervention.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl bg-surface-inset border border-subtle hover:border-amber-500/30 transition-all cursor-pointer group" onClick={() => navigate('/materials')}>
              <div className="mt-1">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
              </div>
              <div>
                <p className="text-sm font-bold text-primary">Upload Session 12 Slides</p>
                <p className="text-xs text-tertiary">Students are waiting for resources.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
