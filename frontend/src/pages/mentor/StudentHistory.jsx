import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Search, TrendingUp, TrendingDown, Users, Download, Filter } from 'lucide-react';

export default function StudentHistory() {
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState({}); // { student_id: { total, attended } }
  const [sessionCount, setSessionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // all, above85, 75to85, below75

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch all students
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .order('name');
      
      if (studentError) throw studentError;

      // 2. Fetch total sessions count
      const { count, error: sessionError } = await supabase
        .from('sessions')
        .select('*', { count: 'exact', head: true });
      
      if (sessionError) throw sessionError;
      setSessionCount(count || 0);

      // 3. Fetch all attendance records (with pagination to bypass 1000 row limit)
      let allAttendance = [];
      let lastId = 0;
      let hasMore = true;
      
      while (hasMore) {
        const { data, error } = await supabase
          .from('attendance')
          .select('id, student_id, present')
          .gt('id', lastId)
          .order('id')
          .limit(1000);
          
        if (error) throw error;
        if (data.length === 0) {
          hasMore = false;
        } else {
          allAttendance = [...allAttendance, ...data];
          lastId = data[data.length - 1].id;
          if (data.length < 1000) hasMore = false;
        }
      }

      // 4. Calculate stats
      const statsMap = {};
      studentData.forEach(s => {
        statsMap[s.id] = { total: count || 0, attended: 0 };
      });

      allAttendance.forEach(record => {
        if (statsMap[record.student_id] && record.present) {
          statsMap[record.student_id].attended += 1;
        }
      });

      setStudents(studentData);
      setStats(statsMap);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPercentage = (studentId) => {
    const s = stats[studentId];
    if (!s || s.total === 0) return 0;
    return Math.round((s.attended / s.total) * 100);
  };

  const getStatusColor = (percentage) => {
    if (percentage >= 85) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (percentage >= 75) return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (s.usn && s.usn.toLowerCase().includes(searchTerm.toLowerCase()));
    if (!matchesSearch) return false;
    
    const percentage = getPercentage(s.id);
    if (activeFilter === 'above85') return percentage >= 85;
    if (activeFilter === '75to85') return percentage >= 75 && percentage < 85;
    if (activeFilter === 'below75') return percentage < 75;
    return true;
  });

  const avgAttendance = students.length > 0 
    ? Math.round(students.reduce((acc, s) => acc + getPercentage(s.id), 0) / students.length) 
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-glow"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-accent-glow">
            <TrendingUp size={20} />
            <span className="text-sm font-semibold tracking-wider uppercase">Analytics</span>
          </div>
          <h2 className="text-display-sm text-primary">Student History</h2>
          <p className="text-body text-secondary">Track long-term attendance and engagement across all sessions.</p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
            <input 
              type="text" 
              placeholder="Search USN or Name..."
              className="input pl-10 w-64 h-11"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className="btn-secondary h-11">
            <Download size={18} className="mr-2" />
            Export
          </button>
        </div>
      </div>
    </div>

    {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-surface-raised border-subtle p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent-glow/10 flex items-center justify-center text-accent-glow">
            <Users size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-tertiary uppercase tracking-widest">Total Students</p>
            <p className="text-2xl font-bold text-primary">{students.length}</p>
          </div>
        </div>
        <div className="card bg-surface-raised border-subtle p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-tertiary uppercase tracking-widest">Avg Attendance</p>
            <p className="text-2xl font-bold text-primary">{avgAttendance}%</p>
          </div>
        </div>
        <div className="card bg-surface-raised border-subtle p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
            <TrendingDown size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-tertiary uppercase tracking-widest">Low Attendance</p>
            <p className="text-2xl font-bold text-primary">
              {students.filter(s => getPercentage(s.id) < 75).length} Students
            </p>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex bg-surface-inset p-1 rounded-xl border border-subtle">
            {[
              { id: 'all', label: 'All' },
              { id: 'above85', label: '> 85%' },
              { id: '75to85', label: '75-85%' },
              { id: 'below75', label: '< 75%' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === f.id 
                    ? 'bg-accent-glow text-white shadow-lg' 
                    : 'text-tertiary hover:text-secondary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <span className="text-micro text-tertiary uppercase tracking-widest">
            Showing {filteredStudents.length} of {students.length} students
          </span>
        </div>

        <div className="card border-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-inset border-b border-subtle">
                <th className="px-6 py-4 text-xs font-bold text-tertiary uppercase tracking-widest">Student Info</th>
                <th className="px-6 py-4 text-xs font-bold text-tertiary uppercase tracking-widest text-center">Sessions</th>
                <th className="px-6 py-4 text-xs font-bold text-tertiary uppercase tracking-widest text-center">Attended</th>
                <th className="px-6 py-4 text-xs font-bold text-tertiary uppercase tracking-widest">Percentage</th>
                <th className="px-6 py-4 text-xs font-bold text-tertiary uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {filteredStudents.map((student) => {
                const percentage = getPercentage(student.id);
                const s = stats[student.id];
                return (
                  <tr key={student.id} className="hover:bg-surface-raised/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-surface-inset border border-subtle flex items-center justify-center text-secondary font-bold group-hover:border-accent-glow transition-colors">
                          {student.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-primary">{student.name}</p>
                          {student.usn && !student.usn.startsWith('TBD_') && (
                            <p className="text-xs text-tertiary font-mono uppercase tracking-wider">{student.usn}</p>
                          )}
                          {student.email && (
                            <p className="text-[10px] text-tertiary opacity-60">{student.email}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center text-sm text-secondary font-medium">
                      {s?.total || 0}
                    </td>
                    <td className="px-6 py-5 text-center text-sm text-secondary font-medium">
                      {s?.attended || 0}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-surface-inset rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${
                              percentage >= 85 ? 'bg-emerald-500' : percentage >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-primary min-w-[3ch]">{percentage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase border ${getStatusColor(percentage)}`}>
                        {percentage >= 85 ? 'Excellent' : percentage >= 75 ? 'Warning' : 'Critical'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {filteredStudents.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-secondary">No students found.</p>
          </div>
        )}
      </div>
    </div>
  </div>
);
}
