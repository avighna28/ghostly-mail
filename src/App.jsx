import React, { useState, useEffect, useCallback } from 'react';
import { 
  Mail, 
  Copy, 
  RefreshCw, 
  Trash2, 
  ChevronRight, 
  X, 
  Clock, 
  Inbox, 
  CheckCircle2,
  AlertCircle,
  Wifi,
  ShieldCheck,
  QrCode // Added QR Code icon
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react'; // Added QR Code library

const API_BASE = import.meta.env.VITE_MAIL_API_BASE || "https://api.mail.tm";

const App = () => {
  const [account, setAccount] = useState(null);
  const [token, setToken] = useState(null);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [showQR, setShowQR] = useState(false); // Added QR state
  const [copying, setCopying] = useState(false);
  const [status, setStatus] = useState("Connecting...");

  const generateUniqueId = () => {
    return Math.random().toString(36).substring(2, 8) + Date.now().toString().slice(-4);
  };

  const createAccount = useCallback(async () => {
    try {
      setLoading(true);
      setStatus("Establishing Secure Link...");
      
      const domainsRes = await fetch(`${API_BASE}/domains`);
      const domains = await domainsRes.json();
      const domain = domains['hydra:member'][0].domain;

      const address = `${generateUniqueId()}@${domain}`;
      const password = generateUniqueId();

      setStatus("Syncing...");
      const regRes = await fetch(`${API_BASE}/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, password })
      });
      
      if (!regRes.ok) throw new Error("API Limit Reached");

      const tokenRes = await fetch(`${API_BASE}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, password })
      });
      const tokenData = await tokenRes.json();

      const newAccount = { address, password, token: tokenData.token };
      setAccount(newAccount);
      setToken(tokenData.token);
      localStorage.setItem('mailtm_final', JSON.stringify(newAccount));
      setLoading(false);
      setStatus("Online");
    } catch (err) {
      console.error(err);
      setStatus("Retrying Connection...");
      setTimeout(createAccount, 2000);
    }
  }, []);

  const fetchMessages = useCallback(async (authToken) => {
    if (!authToken) return;
    try {
      setRefreshing(true);
      const res = await fetch(`${API_BASE}/messages`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      setEmails(data['hydra:member'] || []);
      setRefreshing(false);
    } catch (err) {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('mailtm_final');
    if (saved) {
      const parsed = JSON.parse(saved);
      setAccount(parsed);
      setToken(parsed.token);
      setLoading(false);
      setStatus("Online");
    } else {
      createAccount();
    }
  }, [createAccount]);

  useEffect(() => {
    if (!token) return;
    fetchMessages(token);
    const interval = setInterval(() => fetchMessages(token), 10000);
    return () => clearInterval(interval);
  }, [token, fetchMessages]);

  const handleNewInbox = async () => {
    if (window.confirm("Switch to a new secure identity?")) {
      localStorage.removeItem('mailtm_final'); 
      setAccount(null);
      setToken(null);
      setEmails([]);
      await createAccount();
    }
  };

  const openEmail = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/messages/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSelectedEmail(data);
    } catch (err) {
      alert("Mail content unavailable.");
    }
  };

  return (
    <div className="app-container">
      <header>
        <div className="logo">
          <ShieldCheck size={28} />
          <span>GHOSTLY</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: status === "Online" ? "#10b981" : "#f59e0b", fontSize: '0.75rem', fontWeight: 700 }}>
          <Wifi size={12} className={status === "Online" ? "" : "animate-pulse"} />
          {status}
        </div>
      </header>

      <main style={{ width: '100%', maxWidth: '700px' }}>
        <section className="email-card">
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--secondary)' }}>
            Stealth Identity
          </span>
          
          <div className="email-display-group">
            <div className="email-address">
              {loading ? "Initializing..." : account?.address}
            </div>
            <div className="action-buttons">
              {/* QR Code Trigger Button */}
              <button 
                className="btn-icon" 
                onClick={() => setShowQR(true)} 
                title="Generate QR Code"
                disabled={loading}
              >
                <QrCode size={20} />
              </button>
              
              <button className="btn-icon" onClick={() => {
                navigator.clipboard.writeText(account?.address);
                setCopying(true);
                setTimeout(() => setCopying(false), 2000);
              }} disabled={loading}>
                {copying ? <CheckCircle2 size={20} color="#10b981" /> : <Copy size={20} />}
              </button>
              
              <button className="btn-icon" onClick={handleNewInbox} title="New Identity" disabled={loading}>
                <Trash2 size={20} />
              </button>
            </div>
          </div>

          <button className="btn-primary" onClick={() => fetchMessages(token)} disabled={refreshing || loading}>
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Scanning Server..." : "Fetch Mail"}
          </button>
        </section>

        <section className="inbox-section">
          <div className="inbox-header">
            <h2 className="inbox-title">Secure Inbox</h2>
            <div className="refresh-badge"><Clock size={12} /> Active</div>
          </div>

          <div className="email-list">
            <AnimatePresence mode='popLayout'>
              {emails.length > 0 ? (
                emails.map((msg) => (
                  <motion.div key={msg.id} initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="email-item" onClick={() => openEmail(msg.id)}>
                    <div className="email-item-info">
                      <span className="email-sender">{msg.from.name || msg.from.address}</span>
                      <span className="email-subject">{msg.subject}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span className="email-time">{formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}</span>
                      <ChevronRight size={18} color="var(--border)" />
                    </div>
                  </motion.div>
                ))
              ) : !loading && (
                <div className="empty-state">
                  <Inbox size={48} className="empty-icon" />
                  <p>Inboxes are cleared every cycle.<br />Waiting for encrypted traffic...</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </main>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQR && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setShowQR(false)}>
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              exit={{ scale: 0.9, y: 20 }} 
              className="modal-content" 
              style={{ maxWidth: '400px', textAlign: 'center', padding: '2rem' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Scan Identity</h3>
                <button className="btn-icon" onClick={() => setShowQR(false)}><X size={24} /></button>
              </div>
              
              <div style={{ background: '#fff', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)', display: 'inline-block', boxShadow: 'var(--shadow)' }}>
                {account?.address && (
                  <QRCodeSVG 
                    value={account.address} 
                    size={200}
                    level="H"
                    includeMargin={false}
                  />
                )}
              </div>
              
              <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--secondary)', lineHeight: 1.5 }}>
                Scan this code with any mobile device to quickly copy your temporary address.
              </p>
              
              <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'var(--accent)', borderRadius: '10px', fontSize: '0.75rem', wordBreak: 'break-all', color: 'var(--foreground)', fontWeight: 600 }}>
                {account?.address}
              </div>

              <button 
                className="btn-primary" 
                style={{ marginTop: '1.5rem', width: '100%' }}
                onClick={() => setShowQR(false)}
              >
                Close Trace
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedEmail && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="modal-overlay" onClick={() => setSelectedEmail(null)}>
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-meta">
                  <h3 className="meta-subject">{selectedEmail.subject}</h3>
                  <div className="meta-info">Sender: {selectedEmail.from.address}</div>
                </div>
                <button className="btn-icon" onClick={() => setSelectedEmail(null)}><X size={24} /></button>
              </div>
              <div className="modal-body" style={{ background: '#fff' }}>
                {selectedEmail.html && selectedEmail.html.length > 0 ? (
                  <iframe title="mail-view" srcDoc={selectedEmail.html[0]} style={{ width: '100%', border: 'none', minHeight: '400px' }} />
                ) : (
                  <pre style={{ whiteSpace: 'pre-wrap', padding: '1rem' }}>{selectedEmail.text}</pre>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <footer style={{ marginTop: '3rem', padding: '2rem 1rem', textAlign: 'center', color: 'var(--secondary)', fontSize: '0.8125rem', borderTop: '1px solid var(--border)', width: '100%', maxWidth: '700px' }}>
        <p>© 2026 GHOSTLY Engine • Made by <span style={{ fontWeight: 700, color: 'var(--foreground)' }}>Avighna</span></p>
      </footer>

      <style>{`
        .animate-spin { animation: spin 1s linear infinite; }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
      `}</style>
    </div>
  );
};

export default App;
