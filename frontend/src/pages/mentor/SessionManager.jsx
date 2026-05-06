import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Calendar, Plus, Edit2, Trash2, Clock, MapPin, CheckCircle, ArrowLeft } from 'lucide-react';

export default function SessionManager() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    topic: '',
    date: new Date().toISOString().split('T')[0],
    duration_hours: 2,
    session_type: 'offline',
    notes: ''
  });
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      setSessions(data || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Calculate month_number relative to August 2025 (Program Month)
      const sessionDate = new Date(formData.date);
      const year = sessionDate.getFullYear();
      const month = sessionDate.getMonth() + 1; // 1-12
      const monthNumber = ((year - 2025) * 12 + month - 8) + 1;

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
      } else {
        const { error } = await supabase
          .from('sessions')
          .insert([sessionData]);
        if (error) throw error;
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
      fetchSessions();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteSession = async (id) => {
    if (!confirm('Are you sure? This will also delete attendance for this session!')) return;
    try {
      const { error } = await supabase.from('sessions').delete().eq('id', id);
      if (error) throw error;
      fetchSessions();
    } catch (err) {
      alert('Error deleting: ' + err.message);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth, year, month };
  };

  const { firstDay, daysInMonth, year, month } = getDaysInMonth(currentMonth);
  const occupiedDates = new Set(sessions.map(s => s.date));

  const calendarDays = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  if (loading && !isAdding && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-glow"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-accent-glow">
            <Calendar size={20} />
            <span className="text-sm font-semibold tracking-wider uppercase">Planning</span>
          </div>
          <h2 className="text-display-sm text-primary">Schedule Manager</h2>
          <p className="text-body text-secondary">Create and manage your training sessions.</p>
        </div>

        <button 
          onClick={() => { setIsAdding(!isAdding); setEditingId(null); }}
          className="btn-primary"
        >
          {isAdding ? <ArrowLeft size={18} className="mr-2" /> : <Plus size={18} className="mr-2" />}
          {isAdding ? 'Back to List' : 'Schedule New Class'}
        </button>
      </div>

      {isAdding && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 card bg-surface-raised border-accent-glow/30 p-8 animate-in fade-in zoom-in-95 duration-300 h-fit">
            <h3 className="text-xl font-bold text-primary mb-6">{editingId ? 'Edit Session' : 'New Session Details'}</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-label text-secondary">Additional Notes</label>
                <textarea 
                  className="input h-24 py-3" 
                  placeholder="Pre-requisites, room number, or meeting link..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsAdding(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary min-w-[140px]">
                  {loading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" /> : (editingId ? 'Save Changes' : 'Schedule Class')}
                </button>
              </div>
            </form>
          </div>

          <div className="card bg-surface p-6 space-y-6 h-fit border-subtle">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-primary">Pick a Date</h4>
              <div className="flex gap-1">
                <button onClick={() => setCurrentMonth(new Date(year, month - 1))} className="p-1 hover:bg-surface-inset rounded">
                  <ArrowLeft size={14} />
                </button>
                <button onClick={() => setCurrentMonth(new Date(year, month + 1))} className="p-1 hover:bg-surface-inset rounded rotate-180">
                  <ArrowLeft size={14} />
                </button>
              </div>
            </div>
            
            <p className="text-xs font-bold text-accent-glow uppercase tracking-widest text-center">
              {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </p>

            <div className="grid grid-cols-7 gap-1 text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                <span key={d} className="text-[10px] font-bold text-tertiary py-1">{d}</span>
              ))}
              {calendarDays.map((d, i) => {
                if (!d) return <div key={i} />;
                const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const isOccupied = occupiedDates.has(dStr);
                const isSelected = formData.date === dStr;
                
                return (
                  <button
                    key={i}
                    onClick={() => setFormData({ ...formData, date: dStr })}
                    className={`aspect-square rounded-lg text-xs font-medium flex flex-col items-center justify-center relative transition-all ${
                      isSelected 
                        ? 'bg-accent-glow text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]' 
                        : isOccupied 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'hover:bg-surface-inset text-secondary'
                    }`}
                  >
                    {d}
                    {isOccupied && !isSelected && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-emerald-500" />}
                  </button>
                );
              })}
            </div>

            <div className="pt-4 space-y-2">
              <div className="flex items-center gap-2 text-[10px] text-tertiary">
                <div className="w-2 h-2 rounded bg-emerald-500/20 border border-emerald-500/50" />
                <span>Existing Session</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-tertiary">
                <div className="w-2 h-2 rounded bg-accent-glow" />
                <span>Selected Date</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isAdding && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((session) => (
            <div key={session.id} className="group card bg-surface-raised border-subtle hover:border-accent-glow/50 p-5 transition-all">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-void border border-subtle flex flex-col items-center justify-center group-hover:bg-accent-glow group-hover:text-white transition-all">
                    <span className="text-[10px] font-bold uppercase">{new Date(session.date).toLocaleString('default', { month: 'short' })}</span>
                    <span className="text-xl font-bold">{new Date(session.date).getDate()}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-primary line-clamp-1">{session.topic}</h4>
                    <div className="flex items-center gap-2 text-xs text-tertiary">
                      <Clock size={12} />
                      <span>{session.duration_hours}h</span>
                      <span className="mx-1">•</span>
                      <MapPin size={12} />
                      <span className="capitalize">{session.session_type}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => startEdit(session)} className="p-2 rounded-lg text-tertiary hover:text-accent-glow hover:bg-accent-glow/10 transition-all">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => deleteSession(session.id)} className="p-2 rounded-lg text-tertiary hover:text-rose-400 hover:bg-rose-500/10 transition-all">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              {session.notes && (
                <div className="mt-2 p-3 bg-void rounded-lg text-xs text-secondary border border-subtle italic">
                  "{session.notes}"
                </div>
              )}
            </div>
          ))}
          
          {sessions.length === 0 && (
            <div className="md:col-span-2 py-20 text-center border border-dashed border-subtle rounded-3xl">
              <p className="text-tertiary">No sessions scheduled yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
