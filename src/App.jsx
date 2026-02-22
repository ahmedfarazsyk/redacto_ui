import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Shield, UploadCloud, FileText, Loader2, Download, AlertCircle, 
  CheckCircle, XCircle, Flame, FileWarning, RefreshCcw, Eye, Palette 
} from 'lucide-react';

export default function App() {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('UPLOAD'); 
  const [loading, setLoading] = useState(false);
  const [isBurning, setIsBurning] = useState(false);
  const [auditLog, setAuditLog] = useState([]);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [searchableBase64, setSearchableBase64] = useState(null);
  const [error, setError] = useState('');
  
  // Theme State
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem('redacto-theme');
    return savedTheme || 'cyber'; 
  });

  const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('redacto-theme', theme);
  }, [theme]);

  useEffect(() => {
    return () => { if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl); };
  }, [pdfBlobUrl]);

  const createPdfBlobUrl = (base64) => {
    try {
      if (pdfBlobUrl) URL.revokeObjectURL(pdfBlobUrl);
      const bstr = atob(base64.split(',').pop());
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) u8arr[n] = bstr.charCodeAt(n);
      const url = URL.createObjectURL(new Blob([u8arr], { type: 'application/pdf' }));
      setPdfBlobUrl(url);
      return url;
    } catch (e) {
      setError("Failed to render PDF preview.");
      return null;
    }
  };

  const base64ToFile = (base64, filename) => {
    const bstr = atob(base64.split(',').pop());
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);
    return new File([u8arr], filename, { type: 'application/pdf' });
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post(`${API_BASE}/analyze-document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        // timeout: 600000 
      });
      if (response.data) {
        setAuditLog(response.data.audit_log.map(item => ({ ...item, approved: true })));
        setSearchableBase64(response.data.searchable_base64);
        createPdfBlobUrl(response.data.preview_base64);
        setStep('REVIEW');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. System timeout or large file.');
    } finally {
      setLoading(false);
    }
  };

  const toggleApproval = (index) => {
    const newLog = [...auditLog];
    newLog[index].approved = !newLog[index].approved;
    setAuditLog(newLog);
  };

  const handleBurn = async () => {
    if (!searchableBase64) return;
    setIsBurning(true);
    setError('');
    try {
      const searchableFile = base64ToFile(searchableBase64, file.name);
      const formData = new FormData();
      formData.append('file', searchableFile);
      formData.append('approved_log', JSON.stringify(auditLog.filter(i => i.approved)));
      const response = await axios.post(`${API_BASE}/burn-document`, formData);
      if (response.data) {
        createPdfBlobUrl(response.data.final_base64);
        setStep('DONE');
      }
    } catch (err) {
      setError('Sanitization failed.');
    } finally {
      setIsBurning(false);
    }
  };

  const resetApp = () => {
    setFile(null);
    setAuditLog([]);
    setStep('UPLOAD');
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-brand-bg text-brand-text font-sans flex flex-col overflow-hidden transition-colors duration-300">
      
      {/* OVERLAY */}
      {isBurning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-bg/95 backdrop-blur-sm">
          <div className="text-center px-4">
            <Flame className="w-16 h-16 md:w-20 md:h-20 text-brand-accent animate-pulse mx-auto mb-4" />
            <h2 className="text-xl md:text-3xl font-black text-brand-text tracking-widest uppercase">BURN-IN PROGRESS</h2>
          </div>
        </div>
      )}

      {/* NAV */}
      <nav className="h-14 md:h-16 border-b-2 border-brand-border flex items-center px-4 md:px-8 bg-brand-panel justify-between shrink-0 transition-colors duration-300">
        <div className="flex items-center gap-2 md:gap-3">
          <Shield className="w-5 h-5 md:w-6 md:h-6 text-brand-accent" />
          <span className="font-black tracking-tighter text-lg md:text-2xl uppercase text-brand-text">
            Redacto<span className="text-brand-accent">.AI</span>
          </span>
        </div>
        
        <div className="flex items-center gap-3 md:gap-4">
          {/* THEME SWITCHER (Now fully visible on mobile) */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <Palette className="w-3.5 h-3.5 md:w-4 md:h-4 text-brand-muted hidden sm:block" />
            <select 
              value={theme} 
              onChange={(e) => setTheme(e.target.value)}
              className="bg-brand-bg border border-brand-border text-brand-text text-[10px] md:text-xs font-bold rounded-md md:rounded-lg px-1.5 md:px-2 py-1 outline-none focus:border-brand-accent cursor-pointer uppercase tracking-wider md:tracking-widest transition-colors"
            >
              <option value="cyber">Cyber</option>
              <option value="midnight">Midnight</option>
              <option value="amber">Amber</option>
              <option value="light">Light</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-xs font-black text-brand-accent border-2 border-brand-soft px-1.5 md:px-3 py-1 md:py-1.5 rounded-md md:rounded-lg bg-brand-soft">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-brand-accent rounded-full animate-pulse" />
            <span className="hidden sm:inline">ENCRYPTED SESSION</span>
            <span className="sm:hidden">SECURE</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 relative flex flex-col overflow-hidden min-h-0">
        {error && (
          <div className="absolute top-2 md:top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg">
            <div className="p-3 md:p-4 bg-red-600/90 border-2 border-red-400 text-white rounded-xl flex items-center gap-3 md:gap-4 text-xs md:text-sm font-bold shadow-2xl backdrop-blur">
              <AlertCircle className="w-5 h-5 md:w-6 md:h-6 shrink-0" /> {error}
            </div>
          </div>
        )}

        {/* STEP 1: UPLOAD */}
        {step === 'UPLOAD' && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-xl bg-brand-panel border-2 border-brand-border rounded-3xl p-6 md:p-8 shadow-2xl transition-colors duration-300">
              <div className="text-center mb-6">
                <h1 className="text-2xl md:text-3xl font-black text-brand-text uppercase tracking-tight">Sanitize PDF</h1>
                <p className="text-brand-muted text-xs md:text-sm mt-2">Automatic PII detection & metadata destruction.</p>
              </div>

              <div className="relative group border-2 border-dashed border-brand-border hover:border-brand-accent bg-brand-bg rounded-2xl p-8 md:p-10 text-center transition-all">
                <input type="file" accept=".pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                <UploadCloud className="w-12 h-12 md:w-16 md:h-16 text-brand-muted group-hover:text-brand-accent mx-auto mb-3 md:mb-4 transition-colors" />
                <p className="text-sm md:text-lg font-black text-brand-text truncate px-2">
                  {file ? file.name : "DRAG OR CLICK TO UPLOAD"}
                </p>
              </div>

              <button 
                onClick={handleAnalyze} disabled={!file || loading}
                className="mt-6 w-full py-4 md:py-5 bg-brand-accent hover:bg-brand-hover disabled:opacity-50 text-brand-bg font-black rounded-xl md:rounded-2xl transition-all flex items-center justify-center gap-2 md:gap-4 text-sm md:text-lg uppercase tracking-wider shadow-lg"
              >
                {loading ? <><Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin" /> ANALYZING...</> : <><FileText className="w-5 h-5 md:w-6 md:h-6" /> START ANALYSIS</>}
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: REVIEW (Crucial flex & min-h-0 fixes here) */}
        {step === 'REVIEW' && (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
            {/* Viewer Section */}
            <div className="h-[45vh] lg:h-auto lg:flex-[1.5] flex flex-col shrink-0 lg:shrink border-b-2 lg:border-b-0 lg:border-r-2 border-brand-border bg-brand-panel transition-colors duration-300">
              <div className="h-10 md:h-12 bg-brand-panel border-b border-brand-border flex items-center justify-between px-3 md:px-6 shrink-0">
                <div className="flex items-center gap-2 md:gap-3">
                  <Eye className="w-4 h-4 md:w-5 md:h-5 text-brand-accent" />
                  <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-brand-text">Document Inspection</span>
                </div>
                <div className="text-[9px] md:text-[11px] font-bold text-brand-accent bg-brand-soft px-1.5 md:px-2 py-0.5 md:py-1 rounded border border-brand-accent/20 uppercase font-mono">
                  Virtual_Redact
                </div>
              </div>
              <div className="flex-1 overflow-hidden relative min-h-0" style={{ backgroundColor: 'var(--pdf-bg)' }}>
                <iframe src={pdfBlobUrl} className="w-full h-full border-0 transition-all duration-300" style={{ filter: 'var(--pdf-filter)' }} title="Preview" />
              </div>
            </div>

            {/* Controls Section */}
            <div className="flex-1 flex flex-col lg:w-96 lg:max-w-md bg-brand-panel transition-colors duration-300 min-h-0">
              <div className="p-3 md:p-5 border-b-2 border-brand-border bg-brand-bg flex items-center justify-between shrink-0">
                <h2 className="text-xs md:text-sm font-black text-brand-text uppercase tracking-widest flex items-center gap-2">
                  <FileWarning className="w-4 h-4 md:w-5 md:h-5 text-brand-accent" /> Detections
                </h2>
                <span className="text-xs md:text-sm bg-brand-text text-brand-bg px-2 md:px-3 py-0.5 rounded-full font-black">{auditLog.length}</span>
              </div>
              
              <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3 custom-scrollbar bg-brand-bg min-h-0">
                {auditLog.map((log, idx) => (
                  <div 
                    key={idx} onClick={() => toggleApproval(idx)} 
                    className={`p-3 md:p-4 rounded-xl border-2 transition-all cursor-pointer shrink-0 ${
                      log.approved ? 'bg-brand-soft border-brand-accent' : 'bg-brand-panel border-brand-border opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                       <span className={`text-[9px] md:text-[11px] px-1.5 md:px-2 py-0.5 rounded font-black uppercase tracking-wider ${log.approved ? 'bg-brand-bg text-brand-accent' : 'bg-brand-border text-brand-muted'}`}>
                         {log.entity_type}
                       </span>
                       {log.approved ? <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-brand-accent shrink-0" /> : <XCircle className="w-4 h-4 md:w-5 md:h-5 text-brand-muted shrink-0" />}
                    </div>
                    <p className={`font-mono text-xs md:text-sm leading-tight break-all font-bold ${log.approved ? 'text-brand-text' : 'text-brand-muted'}`}>"{log.text_found}"</p>
                    <div className={`mt-2 text-[9px] md:text-[10px] font-black uppercase ${log.approved ? 'text-brand-text opacity-70' : 'text-brand-muted'}`}>PAGE {log.page}</div>
                  </div>
                ))}
              </div>

              <div className="p-3 md:p-6 border-t-2 border-brand-border bg-brand-panel shrink-0">
                <button onClick={handleBurn} className="w-full py-4 md:py-5 bg-brand-text hover:opacity-80 text-brand-bg font-black text-xs md:text-sm rounded-xl md:rounded-2xl transition-all uppercase tracking-widest flex items-center justify-center gap-2 md:gap-3 shadow-xl">
                  <Flame className="w-4 h-4 md:w-5 md:h-5 shrink-0" /> Execute Permanent Burn
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: DONE */}
        {step === 'DONE' && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-lg text-center bg-brand-panel border-2 border-brand-border p-8 md:p-12 rounded-3xl md:rounded-[3rem] shadow-2xl transition-colors duration-300">
              <div className="w-16 h-16 md:w-24 md:h-24 bg-brand-accent text-brand-bg rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-6 md:mb-8 rotate-3 shadow-2xl">
                <CheckCircle className="w-8 h-8 md:w-12 md:h-12" />
              </div>
              <h2 className="text-2xl md:text-4xl font-black text-brand-text uppercase tracking-tighter mb-2 md:mb-3">SCRUBBED</h2>
              <p className="text-brand-muted text-sm md:text-base font-bold mb-8 md:mb-10">All metadata and unapproved PII have been destroyed.</p>
              
              <div className="grid grid-cols-1 gap-3 md:gap-4">
                <a href={pdfBlobUrl} download={`REDACTED_${file?.name || 'document.pdf'}`} className="w-full py-4 md:py-5 bg-brand-text hover:opacity-80 text-brand-bg font-black rounded-xl md:rounded-2xl flex items-center justify-center gap-2 md:gap-3 text-sm md:text-lg uppercase tracking-widest transition-all">
                  <Download className="w-5 h-5 md:w-6 md:h-6" /> DOWNLOAD PDF
                </a>
                <button onClick={resetApp} className="w-full py-3 md:py-4 text-brand-muted hover:text-brand-text font-black text-xs md:text-sm uppercase tracking-[0.2em] transition-colors">
                  <RefreshCcw className="w-3 h-3 md:w-4 md:h-4 inline mr-2" /> Start New Session
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}