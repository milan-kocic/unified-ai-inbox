import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import { ArrowLeft, User, Send, Sparkles, MessageSquare, Tag, Save, Calendar, Loader2 } from 'lucide-react';

const SOURCE_COLORS = { email: 'bg-blue-500', whatsapp: 'bg-green-500', viber: 'bg-purple-500', slack: 'bg-[#4a154b]' };

function getInitials(name) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export default function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    loadContact();
    loadConversation();
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  async function loadContact() {
    try {
      const { data } = await API.get(`/contacts/${id}`);
      setContact(data);
      setNotes(data.notes || '');
      setTags(data.tags || '');
    } catch (e) {}
  }

  async function loadConversation() {
    setLoading(true);
    try {
      const { data } = await API.get(`/contacts/${id}/conversation`);
      setConversation(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function saveContact() {
    await API.patch(`/contacts/${id}`, { notes, tags });
    alert('Sačuvano!');
  }

  async function sendReply() {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      // Pronađi poslednju primljenu poruku da znaš na koju odgovaraš
      const lastReceived = [...conversation].reverse().find(m => m.type === 'received');
      if (lastReceived) {
        await API.post(`/messages/${lastReceived.id}/reply`, { replyText });
        setReplyText('');
        loadConversation(); // Osveži da se prikaže poslata poruka
      }
    } catch (e) {
      alert(e.response?.data?.error || 'Greška pri slanju');
    }
    setSending(false);
  }

  function formatTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString('sr', { hour: '2-digit', minute: '2-digit' });
  }
  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('sr', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // Grupiši po danu
  function groupByDay(items) {
    const groups = [];
    let currentDay = null;
    for (const item of items) {
      const day = new Date(item.createdAt).toDateString();
      if (day !== currentDay) {
        currentDay = day;
        groups.push({ type: 'date', date: item.createdAt });
      }
      groups.push(item);
    }
    return groups;
  }

  const grouped = groupByDay(conversation);

  if (!contact) return <div className="p-6 text-text-primary flex items-center justify-center h-screen"><Loader2 className="animate-spin mr-2" /> Učitavanje...</div>;

  return (
    <div className="flex flex-col h-full bg-bg">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 shrink-0">
        <button onClick={() => navigate('/contacts')} className="p-2 hover:bg-surface-hover rounded-btn text-text-secondary transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className={`w-10 h-10 rounded-full ${SOURCE_COLORS[contact.source] || 'bg-gray-500'} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
          {getInitials(contact.name)}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-text-primary truncate">{contact.name}</h1>
          <p className="text-xs text-text-muted truncate">{contact.address} · {contact.messageCount} poruka</p>
        </div>
        <button onClick={() => setShowInfo(!showInfo)}
          className="p-2 hover:bg-surface-hover rounded-btn text-text-secondary transition-colors">
          <User size={18} />
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-500" size={28} /></div>
            ) : grouped.length === 0 ? (
              <div className="text-center py-20 text-text-muted">Nema poruka sa ovim kontaktom</div>
            ) : (
              grouped.map((item, i) => {
                if (item.type === 'date') {
                  return (
                    <div key={`d-${i}`} className="flex justify-center my-4">
                      <span className="text-[10px] text-text-muted bg-surface px-3 py-1 rounded-full uppercase tracking-wide">
                        {formatDate(item.date)}
                      </span>
                    </div>
                  );
                }

                const isReceived = item.type === 'received';
                const isSent = item.type === 'sent';
                const isAi = item.type === 'ai';

                return (
                  <div key={`${item.type}-${item.id}-${i}`} className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-3`}>
                    <div className={`max-w-[80%] md:max-w-[65%] ${isSent ? 'order-2' : 'order-1'}`}>
                      {/* Bubble */}
                      <div className={`relative px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        isSent
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : isAi
                            ? 'bg-ai-bg border border-ai-border text-ai-text rounded-bl-md'
                            : 'bg-surface border border-border text-text-primary rounded-bl-md'
                      }`}>
                        {isReceived && item.subject && (
                          <div className="text-xs font-semibold text-text-secondary mb-1">{item.subject}</div>
                        )}
                        {isReceived && item.aiSummary && (
                          <div className="mb-2 p-2 bg-ai-bg/50 border border-ai-border/30 rounded-btn">
                            <div className="flex items-center gap-1 text-ai-text text-[10px] font-semibold mb-0.5 uppercase">
                              <Sparkles size={10} /> AI Sažetak
                            </div>
                            <p className="text-[11px] text-ai-text/80">{item.aiSummary}</p>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{item.content}</p>
                        {isReceived && item.aiReply && !isAi && (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <div className="flex items-center gap-1 text-reply-text text-[10px] font-semibold mb-1 uppercase">
                              <MessageSquare size={10} /> Predloženi odgovor
                            </div>
                            <p className="text-[11px] text-text-secondary italic">{item.aiReply}</p>
                          </div>
                        )}
                      </div>
                      {/* Timestamp */}
                      <div className={`flex items-center gap-1 mt-1 ${isSent ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-[10px] text-text-muted">{formatTime(item.createdAt)}</span>
                        {isSent && <span className="text-[10px] text-blue-400">✓</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Reply input */}
          <div className="shrink-0 border-t border-border bg-card px-4 py-3">
            <div className="flex gap-2">
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                placeholder="Napiši odgovor..."
                className="flex-1 bg-input-bg border border-input-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-text-primary resize-none min-h-[44px] max-h-[120px]"
                rows={1}
              />
              <button
                onClick={sendReply}
                disabled={sending || !replyText.trim()}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white px-4 rounded-btn transition-colors flex items-center justify-center shrink-0"
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Info sidebar (desktop) */}
        {showInfo && (
          <div className="hidden lg:flex flex-col w-72 border-l border-border bg-card p-4 shrink-0 overflow-y-auto">
            <div className="text-center mb-4">
              <div className={`w-16 h-16 rounded-full ${SOURCE_COLORS[contact.source] || 'bg-gray-500'} flex items-center justify-center text-white font-bold text-xl mx-auto mb-2`}>
                {getInitials(contact.name)}
              </div>
              <h2 className="font-bold text-text-primary">{contact.name}</h2>
              <p className="text-xs text-text-secondary">{contact.address}</p>
              <p className="text-xs text-text-muted mt-1 uppercase tracking-wide">{contact.source}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="bg-bg-secondary border border-border p-2 rounded-btn text-center">
                <div className="text-lg font-bold text-text-primary">{contact.messageCount}</div>
                <div className="text-[10px] text-text-secondary">Poruka</div>
              </div>
              <div className="bg-bg-secondary border border-border p-2 rounded-btn text-center">
                <div className="text-lg font-bold text-text-primary">{new Date(contact.firstSeen).toLocaleDateString('sr')}</div>
                <div className="text-[10px] text-text-secondary">Od</div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-text-secondary flex items-center gap-1 mb-1"><Tag size={12} /> Tagovi</label>
                <input value={tags} onChange={e => setTags(e.target.value)}
                  className="w-full bg-input-bg border border-input-border rounded-btn px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Beleške</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  className="w-full bg-input-bg border border-input-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-blue-500 min-h-[80px] text-text-primary" />
              </div>
              <button onClick={saveContact}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-btn text-sm flex items-center justify-center gap-2 transition-colors">
                <Save size={14} /> Sačuvaj
              </button>
            </div>

            {contact.aiSummary && (
              <div className="mt-4 p-3 bg-ai-bg border border-ai-border rounded-btn">
                <div className="text-ai-text text-[10px] font-semibold mb-1 uppercase">AI Profil</div>
                <p className="text-xs text-ai-text/80">{contact.aiSummary}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
