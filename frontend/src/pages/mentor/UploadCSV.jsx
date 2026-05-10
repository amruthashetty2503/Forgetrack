import React, { useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import * as XLSX from 'xlsx';
import {
  Upload, CheckCircle, AlertTriangle, ArrowRight,
  Loader2, Table, Calendar, Settings, Sparkles, X, Info
} from 'lucide-react';
import { genAI } from '../../lib/gemini';

const MODEL_NAME = "gemini-1.5-flash";

export default function UploadCSV() {
  // ── Wizard state ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);           // 1=upload 2=pickHeader 3=mapCols 4=result
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [stats, setStats] = useState({ imported: 0, failed: 0, warnings: [] });

  // ── File / sheet data ─────────────────────────────────────────────────────────
  const [workbook, setWorkbook] = useState(null);
  const [selectedSheet, setSelectedSheet] = useState(null);
  const [rawRows, setRawRows] = useState([]);    // All rows from sheet as arrays
  const [headerRowIdx, setHeaderRowIdx] = useState(null); // Which row index is the header
  const [headers, setHeaders] = useState([]);    // String[] from chosen header row
  const [dataRows, setDataRows] = useState([]);  // Rows AFTER the header row

  // ── Mapping state ─────────────────────────────────────────────────────────────
  const [mapping, setMapping] = useState({ usn: '', name: '', branch: '', email: '' });
  const [sessionCols, setSessionCols] = useState([]); // [{col, date}]
  const [programStart, setProgramStart] = useState('2025-01-01');
  const [typicalDays, setTypicalDays] = useState(['Monday', 'Wednesday', 'Friday']);

  // ── Step 1: File Upload ────────────────────────────────────────────────────────
  // Helper: parse a date string like "30/04/26", "18-09-25", or a JS Date serial into YYYY-MM-DD
  const parseHeaderDate = (val) => {
    if (!val) return null;
    let d = null;
    
    if (typeof val === 'number' && val > 40000 && val < 60000) {
      // Handle Excel numeric date serials
      d = new Date(Math.round((val - 25569) * 86400 * 1000));
    } else if (val instanceof Date || (typeof val === 'object' && val.getFullYear)) {
      d = new Date(val);
    } else {
      const str = val.toString().trim();
      // Match DD/MM/YY, DD/MM/YYYY, DD-MM-YY, DD-MM-YYYY
      const m1 = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      if (m1) {
        let [, p1, p2, year] = m1;
        if (year.length === 2) year = '20' + year;
        
        const v1 = parseInt(p1);
        const v2 = parseInt(p2);
        
        // Strategy: In India, DD/MM/YYYY is standard.
        // If v2 > 12, it MUST be MM/DD/YYYY (US)
        // If v1 > 12, it MUST be DD/MM/YYYY (UK/IN)
        // If both <= 12, assume DD/MM/YYYY as per cohort standard
        let day, month;
        if (v2 > 12) {
          month = v1; day = v2;
        } else {
          day = v1; month = v2;
        }
        
        d = new Date(parseInt(year), month - 1, day);
      } else {
        const d2 = new Date(str);
        if (!isNaN(d2.getTime())) d = d2;
      }
    }

    if (d && !isNaN(d.getTime())) {
      let y = d.getFullYear();
      let m = d.getMonth() + 1;
      let day = d.getDate();

      // AUTO-CORRECT: If the date is after April 30, 2026, it's likely a Day/Month swap
      // e.g. 12 Feb (02/12) becoming 2 Dec (12/02)
      if (y === 2026 && m > 4) {
        // Try swapping
        const swappedDate = new Date(y, day - 1, m);
        if (swappedDate.getMonth() + 1 <= 4) {
          m = swappedDate.getMonth() + 1;
          day = swappedDate.getDate();
        }
      }

      return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
    return null;
  };

  const isDateInRange = (iso) => {
    // Program is from June 2025 to April 30, 2026
    return iso >= '2025-06-01' && iso <= '2026-04-30';
  };

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0] || e.dataTransfer?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary', cellDates: true });
      setWorkbook(wb);
      // If multiple sheets, go to sheet selector; otherwise load first sheet directly
      if (wb.SheetNames.length > 1) {
        setStep(1.5); // sheet picker step
      } else {
        loadSheet(wb, wb.SheetNames[0]);
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const loadSheet = (wb, sheetName) => {
    setSelectedSheet(sheetName);
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
    // raw:false converts dates to strings; but we also read with cellDates:true above
    // Re-read with raw:true to get actual Date objects for date cells
    const rowsRaw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    setRawRows(rowsRaw);

    const keywords = ['usn', 'name', 'email', 'branch', 'sl'];
    const autoIdx = rowsRaw.findIndex(row =>
      row.some(cell => keywords.includes(cell?.toString().toLowerCase().trim()))
    );
    setHeaderRowIdx(autoIdx >= 0 ? autoIdx : null);
    setStep(2);
  };

  const confirmHeaderRow = (idx) => {
    const hRow = rawRows[idx] || [];
    const seen = {};
    const hdrs = hRow.map((h, i) => {
      const base = h?.toString().trim() || `Col_${i + 1}`;
      if (!seen[base]) { seen[base] = 1; return base; }
      seen[base]++;
      return `${base}_${seen[base]}`;
    });
    setHeaders(hdrs);
    setHeaderRowIdx(idx);
    const data = rawRows.slice(idx + 1).filter(r =>
      r.some(c => c !== '' && c !== null && c !== undefined)
    );
    setDataRows(data);

    // Auto-detect sessions: columns whose header parses to a date
    const autoSessions = [];
    rawRows[idx].forEach((h, i) => {
      const date = parseHeaderDate(h);
      if (date && isDateInRange(date)) {
        const colName = hdrs[i];
        autoSessions.push({ col: colName, date });
      }
    });
    if (autoSessions.length > 0) {
      setSessionCols(autoSessions);
    } else {
      setSessionCols([]);
    }

    const m = { usn: '', name: '', branch: '', email: '' };
    hdrs.forEach(h => {
      const lower = h.toLowerCase();
      if (lower.includes('usn') || lower.includes('id')) m.usn = h;
      if (lower.includes('name') || lower.includes('student name')) m.name = h;
      if (lower.includes('branch') || lower.includes('dept')) m.branch = h;
      if (lower.includes('email') || lower.includes('mail')) m.email = h;
    });
    setMapping(m);

    setStep(3);
    runAiAnalysis(hdrs, data.slice(0, 5));
  };


  // Only columns whose header contains "attendance" (case-insensitive)
  const attendanceCols = React.useMemo(() => {
    if (!headers.length) return [];
    return headers.filter(h => {
      const lower = h?.toString().toLowerCase();
      if (lower?.includes('attendance')) return true;
      const date = parseHeaderDate(h);
      return date && isDateInRange(date);
    });
  }, [headers]);

  // ── AI Analysis ───────────────────────────────────────────────────────────────
  const runAiAnalysis = async (hdrs, sampleData) => {
    setLoading(true);
    setStatusMsg('AI is mapping your columns...');
    try {
      const model = genAI.getGenerativeModel({ model: MODEL_NAME });
      const prompt = `
You are analyzing a student attendance spreadsheet.
Headers: ${JSON.stringify(hdrs)}
Sample rows (first 5): ${JSON.stringify(sampleData)}
Program start date: ${programStart}
Typical class days: ${typicalDays.join(', ')}

Tasks:
1. Find which header contains the student USN/ID (like "4SF24CI005").
2. Find which header contains the student Name.
3. Find which header contains the Branch/Department code.
4. Find which header contains the student Email address.
5. Find all headers that represent attendance dates/sessions (columns with P/A/1/0 values).
   The program spans from 2025 to 2026. For each session, determine the date in YYYY-MM-DD format.

Return ONLY valid JSON:
{
  "usn": "exact header string",
  "name": "exact header string", 
  "branch": "exact header string",
  "email": "exact header string",
  "sessions": [
    { "col": "exact header string", "date": "YYYY-MM-DD" }
  ],
  "reasoning": "brief explanation"
}`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleaned = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      setMapping(prev => ({ 
        usn: parsed.usn || prev.usn || '', 
        name: parsed.name || prev.name || '', 
        branch: parsed.branch || prev.branch || '',
        email: parsed.email || prev.email || '' 
      }));
      
      // Filter AI sessions to only include actual valid columns
      const validAiSessions = (parsed.sessions || []).filter(s => 
        headers.includes(s.col) && isDateInRange(s.date)
      );
      
      // If AI found sessions, merge them with auto-detected ones, preferring auto-detected
      setSessionCols(prev => {
        const existingCols = new Set(prev.map(s => s.col));
        const newSessions = [...prev];
        validAiSessions.forEach(s => {
          if (!existingCols.has(s.col)) {
            newSessions.push(s);
          }
        });
        return newSessions.sort((a, b) => a.date.localeCompare(b.date));
      });
    } catch (err) {
      console.warn('AI mapping failed:', err);
      setMapping({ usn: '', name: '', branch: '' });
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  // ── Step 3: Sync attendance ───────────────────────────────────────────────────
  const startImport = async () => {
    setLoading(true);
    setStatusMsg('Syncing with database...');
    let imported = 0, failed = 0;
    const warnings = [];

    try {
      // ── 1. Collect all valid rows (including those without USN if they have attendance) ────────────────
      const usnColIdx = headers.indexOf(mapping.usn);
      const nameColIdx = headers.indexOf(mapping.name);
      const branchColIdx = headers.indexOf(mapping.branch);
      const emailColIdx = headers.indexOf(mapping.email);

      const validRows = dataRows.filter(row => {
        const usn = row[usnColIdx]?.toString().trim();
        if (usn) return true;
        
        // If no USN, check if they have name AND at least one marked attendance
        const name = row[nameColIdx]?.toString().trim();
        if (!name) return false;
        
        const hasAttendance = sessionCols.some(({ col }) => {
          const colIdx = headers.indexOf(col);
          const val = row[colIdx];
          if (val === true || val === 1 || val === '1' || val === 1.0) return true;
          const sVal = val?.toString().toLowerCase().trim();
          return ['p', '1', 'present', 'true', 'yes'].includes(sVal);
        });
        
        return hasAttendance;
      });

      // Map USNs (and generate temporary ones for those without)
      const rowToUsn = validRows.map((row, ri) => {
        let usn = row[usnColIdx]?.toString().trim().toUpperCase();
        if (!usn) {
          const name = row[nameColIdx]?.toString().trim() || 'UNKNOWN';
          const email = emailColIdx !== -1 ? row[emailColIdx]?.toString().trim() : '';
          const emailPrefix = email ? email.split('@')[0] : `R${ri}`;
          // Generate a deterministic temporary USN including row index for uniqueness
          usn = `TBD_${name.replace(/\s+/g, '_')}_${emailPrefix}`.toUpperCase();
        }
        return usn;
      });

      const fileUSNs = [...new Set(rowToUsn)];

      // ── 2. Fetch existing students in one query ────────────────────────────────
      setStatusMsg('Fetching existing students...');
      const { data: existingStudents } = await supabase
        .from('students').select('id, usn').in('usn', fileUSNs);
      const usnMap = {};
      existingStudents?.forEach(s => { 
        if (s.usn) usnMap[s.usn.toUpperCase()] = s.id; 
      });

      // ── 3. Batch-create missing students & Sync emails ───────────────────────
      const missingUSNs = fileUSNs.filter(u => !usnMap[u]);
      if (missingUSNs.length > 0) {
        setStatusMsg(`Creating ${missingUSNs.length} new students...`);
        const newStudents = missingUSNs.map(usn => {
          const rowIndex = rowToUsn.indexOf(usn);
          const row = validRows[rowIndex];
          return {
            _originalUsn: usn,
            usn: usn,
            name: row?.[nameColIdx]?.toString().trim() || usn,
            email: (emailColIdx !== -1 && row?.[emailColIdx]) ? row[emailColIdx].toString().trim() : null,
            branch_code: row?.[branchColIdx]?.toString().trim() || 'N/A',
          };
        });

        // Insert individually to identify the exact record causing the conflict
        for (const student of newStudents) {
          const { _originalUsn, ...dbStudent } = student;
          const { data: created, error } = await supabase
            .from('students').insert([dbStudent]).select('id');
            
          if (error) {
            const errorMsg = `Error for student ${dbStudent.name} (${dbStudent.usn || 'No USN'}): ${error.message}`;
            warnings.push(errorMsg);
            console.error(errorMsg, dbStudent);
          } else if (created && created[0]) {
            usnMap[_originalUsn] = created[0].id;
          }
        }
      }

      // Sync emails for existing students if email mapping is provided
      if (mapping.email && emailColIdx !== -1) {
        setStatusMsg('Syncing student emails...');
        const studentsToUpdate = [];
        existingStudents?.forEach(s => {
          const usn = s.usn.toUpperCase();
          const rowIndex = rowToUsn.indexOf(usn);
          if (rowIndex !== -1) {
             const fileEmail = validRows[rowIndex][emailColIdx]?.toString().trim();
             if (fileEmail) {
                studentsToUpdate.push({ usn, email: fileEmail });
             }
          }
        });
        
        if (studentsToUpdate.length > 0) {
          setStatusMsg(`Updating ${studentsToUpdate.length} emails...`);
          const { error } = await supabase.from('students').upsert(studentsToUpdate, { onConflict: 'usn' });
          if (error) warnings.push(`Email sync error: ${error.message}`);
        }
      }

      // ── 4. Create all sessions at once ────────────────────────────────────────
      const validSessions = sessionCols.filter(s => s.col && s.date);
      if (validSessions.length === 0) {
        warnings.push('No valid session columns with dates were configured.');
        setStats({ imported: 0, failed: validRows.length, warnings });
        setStep(4); return;
      }

      setStatusMsg('Creating sessions...');
      const allDates = [...new Set(validSessions.map(s => s.date))];
      const { data: existingSessions } = await supabase
        .from('sessions').select('id, date').in('date', allDates);
      const dateToSessionId = {};
      existingSessions?.forEach(s => { dateToSessionId[s.date] = s.id; });

      const missingDates = allDates.filter(d => !dateToSessionId[d]);
      if (missingDates.length > 0) {
        const newSessions = missingDates.map(d => {
          const year = new Date(d).getFullYear();
          const month = new Date(d).getMonth() + 1;
          const monthNumber = Math.max(1, ((year - 2025) * 12 + month - 8) + 1);
          return {
            date: d,
            topic: `Imported: ${d}`,
            month_number: monthNumber,
          };
        });
        const { data: created, error } = await supabase
          .from('sessions').insert(newSessions).select('id, date');
        if (error) warnings.push(`Session create error: ${error.message}`);
        created?.forEach(s => { dateToSessionId[s.date] = s.id; });
      }

      // ── 5. Build all attendance records ───────────────────────────────────────
      setStatusMsg('Building attendance records...');
      const attendanceRecords = [];

      for (let ri = 0; ri < validRows.length; ri++) {
        const row = validRows[ri];
        const usn = rowToUsn[ri];
        const studentId = usnMap[usn];
        if (!studentId) { failed++; continue; }

        for (const { col, date } of validSessions) {
          const sessionId = dateToSessionId[date];
          if (!sessionId) continue;

          const colIdx = headers.indexOf(col);
          const val = row[colIdx];
          // Handle boolean TRUE/FALSE from Excel, numbers (1/0), and text (P/A)
          const isPresent = val === true || val === 1 || val === '1' || val === 1.0 ||
            ['p', '1', 'present', 'true', 'yes'].includes(val?.toString().toLowerCase().trim());

          attendanceRecords.push({
            student_id: studentId,
            session_id: sessionId,
            present: isPresent,
            marked_by: 'Bulk Upload',
          });
          if (isPresent) imported++;
        }
      }

      // ── 6. Batch upsert attendance in chunks of 500 ───────────────────────────
      setStatusMsg(`Saving ${attendanceRecords.length} attendance records...`);
      for (let i = 0; i < attendanceRecords.length; i += 500) {
        const chunk = attendanceRecords.slice(i, i + 500);
        const { error } = await supabase.from('attendance')
          .upsert(chunk, { onConflict: 'student_id,session_id' });
        if (error) warnings.push(`Attendance batch error: ${error.message}`);
        setStatusMsg(`Saving records... ${Math.min(i + 500, attendanceRecords.length)}/${attendanceRecords.length}`);
      }

      setStats({ imported, failed, warnings });
      setStep(4);
    } catch (err) {
      console.error(err);
      warnings.push(`Fatal error: ${err.message}`);
      setStats({ imported, failed, warnings });
      setStep(4);
    } finally {
      setLoading(false);
      setStatusMsg('');
    }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────────
  const reset = () => {
    setStep(1);
    setWorkbook(null); setSelectedSheet(null); setRawRows([]); setHeaders([]); setDataRows([]);
    setMapping({ usn: '', name: '', branch: '' }); setSessionCols([]);
    setStats({ imported: 0, failed: 0, warnings: [] });
    setHeaderRowIdx(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary">Bulk Upload CSV</h1>
        <p className="text-secondary mt-1">Import student attendance from Excel / CSV</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3">
        {['Upload File', 'Select Header Row', 'Map & Sync', 'Done'].map((label, i) => (
          <React.Fragment key={i}>
            <div className={`flex items-center gap-2 ${step > i + 1 ? 'text-emerald-400' : step === i + 1 ? 'text-accent-glow' : 'text-tertiary'}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                step > i + 1 ? 'border-emerald-400 bg-emerald-400/10' :
                step === i + 1 ? 'border-accent-glow bg-accent-glow/10' : 'border-subtle'
              }`}>
                {step > i + 1 ? <CheckCircle size={14} /> : i + 1}
              </div>
              <span className="text-xs font-medium hidden sm:block">{label}</span>
            </div>
            {i < 3 && <div className={`flex-1 h-px ${step > i + 1 ? 'bg-emerald-400/40' : 'bg-subtle'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* ── Step 1: Upload ── */}
      {step === 1 && (
        <label className="card border-2 border-dashed border-subtle hover:border-accent-glow transition-all p-16 flex flex-col items-center gap-4 cursor-pointer">
          <div className="w-20 h-20 rounded-3xl bg-accent-glow/10 flex items-center justify-center text-accent-glow">
            <Upload size={40} />
          </div>
          <div className="text-center">
            <p className="text-xl font-bold text-primary">Drop your Excel / CSV file here</p>
            <p className="text-secondary text-sm mt-1">or click to browse</p>
          </div>
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileUpload} />
        </label>
      )}

      {/* ── Step 1.5: Select Sheet ── */}
      {step === 1.5 && workbook && (
        <div className="card border-subtle p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-primary">Select Sheet</h2>
            <p className="text-secondary text-sm mt-1">This file has multiple sheets. Which one contains the attendance data?</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {workbook.SheetNames.map(sheetName => (
              <button
                key={sheetName}
                onClick={() => loadSheet(workbook, sheetName)}
                className="p-4 border border-subtle rounded-xl text-left hover:border-accent-glow hover:bg-surface-raised transition-all"
              >
                <div className="flex items-center gap-3">
                  <Table className="text-accent-glow" size={20} />
                  <span className="font-bold text-primary">{sheetName}</span>
                </div>
              </button>
            ))}
          </div>
          <button onClick={reset} className="btn-secondary">← Back</button>
        </div>
      )}

      {/* ── Step 2: Pick Header Row ── */}
      {step === 2 && (
        <div className="card border-subtle p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-primary">Which row are the column headers?</h2>
            <p className="text-secondary text-sm mt-1">
              Click the row that contains titles like <span className="text-accent-glow font-mono">USN, Name, Branch</span>. 
              {headerRowIdx !== null && (
                <span className="ml-2 text-emerald-400 font-semibold">✓ Row {headerRowIdx + 1} auto-detected.</span>
              )}
            </p>
            <p className="text-[10px] text-tertiary mt-2">
              Note: Students without a USN will be imported with a temporary ID if they have attendance marked in the sheet.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-subtle max-h-[420px] overflow-y-auto">
            <table className="w-full text-xs">
              <tbody>
                {rawRows.slice(0, 15).map((row, idx) => {
                  const isSelected = headerRowIdx === idx;
                  const nonEmpty = row.filter(c => c !== '' && c !== null).length;
                  if (nonEmpty === 0) return null; // skip completely empty rows
                  return (
                    <tr
                      key={idx}
                      onClick={() => setHeaderRowIdx(idx)}
                      className={`cursor-pointer transition-all border-b border-subtle group ${
                        isSelected ? 'bg-accent-glow/15 ring-1 ring-inset ring-accent-glow' : 'hover:bg-surface-raised'
                      }`}
                    >
                      <td className={`px-4 py-3 font-mono font-bold w-12 shrink-0 ${isSelected ? 'text-accent-glow' : 'text-tertiary'}`}>
                        {idx + 1}
                        {isSelected && <span className="ml-1 text-[8px] text-accent-glow">✓</span>}
                      </td>
                      {row.slice(0, 10).map((cell, ci) => (
                        <td key={ci} className={`px-3 py-3 border-l border-subtle/30 truncate max-w-[130px] ${
                          isSelected ? 'text-primary font-medium' : 'text-secondary'
                        }`}>
                          {cell?.toString() || <span className="text-tertiary italic text-[10px]">—</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center">
            <button onClick={reset} className="btn-secondary">← Back</button>
            <button
              onClick={() => headerRowIdx !== null && confirmHeaderRow(headerRowIdx)}
              disabled={headerRowIdx === null}
              className="btn-primary"
            >
              Confirm Header Row {headerRowIdx !== null ? `(Row ${headerRowIdx + 1})` : ''} →
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Map columns & sync ── */}
      {step === 3 && (
        <div className="space-y-8">
          {/* Loading overlay */}
          {loading && (
            <div className="card border-subtle p-8 flex items-center gap-4">
              <Loader2 size={24} className="text-accent-glow animate-spin" />
              <p className="text-secondary">{statusMsg}</p>
            </div>
          )}

          {!loading && (
            <>
              {/* Column Mapping */}
              <div className="card border-subtle p-6 space-y-6">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-accent-glow" />
                  <h3 className="font-bold text-primary">Map Your Columns</h3>
                  <span className="ml-auto text-[10px] text-secondary">
                    {dataRows.length} student rows detected
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { key: 'usn', label: 'USN / Student ID', hint: 'e.g. 4SF24CI005' },
                    { key: 'name', label: 'Student Name', hint: 'Full name column' },
                    { key: 'branch', label: 'Branch Code', hint: 'e.g. CI, EC, ME' },
                    { key: 'email', label: 'Email Column', hint: 'Optional but recommended' },
                  ].map(({ key, label, hint }) => (
                    <div key={key} className="space-y-2">
                      <label className="text-xs font-bold text-secondary uppercase tracking-widest">{label}</label>
                      <select
                        className="input"
                        value={mapping[key]}
                        onChange={e => setMapping(m => ({ ...m, [key]: e.target.value }))}
                      >
                        <option value="">— Select header —</option>
                        {headers.filter(h => {
                          const lower = h.toLowerCase();
                          return !parseHeaderDate(h) && 
                                 !lower.includes('attendance') && 
                                 !lower.startsWith('col_');
                        }).map((h, i) => {
                          const colIdx = headers.indexOf(h);
                          const sample = dataRows[0]?.[colIdx]?.toString() || '';
                          return (
                            <option key={i} value={h}>
                              {h}{sample ? ` (${sample.substring(0, 20)})` : ''}
                            </option>
                          );
                        })}
                      </select>
                      <p className="text-[10px] text-tertiary">{hint}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Session / Attendance Columns */}
              <div className="card border-subtle p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-accent-glow" />
                    <h3 className="font-bold text-primary">Attendance Session Columns</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    {attendanceCols.length > 0 && sessionCols.length === 0 && (
                      <button
                        onClick={() => setSessionCols(attendanceCols.map(col => ({ col, date: '' })))}
                        className="text-xs font-bold text-emerald-400 hover:underline"
                      >
                        ✓ Auto-Add All ({attendanceCols.length} attendance columns)
                      </button>
                    )}
                    <button
                      onClick={() => setSessionCols(c => [...c, { col: '', date: '' }])}
                      className="text-xs font-bold text-accent-glow hover:underline"
                    >
                      + Add Session
                    </button>
                  </div>
                </div>

                {sessionCols.length === 0 && (
                  <div className="py-8 text-center border border-dashed border-subtle rounded-xl space-y-3">
                    <p className="text-tertiary text-sm">
                      {attendanceCols.length > 0
                        ? `${attendanceCols.length} attendance columns detected.`
                        : 'No attendance columns detected.'}
                    </p>
                    {attendanceCols.length > 0 && (
                      <button
                        onClick={() => setSessionCols(attendanceCols.map(col => ({ col, date: '' })))}
                        className="btn-primary text-sm mx-auto"
                      >
                        ✓ Auto-Add {attendanceCols.length} Attendance Columns
                      </button>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-80 overflow-y-auto">
                  {sessionCols.map((sc, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-surface-raised border border-subtle space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-tertiary uppercase">Column</span>
                        <button
                          onClick={() => setSessionCols(c => c.filter((_, i) => i !== idx))}
                          className="text-rose-400 hover:text-rose-300"
                        >
                          <X size={12} />
                        </button>
                      </div>
                      <select
                        className="input text-xs py-1"
                        value={sc.col}
                        onChange={e => setSessionCols(c => c.map((s, i) => i === idx ? { ...s, col: e.target.value } : s))}
                      >
                        <option value="">— Pick attendance column —</option>
                        {attendanceCols.map((h, i) => {
                          const colIdx = headers.indexOf(h);
                          const sample = dataRows[0]?.[colIdx];
                          const sampleStr = sample === true ? 'Present' : sample === false ? 'Absent' : sample?.toString() || '';
                          return (
                            <option key={i} value={h}>
                              {h}{sampleStr ? ` (${sampleStr})` : ''}
                            </option>
                          );
                        })}
                      </select>
                      <input
                        type="date"
                        className="input text-xs py-1"
                        value={sc.date}
                        onChange={e => setSessionCols(c => c.map((s, i) => i === idx ? { ...s, date: e.target.value } : s))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Preview */}
              {dataRows.length > 0 && mapping.usn && (
                <div className="card border-subtle p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Table size={18} className="text-accent-glow" />
                    <h3 className="font-bold text-primary">Data Preview ({dataRows.length} rows)</h3>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-subtle">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-surface-inset border-b border-subtle">
                          <th className="px-4 py-2 font-bold text-secondary">#</th>
                          {mapping.usn && <th className="px-4 py-2 font-bold text-secondary">USN</th>}
                          {mapping.name && <th className="px-4 py-2 font-bold text-secondary">Name</th>}
                          {mapping.branch && <th className="px-4 py-2 font-bold text-secondary">Branch</th>}
                          {sessionCols.slice(0, 5).map((sc, i) => (
                            <th key={i} className="px-4 py-2 font-bold text-secondary">{sc.date || sc.col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-subtle">
                        {dataRows.slice(0, 20).map((row, ri) => {
                          const usnIdx = headers.indexOf(mapping.usn);
                          const nameIdx = headers.indexOf(mapping.name);
                          const branchIdx = headers.indexOf(mapping.branch);
                          const emailIdx = headers.indexOf('email');
                          
                          let displayUsn = row[usnIdx]?.toString().trim();
                          const isGenerated = !displayUsn;
                          if (isGenerated) {
                             const name = row[nameIdx]?.toString().trim() || 'UNKNOWN';
                             const email = emailIdx !== -1 ? row[emailIdx]?.toString().trim() : '';
                             const emailPrefix = email ? email.split('@')[0] : `R${ri}`;
                             displayUsn = `TBD_${name.replace(/\s+/g, '_')}_${emailPrefix}`.toUpperCase();
                          }
                          
                          return (
                            <tr key={ri} className="hover:bg-surface-raised transition-colors">
                              <td className="px-4 py-3 text-tertiary">{ri + 1}</td>
                              <td className="px-4 py-3 font-mono text-primary">
                                {!isGenerated ? displayUsn : (
                                   <div className="flex flex-col">
                                      <span className="text-xs text-secondary italic opacity-60">Generated USN</span>
                                      {row[emailIdx] && <span className="text-[10px] text-tertiary">{row[emailIdx]}</span>}
                                   </div>
                                )}
                              </td>
                              {mapping.name && <td className="px-4 py-3 text-primary">{row[nameIdx]}</td>}
                              {mapping.branch && <td className="px-4 py-3 text-secondary">{row[branchIdx]}</td>}
                              {sessionCols.slice(0, 5).map((sc, i) => {
                                const colIdx = headers.indexOf(sc.col);
                                const val = row[colIdx];
                                const present = val === true || val === 1 ||
                                  ['p', '1', 'present', 'true', 'yes'].includes(val?.toString().toLowerCase().trim());
                                return (
                                  <td key={i} className="px-4 py-3 text-center">
                                    {sc.col ? (
                                      <span className={`font-bold ${present ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {present ? 'P' : 'A'}
                                      </span>
                                    ) : '—'}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {dataRows.length > 20 && (
                    <p className="text-[10px] text-tertiary text-center">+ {dataRows.length - 20} more rows will be imported</p>
                  )}
                </div>
              )}

              {/* Action bar */}
              <div className="flex justify-between items-center p-6 bg-surface-raised rounded-2xl border border-subtle">
                <button onClick={() => setStep(2)} className="btn-secondary">← Back</button>
                <div className="flex flex-col items-end gap-2">
                  {sessionCols.length > 0 && sessionCols.filter(s => s.col && s.date).length === 0 && (
                    <p className="text-xs text-amber-400 font-medium">
                      ⚠ Please set a date for at least one session column above
                    </p>
                  )}
                  {!mapping.usn && (
                    <p className="text-xs text-amber-400 font-medium">
                      ⚠ Please select the USN column above
                    </p>
                  )}
                  <button
                    onClick={startImport}
                    disabled={!mapping.usn || sessionCols.filter(s => s.col && s.date).length === 0}
                    className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Sync Attendance <ArrowRight size={18} className="ml-2" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Step 4: Result ── */}
      {step === 4 && (
        <div className="card border-subtle p-12 text-center space-y-8">
          <div className="w-24 h-24 rounded-3xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle size={56} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-primary">Bulk Sync Complete!</h2>
            <p className="text-secondary mt-2">Attendance data processed successfully.</p>
          </div>

          <div className="grid grid-cols-2 gap-6 max-w-sm mx-auto">
            <div className="p-6 rounded-2xl bg-surface-inset border border-subtle">
              <p className="text-4xl font-bold text-emerald-400">{stats.imported}</p>
              <p className="text-xs font-bold text-tertiary uppercase mt-1">Imported</p>
            </div>
            <div className="p-6 rounded-2xl bg-surface-inset border border-subtle">
              <p className="text-4xl font-bold text-rose-400">{stats.failed}</p>
              <p className="text-xs font-bold text-tertiary uppercase mt-1">Skipped</p>
            </div>
          </div>

          {stats.warnings?.length > 0 && (
            <div className="max-w-2xl mx-auto p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-left max-h-48 overflow-y-auto">
              <p className="text-xs font-bold text-amber-400 mb-2 flex items-center gap-1">
                <AlertTriangle size={12} /> {stats.warnings.length} Warning(s)
              </p>
              {stats.warnings.map((w, i) => <p key={i} className="text-[10px] text-secondary">• {w}</p>)}
            </div>
          )}

          <button onClick={reset} className="btn-primary mx-auto">
            Start New Upload
          </button>
        </div>
      )}
    </div>
  );
}
