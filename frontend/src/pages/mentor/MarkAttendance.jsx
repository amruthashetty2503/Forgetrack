import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, X, Save, Users, Calendar, Search, CheckCircle, AlertCircle, Plus, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function MarkAttendance() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendance, setAttendance] = useState({}); // { student_id: boolean }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    topic: '',
    date: new Date().toISOString().split('T')[0],
    duration_hours: 2,
    session_type: 'offline',
    notes: ''
  });
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedSession) {
      fetchAttendance(selectedSession.id);
    }
  }, [selectedSession]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // Fetch sessions
      const { data: sessionData, error: sessionError } = await supabase
        .from('sessions')
        .select('*')
        .order('date', { ascending: false });

      if (sessionError) throw sessionError;
      
      // Explicitly sort: Year DESC, Month DESC, Day DESC
      const sortedSessions = (sessionData || []).sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      });
      
      setSessions(sortedSessions);
      
      // Auto-select today's session or the most recent past one
      const todaySession = sessionData.find(s => s.date === today);
      if (todaySession) {
        setSelectedSession(todaySession);
      } else if (sessionData.length > 0) {
        // Since sessions are ordered DESC, the first one <= today is the most recent
        const recentPast = sessionData.find(s => s.date <= today);
        if (recentPast) {
          setSelectedSession(recentPast);
        } else {
          // If all sessions are in the future, pick the one closest to today (the last one in DESC order)
          setSelectedSession(sessionData[sessionData.length - 1]);
        }
      }

      // Fetch students
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select('*')
        .order('name');

      if (studentError) throw studentError;
      setStudents(studentData);
    } catch (err) {
      console.error('Error fetching initial data:', err);
      setMessage({ type: 'error', text: 'Failed to load students or sessions' });
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const sessionDate = new Date(formData.date);
      const year = sessionDate.getFullYear();
      const month = sessionDate.getMonth() + 1;
      const monthNumber = Math.max(1, ((year - 2025) * 12 + month - 8) + 1);

      const sessionData = {
        ...formData,
        month_number: monthNumber
      };

      if (editingId) {
        const { error } = await supabase
          .from('sessions')
          .update(sessionData)
          .eq('id', editingId);
        if (error) throw error;
        setMessage({ type: 'success', text: 'Session updated successfully!' });
      } else {
        const { error } = await supabase
          .from('sessions')
          .insert([sessionData]);
        if (error) throw error;
        setMessage({ type: 'success', text: 'New session scheduled!' });
      }
      
      setIsAdding(false);
      setEditingId(null);
      setFormData({
        topic: '',
        date: new Date().toISOString().split('T')[0],
        duration_hours: 2,
        session_type: 'offline',
        notes: ''
      });
      fetchInitialData();
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const deleteSession = async (id) => {
    if (!confirm('Are you sure? This will also delete attendance for this session!')) return;
    try {
      const { error } = await supabase.from('sessions').delete().eq('id', id);
      if (error) throw error;
      fetchInitialData();
    } catch (err) {
      setMessage({ type: 'error', text: 'Error deleting: ' + err.message });
    }
  };

  const deleteStudent = async (id, name) => {
    if (!confirm(`Are you sure you want to delete student "${name}"? This will also delete all their attendance records.`)) return;
    try {
      // 1. Check if student has a linked user account
      const { data: userLink } = await supabase.from('users').select('id').eq('student_id', id).single();
      if (userLink) {
         if (!confirm(`This student has a linked user account. Deleting the student will break their login link. Continue?`)) return;
         // Unlink user
         await supabase.from('users').update({ student_id: null }).eq('student_id', id);
      }

      // 2. Delete attendance
      const { error: attError } = await supabase.from('attendance').delete().eq('student_id', id);
      if (attError) throw attError;
      
      // 3. Delete student
      const { error: stuError } = await supabase.from('students').delete().eq('id', id);
      if (stuError) throw stuError;
      
      setMessage({ type: 'success', text: `Student ${name} deleted.` });
      fetchInitialData();
    } catch (err) {
      setMessage({ type: 'error', text: 'Error deleting: ' + err.message });
    }
  };

  const startEdit = (session) => {
    setEditingId(session.id);
    setFormData({
      topic: session.topic,
      date: session.date,
      duration_hours: session.duration_hours,
      session_type: session.session_type,
      notes: session.notes || ''
    });
    setIsAdding(true);
  };

  const fetchAttendance = async (sessionId) => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('student_id, present')
        .eq('session_id', sessionId);

      if (error) throw error;
      
      const attMap = {};
      data.forEach(item => {
        attMap[item.student_id] = item.present;
      });
      setAttendance(attMap);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    }
  };

  const toggleAttendance = (studentId) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const markAllPresent = () => {
    const newAtt = {};
    students.forEach(s => {
      newAtt[s.id] = true;
    });
    setAttendance(newAtt);
  };

  const saveAttendance = async () => {
    if (!selectedSession) return;
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const attendanceData = students.map(s => ({
        session_id: selectedSession.id,
        student_id: s.id,
        present: !!attendance[s.id],
        marked_by: user?.user_metadata?.display_name || 'Mentor'
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(attendanceData, { onConflict: 'student_id,session_id' });

      if (error) throw error;
      setMessage({ type: 'success', text: 'Attendance saved successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('Error saving attendance:', err);
      setMessage({ type: 'error', text: 'Failed to save attendance' });
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.usn.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const presentCount = students.filter(s => attendance[s.id]).length;

  if (loading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-glow"></div>
      </div>
    );
  }

  return (
    <div className="w-full p-4 sm:p-6 space-y-8 pb-20 overflow-x-hidden">
      {/* Session Management Section (Integrated) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-accent-glow">
              <Calendar size={20} />
              <span className="text-sm font-semibold tracking-wider uppercase">Mark Attendance</span>
            </div>
            <h2 className="text-2xl font-bold text-primary tracking-tight">Class Management</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <button 
              onClick={async () => {
                if (!confirm('This will delete all sessions named "Imported Session" or "Imported: ..." and ALL their attendance data. Continue?')) return;
                setSaving(true);
                try {
                  // 1. Get IDs of sessions to delete
                  const { data: toDelete, error: fetchError } = await supabase
                    .from('sessions')
                    .select('id')
                    .or('topic.eq.Imported Session,topic.ilike.Imported:%');
                  
                  if (fetchError) throw fetchError;
                  
                  if (toDelete && toDelete.length > 0) {
                    const ids = toDelete.map(s => s.id);
                    
                    // 2. Delete attendance records for these sessions
                    const { error: attError } = await supabase
                      .from('attendance')
                      .delete()
                      .in('session_id', ids);
                    
                    if (attError) throw attError;
                    
                    // 3. Delete the sessions
                    const { error: sessError } = await supabase
                      .from('sessions')
                      .delete()
                      .in('id', ids);
                    
                    if (sessError) throw sessError;
                    
                    setMessage({ type: 'success', text: `Cleaned up ${ids.length} sessions!` });
                  } else {
                    setMessage({ type: 'success', text: 'No imported sessions found to clean.' });
                  }
                  fetchInitialData();
                } catch (err) {
                  setMessage({ type: 'error', text: err.message });
                } finally {
                  setSaving(false);
                }
              }}
              className="btn-secondary text-rose-400 border-rose-500/20 hover:bg-rose-500/10"
              disabled={saving}
            >
              <Trash2 size={18} className="mr-2" />
              Cleanup Imported Sessions
            </button>
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="btn-primary"
            >
              {isAdding ? <X size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />}
              {isAdding ? 'Close Scheduler' : 'Schedule New Class'}
            </button>
          </div>
        </div>

        {/* Scheduling Form (Collapsible) */}
        {isAdding && (
          <div className="card bg-surface-raised border-accent-glow/30 p-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <h3 className="text-xl font-bold text-primary mb-6">{editingId ? 'Edit Session' : 'Schedule New Session'}</h3>
            <form onSubmit={handleScheduleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-label text-secondary">Session Topic</label>
                <input 
                  type="text" 
                  className="input" 
                  placeholder="e.g. Introduction to React Hooks"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-label text-secondary">Date</label>
                <input 
                  type="date" 
                  className="input" 
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-label text-secondary">Duration (Hours)</label>
                <input 
                  type="number" 
                  className="input" 
                  value={formData.duration_hours}
                  onChange={(e) => setFormData({ ...formData, duration_hours: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-label text-secondary">Session Type</label>
                <select 
                  className="input"
                  value={formData.session_type}
                  onChange={(e) => setFormData({ ...formData, session_type: e.target.value })}
                >
                  <option value="offline">Offline (Innovation Lab)</option>
                  <option value="online">Online (Zoom/Meet)</option>
                </select>
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsAdding(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary min-w-[140px]">
                  {saving ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" /> : (editingId ? 'Save Changes' : 'Schedule Class')}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-tertiary uppercase tracking-widest">Recently Scheduled</h4>
            <span className="text-[10px] text-tertiary font-medium">{sessions.length} sessions total</span>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
            {sessions.slice(0, 10).map((session) => {
              const sessionDate = new Date(session.date);
              const isSelected = selectedSession?.id === session.id;
              
              return (
                <div 
                  key={session.id} 
                  onClick={() => setSelectedSession(session)}
                  className={`flex-shrink-0 group relative card p-4 w-56 sm:w-64 cursor-pointer transition-all duration-300 border-subtle ${
                    isSelected 
                      ? 'border-accent-glow bg-accent-glow/5 shadow-[0_8px_32px_rgba(99,102,241,0.1)] ring-1 ring-accent-glow' 
                      : 'hover:border-secondary bg-surface'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center border transition-all ${
                      isSelected ? 'bg-accent-glow border-accent-glow text-white shadow-lg' : 'bg-surface-inset border-subtle text-tertiary group-hover:border-secondary group-hover:text-secondary'
                    }`}>
                      <span className="text-[7px] font-bold uppercase tracking-tighter">{sessionDate.toLocaleString('default', { month: 'short' })}</span>
                      <span className="text-sm font-black leading-none">{sessionDate.getDate()}</span>
                      <span className="text-[7px] font-bold opacity-60 mt-0.5">{sessionDate.getFullYear()}</span>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button onClick={(e) => { e.stopPropagation(); startEdit(session); }} className="p-1.5 rounded-md hover:bg-accent-glow/10 hover:text-accent-glow"><Edit2 size={14} /></button>
                      <button onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }} className="p-1.5 rounded-md hover:bg-rose-500/10 hover:text-rose-400"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <h5 className={`font-bold truncate text-sm transition-colors ${isSelected ? 'text-primary' : 'text-secondary'}`}>{session.topic}</h5>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter ${
                      session.session_type === 'online' ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {session.session_type}
                    </span>
                    <span className="text-[10px] text-tertiary font-medium">{session.duration_hours} hrs</span>
                  </div>
                </div>
              );
            })}
            {sessions.length === 0 && (
              <div className="w-full py-8 text-center bg-surface-inset rounded-2xl border border-dashed border-subtle">
                <p className="text-tertiary text-sm italic">No sessions scheduled yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="h-px bg-subtle" />

      {/* Attendance Marking Section */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-label text-secondary">Active Session</label>
              <select 
                className="input min-w-[280px] border-accent-glow/30"
                value={selectedSession?.id || ''}
                onChange={(e) => setSelectedSession(sessions.find(s => s.id === parseInt(e.target.value)))}
              >
                <option value="" disabled>-- Select Session to Mark Attendance --</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}: {s.topic}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-label text-secondary">Search Student</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
                <input 
                  type="text" 
                  placeholder="Name or USN..."
                  className="input pl-10 w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={markAllPresent} className="btn-secondary">
              <Users size={18} className="mr-2" />
              Mark All Present
            </button>
            <button 
              onClick={saveAttendance} 
              disabled={saving || !selectedSession}
              className="btn-primary"
            >
              {saving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white mr-2" />
              ) : (
                <Save size={18} className="mr-2" />
              )}
              Save Attendance
            </button>
          </div>
        </div>
      </div>

      {/* Stats & Messaging */}
      <div className="flex flex-col md:flex-row items-center justify-between p-4 bg-surface-inset rounded-xl border border-subtle gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-accent-glow shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
            <span className="text-sm text-secondary">Total: <span className="text-primary font-bold">{students.length}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            <span className="text-sm text-secondary">Present: <span className="text-emerald-400 font-bold">{presentCount}</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"></div>
            <span className="text-sm text-secondary">Absent: <span className="text-rose-400 font-bold">{students.length - presentCount}</span></span>
          </div>
        </div>

        {message.text && (
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium animate-in fade-in slide-in-from-right-4 ${
            message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}>
            {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {message.text}
          </div>
        )}
      </div>

      {/* Student Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {filteredStudents.map((student) => {
          const isPresent = !!attendance[student.id];
          return (
            <div 
              key={student.id}
              onClick={() => toggleAttendance(student.id)}
              className={`group cursor-pointer p-4 rounded-xl border transition-all duration-300 ${
                isPresent 
                  ? 'bg-emerald-500/5 border-emerald-500/30 shadow-[0_8px_32px_rgba(16,185,129,0.05)]' 
                  : 'bg-surface hover:bg-surface-raised border-subtle hover:border-strong'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm transition-colors ${
                  isPresent ? 'bg-emerald-500 text-white' : 'bg-surface-inset text-tertiary group-hover:text-secondary'
                }`}>
                  {student.name.charAt(0)}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteStudent(student.id, student.name); }}
                    className="p-1.5 rounded-md text-tertiary hover:bg-rose-500/10 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isPresent 
                      ? 'bg-emerald-500 text-white scale-110' 
                      : 'bg-surface-inset text-tertiary border border-subtle'
                  }`}>
                    {isPresent ? <Check size={14} /> : <X size={14} />}
                  </div>
                </div>
              </div>
              
              <div className="space-y-1 overflow-hidden">
                <h4 className={`font-semibold truncate transition-colors ${isPresent ? 'text-primary' : 'text-secondary'}`} title={student.name}>
                  {student.name}
                </h4>
                {student.usn && !student.usn.startsWith('TBD_') && (
                  <p className="text-[10px] font-mono text-tertiary tracking-wider uppercase truncate">
                    {student.usn}
                  </p>
                )}
                {student.email && (
                  <p className="text-[10px] text-tertiary truncate opacity-60" title={student.email}>
                    {student.email}
                  </p>
                )}
              </div>
              
              <div className="mt-4 pt-3 border-t border-subtle flex items-center justify-between">
                <span className={`text-[10px] font-bold tracking-widest uppercase ${isPresent ? 'text-emerald-400' : 'text-tertiary'}`}>
                  {isPresent ? 'Present' : 'Absent'}
                </span>
                <div className={`h-1 flex-1 mx-3 rounded-full overflow-hidden bg-surface-inset`}>
                  {isPresent && <div className="h-full bg-emerald-500 w-full animate-in slide-in-from-left duration-500" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-20 bg-surface-inset rounded-2xl border border-dashed border-subtle">
          <Users size={48} className="mx-auto text-tertiary mb-4 opacity-20" />
          <p className="text-secondary">No students found matching your search.</p>
        </div>
      )}
    </div>
  );
}
