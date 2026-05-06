import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Check, X, Save, Users, Calendar, Search, CheckCircle, AlertCircle } from 'lucide-react';

export default function MarkAttendance() {
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendance, setAttendance] = useState({}); // { student_id: boolean }
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [newTopic, setNewTopic] = useState('');
  const [creatingSession, setCreatingSession] = useState(false);
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
      setSessions(sessionData);
      
      // Auto-select today's session or the most recent one
      const todaySession = sessionData.find(s => s.date === today);
      if (todaySession) {
        setSelectedSession(todaySession);
      } else if (sessionData.length > 0) {
        setSelectedSession(sessionData[0]);
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

  const createTodaySession = async () => {
    if (!newTopic.trim()) {
      setMessage({ type: 'error', text: 'Please enter a topic for today' });
      return;
    }

    setCreatingSession(true);
    try {
      // Calculate month_number
      const sessionDate = new Date(today);
      const year = sessionDate.getFullYear();
      const month = sessionDate.getMonth() + 1;
      const monthNumber = ((year - 2025) * 12 + month - 8) + 1;

      const { data, error } = await supabase
        .from('sessions')
        .insert([{
          date: today,
          topic: newTopic,
          month_number: monthNumber,
          duration_hours: 2,
          session_type: 'offline'
        }])
        .select();

      if (error) throw error;

      const newSession = data[0];
      setSessions([newSession, ...sessions]);
      setSelectedSession(newSession);
      setNewTopic('');
      setMessage({ type: 'success', text: 'Session created for today!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      console.error('Error creating session:', err);
      setMessage({ type: 'error', text: err.message.includes('unique constraint') ? 'A session already exists for today.' : 'Failed to create session' });
    } finally {
      setCreatingSession(false);
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
        marked_by: 'Nischay'
      }));

      const { error } = await supabase
        .from('attendance')
        .upsert(attendanceData, { onConflict: 'student_id,session_id' });

      if (error) throw error;
      setMessage({ type: 'success', text: 'Attendance saved successfully!' });
      
      // Clear success message after 3 seconds
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-glow"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header & Session Selector */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-accent-glow">
            <Calendar size={20} />
            <span className="text-sm font-semibold tracking-wider uppercase">Session Management</span>
          </div>
          <h2 className="text-display-sm text-primary">Mark Attendance</h2>
          
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-label text-secondary">Select Session</label>
              <select 
                className="input min-w-[280px]"
                value={selectedSession?.id || ''}
                onChange={(e) => setSelectedSession(sessions.find(s => s.id === parseInt(e.target.value)))}
              >
                {!sessions.find(s => s.date === today) && (
                  <option value="" disabled>-- Create today's session first --</option>
                )}
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.date === today ? '🌟 TODAY: ' : ''}{s.date}: {s.topic}
                  </option>
                ))}
              </select>
            </div>

            {(!selectedSession || selectedSession.date !== today) && !sessions.find(s => s.date === today) && (
              <div className="flex gap-2 animate-in slide-in-from-left duration-500">
                <div className="space-y-1.5">
                  <label className="text-label text-accent-glow">Today's Subject</label>
                  <input 
                    type="text" 
                    placeholder="Enter topic for today..."
                    className="input w-64 border-accent-glow/50"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                  />
                </div>
                <button 
                  onClick={createTodaySession}
                  disabled={creatingSession}
                  className="btn-primary h-[42px] mt-auto"
                >
                  {creatingSession ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
                  ) : 'Start Today'}
                </button>
              </div>
            )}
            
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
        </div>

        <div className="flex gap-3">
          <button onClick={markAllPresent} className="btn-secondary">
            <Users size={18} className="mr-2" />
            Mark All Present
          </button>
          <button 
            onClick={saveAttendance} 
            disabled={saving}
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isPresent 
                    ? 'bg-emerald-500 text-white scale-110' 
                    : 'bg-surface-inset text-tertiary border border-subtle'
                }`}>
                  {isPresent ? <Check size={14} /> : <X size={14} />}
                </div>
              </div>
              
              <div className="space-y-1">
                <h4 className={`font-semibold transition-colors ${isPresent ? 'text-primary' : 'text-secondary'}`}>
                  {student.name}
                </h4>
                <p className="text-xs font-mono text-tertiary tracking-wider uppercase">
                  {student.usn}
                </p>
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
