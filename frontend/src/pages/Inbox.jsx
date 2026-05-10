import React, { useEffect, useState, useRef } from 'react';
import API from '../api';
import { io } from 'socket.io-client';
import { Mail, Smartphone, MessageCircle, Hash, Send, Trash2, X, Sparkles, Loader2, Edit3, Link as LinkIcon, MessageSquare, Check, Copy } from 'lucide-react';

const SOURCE_COLORS = { email: 'bg-email', whatsapp: 'bg-whatsapp', viber: 'bg-viber', slack: 'bg-slack' };
const SOURCE_ICONS = { email: Mail, whatsapp: Smartphone, viber: MessageCircle, slack: Hash };
const SOURCE_LABELS = { email: 'EMAIL', whatsapp: 'WHATSAPP', viber: 'VIBER', slack: 'SLACK' };

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function MessageModal({ message, onClose }) {
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [contact, setContact] = useState(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (message) {
      API.get(`/messages/${message.id}`).then(r => {
        setChatHistory(r.data.chatHistory || []);
        setContact(r.data.contact);
        setReplyText(message.aiReply || '');
      });
    }
  }, [message]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  async function sendChat() {
    if (!chatInput.trim()) return;
    await API.post(`/messages/${message.id}/chat`, { content: chatInput });
    setChatHistory(prev => [...prev, { role: 'user', content: chatInput }]);
    setChatInput('');
  }

  async function sendReply() {
    setSending(true);
    try {
      await API.post(`/messages/${message.id}/reply`, { replyText: replyText || message.aiReply || '' });
      alert('Odgovor poslat!');
      onClose();
    } catch (e) {
      alert(e.response?.data?.error || 'Greška');
    }
    setSending(false);
  }

  if (!message) return null;
  const Icon = SOURCE_ICONS[message.source] || Mail;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-modal-bg" onClick={onClose}>
      <div className="bg-card w-full max-w-4xl max-h-[90vh] rounded-card border border-border flex flex-col md:flex-row overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex-1 flex flex-col min-h-0 border-r border-border">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${SOURCE_COLORS[message.source]} flex items-center justify-center`}>
                <Icon size={18} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-text-primary">{message.fromName}</h3>
                <p className="text-xs text-text-muted">{message.source} · {message.fromAddress}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-surface-hover rounded-btn text-text-secondary"><X size={18} /></button>
          </div>

          <div className="p-4 border-b border-border overflow-auto">
            {message.subject && <h4 className="font-medium mb-2 text-text-secondary">{message.subject}</h4>}
            <p className="text-sm text-text-secondary whitespace-pre-wrap">{message.body}</p>
            <p className="text-xs text-text-muted mt-2">{new Date(message.receivedAt).toLocaleString('sr')}</p>
          </div>

          {message.aiSummary && (
            <div className="mx-4 mt-3 p-3 bg-ai-bg border border-ai-border rounded-btn">
              <div className="flex items-center gap-2 text-ai-text text-xs font-medium mb-1"><Sparkles size={14} /> AI Sažetak</div>
              <p className="text-sm text-text-secondary">{message.aiSummary}</p>
            </div>
          )}

          {message.aiReply && (
            <div className="mx-4 mt-3">
              <label className="text-xs text-text-muted">Predloženi odgovor:</label>
              <textarea value={replyText || message.aiReply} onChange={e => setReplyText(e.target.value)}
                className="w-full mt-1 bg-input-bg border border-input-border rounded-btn p-3 text-sm focus:outline-none focus:border-blue-500 min-h-[80px] text-text-primary" />
              <div className="flex gap-2 mt-2">
                <button onClick={sendReply} disabled={sending}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-btn flex items-center gap-2 disabled:opacity-50">
                  <Send size={14} /> {sending ? 'Šalje se...' : 'Pošalji'}
                </button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto p-4 space-y-3 min-h-0">
            <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider">AI Chat</h4>
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-btn text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-surface text-text-primary'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          <div className="p-3 border-t border-border flex gap-2">
            <input value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChat()}
              className="flex-1 bg-input-bg border border-input-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-text-primary"
              placeholder="Pitaj AI asistenta..." />
            <button onClick={sendChat} className="bg-blue-600 hover:bg-blue-500 text-white px-3 rounded-btn"><Send size={16} /></button>
          </div>
        </div>

        <div className="w-full md:w-80 p-4 border-t md:border-t-0 border-border">
          {contact ? (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-lg text-text-primary">{contact.name}</h4>
                <p className="text-sm text-text-secondary">{contact.address}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-bg-secondary p-3 rounded-btn border border-border"><div className="text-text-muted text-xs">Poruka</div><div className="font-semibold text-text-primary">{contact.messageCount}</div></div>
                <div className="bg-bg-secondary p-3 rounded-btn border border-border"><div className="text-text-muted text-xs">Od</div><div className="font-semibold text-text-primary">{new Date(contact.firstSeen).toLocaleDateString('sr')}</div></div>
              </div>
              {contact.aiSummary && (
                <div className="bg-bg-secondary p-3 rounded-btn border border-border">
                  <div className="text-text-muted text-xs mb-1">AI Profil</div>
                  <p className="text-sm text-text-secondary">{contact.aiSummary}</p>
                </div>
              )}
              {contact.tags && (
                <div className="flex flex-wrap gap-1">
                  {contact.tags.split(',').map(t => (
                    <span key={t} className="bg-surface text-text-secondary text-xs px-2 py-1 rounded-btn">{t.trim()}</span>
                  ))}
                </div>
              )}
              {contact.notes && <p className="text-sm text-text-secondary">{contact.notes}</p>}
            </div>
          ) : (
            <div className="text-text-muted text-sm">Nema kontakta</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Inbox() {
  const [messages, setMessages] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [aiNotSet, setAiNotSet] = useState(false);
  const [editingReply, setEditingReply] = useState({});
  const [replyDraft, setReplyDraft] = useState({});
  const [sendingId, setSendingId] = useState(null);

  useEffect(() => {
    API.get('/settings').then(r => {
      setAiNotSet(!r.data.aiProvider);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadMessages();
    const socket = io(import.meta.env.VITE_API_URL || '');
    socket.on('message:new', (msg) => {
      setMessages(prev => [msg, ...prev]);
    });
    socket.on('message:ai-ready', ({ messageId, type }) => {
      if (type === 'summary' || type === 'reply') {
        loadMessages();
      }
    });
    return () => socket.disconnect();
  }, []);

  async function loadMessages() {
    setLoading(true);
    try {
      const source = filter === 'all' || filter === 'unread' ? '' : filter;
      const unread = filter === 'unread' ? 'true' : '';
      const { data } = await API.get('/messages', { params: { source, unread } });
      setMessages(data.messages || data);
    } catch (e) {}
    setLoading(false);
  }

  useEffect(() => { loadMessages(); }, [filter]);

  async function markRead(id) {
    await API.patch(`/messages/${id}/read`);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: true } : m));
  }

  async function deleteMessage(id) {
    if (!confirm('Obrisati poruku?')) return;
    await API.delete(`/messages/${id}`);
    setMessages(prev => prev.filter(m => m.id !== id));
  }

  async function analyze(id) {
    await API.post(`/messages/${id}/summarize`);
    alert('AI analiza je pokrenuta.');
  }

  async function sendReplyInline(id) {
    const msg = messages.find(m => m.id === id);
    if (!msg) return;
    const text = replyDraft[id] || msg.aiReply || '';
    if (!text.trim()) return;
    setSendingId(id);
    try {
      await API.post(`/messages/${id}/reply`, { replyText: text });
      alert('Odgovor poslat!');
      setEditingReply(prev => ({ ...prev, [id]: false }));
    } catch (e) {
      alert(e.response?.data?.error || 'Greška pri slanju');
    }
    setSendingId(null);
  }

  function copyLink(id) {
    const url = `${window.location.origin}/messages/${id}`;
    navigator.clipboard.writeText(url).then(() => alert('Link kopiran!'));
  }

  function startEditReply(id, currentText) {
    setEditingReply(prev => ({ ...prev, [id]: true }));
    setReplyDraft(prev => ({ ...prev, [id]: currentText || '' }));
  }

  function cancelEditReply(id) {
    setEditingReply(prev => ({ ...prev, [id]: false }));
  }

  const filters = [
    { key: 'all', label: 'Sve' },
    { key: 'unread', label: 'Nepročitano' },
    { key: 'email', label: 'Email' },
    { key: 'whatsapp', label: 'WhatsApp' },
    { key: 'viber', label: 'Viber' },
    { key: 'slack', label: 'Slack' },
  ];

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Inbox</h1>
      </div>

      {aiNotSet && (
        <div className="mb-4 p-3 bg-ai-bg border border-ai-border rounded-btn text-ai-text text-sm">
          AI nije podešen. Idite u <a href="/settings" className="underline font-medium">Settings</a>.
        </div>
      )}

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {filters.map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-btn text-sm font-medium whitespace-nowrap transition-colors ${filter === f.key ? 'bg-text-primary text-bg' : 'bg-card border border-border text-text-secondary hover:text-text-primary hover:border-border-strong'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-500" size={32} /></div>
      ) : messages.length === 0 ? (
        <div className="text-center py-20 text-text-muted">Nema poruka</div>
      ) : (
        <div className="space-y-4">
          {messages.map(msg => {
            const Icon = SOURCE_ICONS[msg.source] || Mail;
            const color = SOURCE_COLORS[msg.source] || 'bg-gray-600';
            const isEditing = editingReply[msg.id];
            return (
              <div key={msg.id}
                className={`bg-card border rounded-card p-5 transition-colors ${!msg.isRead ? 'border-l-4 border-l-orange-400 border-border' : 'border-border'}`}>
                {/* Header row */}
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-11 h-11 rounded-full ${color} flex items-center justify-center shrink-0 text-white font-bold text-sm`}>
                    {getInitials(msg.fromName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-text-primary">{msg.fromName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${color}`}>
                        {SOURCE_LABELS[msg.source] || msg.source.toUpperCase()}
                      </span>
                      {!msg.isRead && <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse-dot" />}
                      <span className="text-xs text-text-muted ml-auto">{new Date(msg.receivedAt).toLocaleTimeString('sr', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {msg.subject && <div className="text-sm font-medium text-text-secondary mt-0.5">{msg.subject}</div>}
                    <p className="text-sm text-text-muted mt-1 line-clamp-2">{msg.body}</p>
                  </div>
                </div>

                {/* AI Summary */}
                {msg.aiSummary && (
                  <div className="mb-3 p-3 bg-ai-bg border border-ai-border rounded-btn">
                    <div className="flex items-center gap-2 text-ai-text text-xs font-semibold mb-1 uppercase tracking-wide">
                      <Sparkles size={12} /> AI Sažetak
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed">{msg.aiSummary}</p>
                  </div>
                )}

                {/* Suggested Reply */}
                {msg.aiReply && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 text-text-muted text-xs font-semibold mb-2 uppercase tracking-wide">
                      <MessageSquare size={12} /> Predloženi odgovor
                    </div>
                    {isEditing ? (
                      <div className="space-y-2">
                        <textarea
                          value={replyDraft[msg.id] || ''}
                          onChange={e => setReplyDraft(prev => ({ ...prev, [msg.id]: e.target.value }))}
                          className="w-full bg-input-bg border border-input-border rounded-btn p-3 text-sm focus:outline-none focus:border-blue-500 min-h-[100px] text-text-primary"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => sendReplyInline(msg.id)} disabled={sendingId === msg.id}
                            className="bg-green-600 hover:bg-green-500 text-white text-xs px-3 py-1.5 rounded-btn flex items-center gap-1 disabled:opacity-50">
                            {sendingId === msg.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            {sendingId === msg.id ? 'Šalje...' : 'Pošalji'}
                          </button>
                          <button onClick={() => cancelEditReply(msg.id)}
                            className="bg-surface hover:bg-surface-hover text-text-secondary text-xs px-3 py-1.5 rounded-btn">
                            Otkaži
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-reply-bg border border-reply-border rounded-btn p-3">
                        <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{msg.aiReply}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <button onClick={() => { markRead(msg.id); setSelected(msg); }}
                    className="text-xs bg-transparent border border-blue-500 text-blue-500 hover:bg-blue-500/10 px-3 py-1.5 rounded-btn transition-colors flex items-center gap-1">
                    <MessageSquare size={12} /> Otvori & Chat
                  </button>
                  {msg.aiReply && !isEditing && (
                    <button onClick={() => startEditReply(msg.id, msg.aiReply)}
                      className="text-xs bg-transparent border border-viber text-viber hover:bg-viber/10 px-3 py-1.5 rounded-btn transition-colors flex items-center gap-1">
                      <Edit3 size={12} /> Izmeni
                    </button>
                  )}
                  {msg.aiReply && !isEditing && (
                    <button onClick={() => sendReplyInline(msg.id)} disabled={sendingId === msg.id}
                      className="text-xs bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded-btn transition-colors flex items-center gap-1 disabled:opacity-50">
                      {sendingId === msg.id ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                      {sendingId === msg.id ? 'Šalje...' : 'Pošalji'}
                    </button>
                  )}
                  <button onClick={() => copyLink(msg.id)}
                    className="text-xs bg-transparent border border-border-strong text-text-secondary hover:bg-surface-hover px-3 py-1.5 rounded-btn transition-colors flex items-center gap-1">
                    <LinkIcon size={12} /> Link
                  </button>
                  <button onClick={() => deleteMessage(msg.id)}
                    className="text-xs bg-transparent border border-red-text text-red-text hover:bg-red-bg px-3 py-1.5 rounded-btn transition-colors flex items-center gap-1 ml-auto">
                    <Trash2 size={12} /> Briši
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && <MessageModal message={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
