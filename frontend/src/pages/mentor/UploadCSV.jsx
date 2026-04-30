import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import Papa from 'papaparse';
import { Upload, FileType, CheckCircle, AlertCircle, ArrowRight, Loader2, Table } from 'lucide-react';

export default function UploadCSV() {
  const [step, setStep] = useState(1); // 1: Select, 2: Map, 3: Import
  const [fileData, setFileData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({ usn: '', name: '' });
  const [dateColumns, setDateColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, imported: 0, failed: 0 });

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setFileData(results.data);
        const cols = Object.keys(results.data[0] || {});
        setHeaders(cols);
        
        // Try to auto-map
        const usnCol = cols.find(c => c.toLowerCase().includes('usn'));
        const nameCol = cols.find(c => c.toLowerCase().includes('name'));
        setMapping({ usn: usnCol || '', name: nameCol || '' });
        
        // Find date columns (roughly)
        const dateCols = cols.filter(c => /\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}/.test(c) || c.toLowerCase().includes('date'));
        setDateColumns(dateCols);
        
        setStep(2);
        setLoading(false);
      },
      error: (err) => {
        alert('Failed to parse CSV: ' + err.message);
        setLoading(false);
      }
    });
  };

  const startImport = async () => {
    setLoading(true);
    let imported = 0;
    let failed = 0;

    try {
      // 1. Get all students to map IDs
      const { data: students } = await supabase.from('students').select('id, usn');
      const usnToId = {};
      students.forEach(s => usnToId[s.usn.toUpperCase()] = s.id);

      // 2. Process each row
      for (const row of fileData) {
        const usn = row[mapping.usn]?.toString()?.trim()?.toUpperCase();
        const studentId = usnToId[usn];

        if (!studentId) {
          failed++;
          continue;
        }

        // 3. Process each date column
        for (const dateCol of dateColumns) {
          const present = row[dateCol]?.toString()?.trim()?.toLowerCase() === 'p' || 
                          row[dateCol]?.toString()?.trim() === '1' ||
                          row[dateCol]?.toString()?.trim()?.toLowerCase() === 'present';
          
          if (present) {
            // Find or create session for this date
            // For the demo, we'll just insert into attendance directly 
            // assuming sessions exist or skip if they don't
            const { data: session } = await supabase
              .from('sessions')
              .select('id')
              .eq('date', dateCol) // This assumes the column header IS the date YYYY-MM-DD
              .single();

            if (session) {
              await supabase.from('attendance').upsert({
                student_id: studentId,
                session_id: session.id,
                present: true,
                marked_by: 'CSV Import'
              }, { onConflict: 'student_id,session_id' });
              imported++;
            }
          }
        }
      }

      setStats({ total: fileData.length, imported, failed });
      setStep(3);
    } catch (err) {
      alert('Import failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-accent-glow">
          <Upload size={20} />
          <span className="text-sm font-semibold tracking-wider uppercase">Data Management</span>
        </div>
        <h2 className="text-display-sm text-primary">Bulk Import Attendance</h2>
        <p className="text-body text-secondary">Upload an Excel/CSV file to sync attendance for multiple students and dates.</p>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between px-8 py-4 bg-surface-inset rounded-2xl border border-subtle">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <div className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${
                step >= s ? 'bg-accent-glow text-white' : 'bg-surface border border-subtle text-tertiary'
              }`}>
                {step > s ? <CheckCircle size={20} /> : s}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${step >= s ? 'text-primary' : 'text-tertiary'}`}>
                {s === 1 ? 'Select' : s === 2 ? 'Map' : 'Result'}
              </span>
            </div>
            {s < 3 && <div className={`flex-1 h-px mx-4 ${step > s ? 'bg-accent-glow' : 'bg-subtle'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1: Select File */}
      {step === 1 && (
        <div className="group relative border-2 border-dashed border-subtle hover:border-accent-glow/50 rounded-3xl p-20 transition-all cursor-pointer bg-surface/50">
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleFileUpload}
            className="absolute inset-0 opacity-0 cursor-pointer z-10"
          />
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-surface-raised flex items-center justify-center text-tertiary group-hover:text-accent-glow group-hover:scale-110 transition-all duration-500">
              <FileType size={32} />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-primary">Choose CSV File</p>
              <p className="text-sm text-tertiary">Drag and drop your attendance sheet here</p>
            </div>
            <div className="px-6 py-2 rounded-full bg-surface-raised border border-subtle text-xs font-bold text-secondary uppercase tracking-widest group-hover:bg-accent-glow group-hover:text-white transition-all">
              Browse Files
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Map Columns */}
      {step === 2 && (
        <div className="card border-subtle p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-tertiary uppercase tracking-widest flex items-center gap-2">
                <Table size={16} /> Column Mapping
              </h3>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-secondary">Student USN Column</label>
                  <select 
                    className="input"
                    value={mapping.usn}
                    onChange={(e) => setMapping({ ...mapping, usn: e.target.value })}
                  >
                    <option value="">Select column...</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-secondary">Student Name Column</label>
                  <select 
                    className="input"
                    value={mapping.name}
                    onChange={(e) => setMapping({ ...mapping, name: e.target.value })}
                  >
                    <option value="">Select column...</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-tertiary uppercase tracking-widest flex items-center gap-2">
                <Calendar size={16} /> Date Columns
              </h3>
              <div className="p-4 bg-surface-inset rounded-xl border border-subtle min-h-[120px] max-h-[200px] overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {headers.map(h => (
                    <button 
                      key={h}
                      onClick={() => setDateColumns(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h])}
                      className={`px-3 py-1 rounded-md text-xs font-medium border transition-all ${
                        dateColumns.includes(h) ? 'bg-accent-glow border-accent-glow text-white' : 'bg-surface border-subtle text-tertiary hover:text-secondary'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-tertiary italic">Selected columns will be treated as session dates.</p>
            </div>
          </div>

          <div className="pt-6 border-t border-subtle flex justify-between items-center">
            <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
            <button 
              onClick={startImport} 
              disabled={loading || !mapping.usn || dateColumns.length === 0}
              className="btn-primary"
            >
              {loading ? <Loader2 className="animate-spin mr-2" size={18} /> : <ArrowRight className="mr-2" size={18} />}
              Start Import ({fileData.length} rows)
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Result */}
      {step === 3 && (
        <div className="card border-subtle p-12 text-center space-y-8 animate-in zoom-in-95">
          <div className="w-20 h-20 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 mx-auto">
            <CheckCircle size={48} />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-primary">Import Complete!</h3>
            <p className="text-secondary">We successfully processed your attendance sheet.</p>
          </div>
          
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="p-4 rounded-2xl bg-surface-inset border border-subtle">
              <p className="text-2xl font-bold text-primary">{stats.total}</p>
              <p className="text-[10px] font-bold text-tertiary uppercase">Rows</p>
            </div>
            <div className="p-4 rounded-2xl bg-surface-inset border border-subtle">
              <p className="text-2xl font-bold text-emerald-400">{stats.imported}</p>
              <p className="text-[10px] font-bold text-tertiary uppercase">Success</p>
            </div>
            <div className="p-4 rounded-2xl bg-surface-inset border border-subtle">
              <p className="text-2xl font-bold text-rose-400">{stats.failed}</p>
              <p className="text-[10px] font-bold text-tertiary uppercase">Skipped</p>
            </div>
          </div>

          <button onClick={() => setStep(1)} className="btn-primary">Import Another File</button>
        </div>
      )}
    </div>
  );
}
