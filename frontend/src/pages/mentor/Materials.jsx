import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Video, Link as LinkIcon, Plus, ExternalLink, BookOpen, Trash2, Calendar } from 'lucide-react';

export default function Materials() {
  const [sessions, setSessions] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [uploadType, setUploadType] = useState('link'); // 'link' or 'file'
  const [selectedFile, setSelectedFile] = useState(null);
  const [newMaterial, setNewMaterial] = useState({
    session_id: '',
    title: '',
    type: 'slides',
    url: '',
    description: ''
  });

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
      if (sessionData?.length > 0) {
        setNewMaterial(prev => ({ ...prev, session_id: sessionData[0].id }));
      }
    } catch (err) {
      console.error('Error fetching materials:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let finalUrl = newMaterial.url;

      if (uploadType === 'file' && selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('materials')
          .upload(filePath, selectedFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('materials')
          .getPublicUrl(filePath);
        
        finalUrl = publicUrl;
      }

      if (editingId) {
        const { error } = await supabase.from('materials')
          .update({ ...newMaterial, url: finalUrl })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('materials').insert([{
          ...newMaterial,
          url: finalUrl
        }]);
        if (error) throw error;
      }
      
      setIsAdding(false);
      setEditingId(null);
      setSelectedFile(null);
      setNewMaterial({ ...newMaterial, title: '', url: '', description: '' });
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (material) => {
    setEditingId(material.id);
    setNewMaterial({
      session_id: material.session_id,
      title: material.title,
      type: material.type,
      url: material.url,
      description: material.description || ''
    });
    setUploadType('link');
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteMaterial = async (id) => {
    if (!confirm('Are you sure you want to delete this material?')) return;
    try {
      const { error } = await supabase.from('materials').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (err) {
      alert('Error deleting: ' + err.message);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'slides': return <FileText size={20} className="text-blue-400" />;
      case 'recording': return <Video size={20} className="text-rose-400" />;
      default: return <LinkIcon size={20} className="text-emerald-400" />;
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
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-accent-glow">
            <BookOpen size={20} />
            <span className="text-sm font-semibold tracking-wider uppercase">Resources</span>
          </div>
          <h2 className="text-display-sm text-primary">Class Materials</h2>
          <p className="text-body text-secondary">Manage slides, recordings, and references for all sessions.</p>
        </div>

        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="btn-primary"
        >
          <Plus size={18} className="mr-2" />
          Add New Material
        </button>
      </div>

      {isAdding && (
        <div className="card bg-surface-raised border-accent-glow/30 p-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-primary">New Resource</h3>
            <div className="flex bg-surface-inset p-1 rounded-lg">
              <button 
                onClick={() => setUploadType('link')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${uploadType === 'link' ? 'bg-surface text-accent-glow shadow-sm' : 'text-tertiary'}`}
              >
                Link
              </button>
              <button 
                onClick={() => setUploadType('file')}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${uploadType === 'file' ? 'bg-surface text-accent-glow shadow-sm' : 'text-tertiary'}`}
              >
                Upload File
              </button>
            </div>
          </div>

          <form onSubmit={handleAddMaterial} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <label className="text-label text-secondary">Target Session</label>
              <select 
                className="input"
                value={newMaterial.session_id}
                onChange={(e) => setNewMaterial({ ...newMaterial, session_id: e.target.value })}
                required
              >
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>{s.date} - {s.topic}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-label text-secondary">Title</label>
              <input 
                type="text" 
                className="input" 
                placeholder="e.g. Session 04 Slides"
                value={newMaterial.title}
                onChange={(e) => setNewMaterial({ ...newMaterial, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-label text-secondary">Type</label>
              <select 
                className="input"
                value={newMaterial.type}
                onChange={(e) => setNewMaterial({ ...newMaterial, type: e.target.value })}
              >
                <option value="slides">Slides</option>
                <option value="recording">Recording</option>
                <option value="notes">Notes/Link</option>
              </select>
            </div>

            <div className="space-y-1.5 md:col-span-3">
              {uploadType === 'link' ? (
                <>
                  <label className="text-label text-secondary">Resource URL</label>
                  <input 
                    type="url" 
                    className="input" 
                    placeholder="https://drive.google.com/..."
                    value={newMaterial.url}
                    onChange={(e) => setNewMaterial({ ...newMaterial, url: e.target.value })}
                    required={uploadType === 'link'}
                  />
                </>
              ) : (
                <>
                  <label className="text-label text-secondary">Select File</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="file" 
                      id="file-upload"
                      className="hidden"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                    />
                    <label 
                      htmlFor="file-upload" 
                      className="flex-1 input flex items-center justify-center cursor-pointer hover:border-accent-glow/50 transition-colors border-dashed"
                    >
                      {selectedFile ? selectedFile.name : 'Click to select or drag and drop...'}
                    </label>
                  </div>
                </>
              )}
            </div>
            <div className="space-y-1.5 md:col-span-3">
              <label className="text-label text-secondary">Description (Optional)</label>
              <textarea 
                className="input h-20 py-3" 
                placeholder="Brief summary of what's inside..."
                value={newMaterial.description}
                onChange={(e) => setNewMaterial({ ...newMaterial, description: e.target.value })}
              />
            </div>
            <div className="md:col-span-3 flex justify-end gap-3">
              <button type="button" onClick={() => setIsAdding(false)} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary">Create Resource</button>
            </div>
          </form>
        </div>
      )}

      {/* Grouped Materials by Session */}
      <div className="space-y-12">
        {sessions.map(session => {
          const sessionMaterials = materials.filter(m => m.session_id === session.id);
          if (sessionMaterials.length === 0 && !isAdding) return null;
          
          return (
            <div key={session.id} className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="px-3 py-1 rounded bg-surface-inset border border-subtle text-[10px] font-bold text-tertiary uppercase tracking-widest">
                  {session.date}
                </div>
                <h3 className="text-lg font-bold text-primary">{session.topic}</h3>
                <div className="flex-1 h-px bg-gradient-to-r from-subtle to-transparent"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessionMaterials.map(material => (
                  <div key={material.id} className="group card bg-surface-raised border-subtle hover:border-accent-glow/50 p-4 transition-all hover:shadow-[0_8px_32px_rgba(99,102,241,0.05)]">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2.5 rounded-lg bg-void border border-subtle">
                        {getIcon(material.type)}
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => startEdit(material)}
                          className="p-1.5 rounded-md text-tertiary hover:text-accent-glow hover:bg-accent-glow/10 transition-colors"
                          title="Edit Resource"
                        >
                          <Plus size={16} className="rotate-45" /> {/* Using Plus rotated as a small edit icon or I could use Edit icon */}
                        </button>
                        <button 
                          onClick={() => deleteMaterial(material.id)}
                          className="p-1.5 rounded-md text-tertiary hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete Resource"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-1 mb-4">
                      <h4 className="font-semibold text-primary">{material.title}</h4>
                      <p className="text-xs text-tertiary line-clamp-2 min-h-[2.5em]">
                        {material.description || 'No description provided.'}
                      </p>
                    </div>

                    <a 
                      href={material.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-surface-inset border border-subtle text-sm font-medium text-secondary hover:text-primary hover:border-strong transition-all"
                    >
                      View Resource
                      <ExternalLink size={14} />
                    </a>
                  </div>
                ))}
                
                {sessionMaterials.length === 0 && (
                  <div className="md:col-span-3 py-8 text-center border border-dashed border-subtle rounded-xl">
                    <p className="text-tertiary text-sm">No materials added for this session yet.</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
