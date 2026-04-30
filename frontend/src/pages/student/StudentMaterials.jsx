import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Video, Link as LinkIcon, BookOpen, ExternalLink, Search } from 'lucide-react';

export default function StudentMaterials() {
  const [materials, setMaterials] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.from('sessions').select('*').order('date', { ascending: false });
      const { data: materialData } = await supabase.from('materials').select('*, sessions(topic, date)');
      
      setSessions(sessionData || []);
      setMaterials(materialData || []);
    } catch (err) {
      console.error('Error fetching materials:', err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'slides': return <FileText size={20} className="text-blue-400" />;
      case 'recording': return <Video size={20} className="text-rose-400" />;
      default: return <LinkIcon size={20} className="text-emerald-400" />;
    }
  };

  const filteredSessions = sessions.filter(s => {
    const sessionMaterials = materials.filter(m => m.session_id === s.id);
    return s.topic.toLowerCase().includes(searchTerm.toLowerCase()) || 
           sessionMaterials.some(m => m.title.toLowerCase().includes(searchTerm.toLowerCase()));
  });

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
            <BookOpen size={20} />
            <span className="text-sm font-semibold tracking-wider uppercase">Learning Center</span>
          </div>
          <h2 className="text-display-sm text-primary">Class Materials</h2>
          <p className="text-body text-secondary">Access slides, recordings, and shared notes from your sessions.</p>
        </div>

        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary" />
          <input 
            type="text" 
            placeholder="Search topic or title..."
            className="input pl-10 w-64 h-11"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-12">
        {filteredSessions.map(session => {
          const sessionMaterials = materials.filter(m => m.session_id === session.id);
          if (sessionMaterials.length === 0) return null;
          
          return (
            <div key={session.id} className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="px-3 py-1 rounded bg-surface-inset border border-subtle text-[10px] font-bold text-tertiary uppercase tracking-widest">
                  {session.date}
                </div>
                <h3 className="text-xl font-bold text-primary">{session.topic}</h3>
                <div className="flex-1 h-px bg-gradient-to-r from-subtle to-transparent"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sessionMaterials.map(material => (
                  <div key={material.id} className="card bg-surface-raised border-subtle hover:border-accent-glow/50 p-5 transition-all hover:translate-y-[-4px] duration-300">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 rounded-xl bg-void border border-subtle">
                        {getIcon(material.type)}
                      </div>
                      <div>
                        <h4 className="font-bold text-primary">{material.title}</h4>
                        <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest">{material.type}</span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-secondary mb-6 min-h-[3em]">
                      {material.description || 'No description provided.'}
                    </p>

                    <a 
                      href={material.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                      Access Material
                      <ExternalLink size={16} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {filteredSessions.every(s => materials.filter(m => m.session_id === s.id).length === 0) && (
        <div className="text-center py-20 bg-surface-inset rounded-3xl border border-dashed border-subtle">
          <BookOpen size={48} className="mx-auto text-tertiary mb-4 opacity-10" />
          <p className="text-secondary">No materials have been uploaded yet.</p>
        </div>
      )}
    </div>
  );
}
