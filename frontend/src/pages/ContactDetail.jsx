import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import API from '../api';
import {
  ArrowLeft, User, Send, Sparkles, MessageSquare, Tag, Save, Brain,
  X, Loader2, Pencil, Check, ChevronDown, Flag, CornerDownLeft, Bot
} from 'lucide-react';

const SOURCE_COLORS = {
  email: 'bg-blue-500',
  whatsapp: 'bg-green-500',
  viber: 'bg-purple-500',
  slack: 'bg-[#4a154b]'
};

const SOURCE_LABELS = {
  email: 'Email',
  whatsapp: 'WhatsApp',
  viber: 'Viber',
  slack: 'Slack'
};

const PRIORITY_CONFIG = {
  critical: { color: 'bg-red-500', text: 'text-white', label: 'KRITIČNO' },
  high:     { color: 'bg-orange-500', text: 'text-white', label: 'VISOKO' },
  medium:   { color: 'bg-yellow-500', text: 'text-gray-900', label: 'SREDNJE' },
  low:      { color: 'bg-gray-400', text: 'text-white', label: 'NISKO' }
};

const PRIORITY_OPTIONS = [
  { value: 'all', label: 'Sve' },
  { value: 'critical', label: 'Kritično' },
  { value: 'high', label: 'Visoko' },
  { value: 'medium', label: 'Srednje' },
  { value: 'low', label: 'Nisko' }
];

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatTime(d) {
  return new Date(d).toLocaleTimeString('sr', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('sr', { day: 'numeric', month: 'short', year: 'numeric' });
}

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

function PriorityBadge({ priority }) {
  const config = PRIORITY_CONFIG[priority];
  if (!config) return null;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${config.color} ${config.text}`}>
      {config.label}
    </span>
  );
}

function AutoResizeTextarea({ value, onChange, maxRows = 3, className = '', ...props }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 20;
    const maxHeight = lineHeight * maxRows + 20;
    el.style.height = Math.min(el.scrollHeight, maxHeight) + 'px';
  }, [value, maxRows]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      className={`resize-none ${className}`}
      {...props}
    />
  );
}

export default function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contact, setContact] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showInfo, setShowInfo] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showPriorityFilter, setShowPriorityFilter] = useState(false);

  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState('');

  const [quickReplyId, setQuickReplyId] = useState(null);
  const [quickReplyText, setQuickReplyText] = useState('');

  const [aiChatInput, setAiChatInput] = useState('');
  const [aiChatSending, setAiChatSending] = useState(false);
  const [aiChatHistory, setAiChatHistory] = useState([]);

  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  const [openPriorityId, setOpenPriorityId] = useState(null);
  const [inlineSendingId, setInlineSendingId] = useState(null);

  const messagesEndRef = useRef(null);
  const aiMessagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const filterRef = useRef(null);

  const loadContact = useCallback(async () => {
    try {
      const { data } = await API.get(`/contacts/${id}`);
      setContact(data);
      setNotes(data.notes || '');
      setTags(data.tags || '');
    } catch (e) {
      console.error(e);
    }
  }, [id]);

  const loadConversation = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get(`/contacts/${id}/conversation`);
      setConversation(data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadContact();
    loadConversation();
  }, [loadContact, loadConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation]);

  useEffect(() => {
    aiMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiChatHistory, showAiPanel]);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || '', {
      transports: ['websocket', 'polling']
    });
    socketRef.current = socket;
    socket.on('message:ai-ready', () => {
      loadConversation();
    });
    return () => socket.disconnect();
  }, [loadConversation]);

  useEffect(() => {
    function handleClick(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowPriorityFilter(false);
      }
      if (openPriorityId && !e.target.closest('.priority-dropdown')) {
        setOpenPriorityId(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openPriorityId]);

  useEffect(() => {
    setAiChatHistory(prev => {
      const existingIds = new Set(prev.map(m => String(m.id)));
      const newAiMsgs = conversation.filter(m => m.type === 'ai' && !existingIds.has(String(m.id)));
      if (newAiMsgs.length === 0) return prev;
      return [...prev, ...newAiMsgs];
    });
  }, [conversation]);

  async function saveContact() {
    setSavingContact(true);
    try {
      await API.patch(`/contacts/${id}`, { notes, tags });
      alert('Sačuvano!');
    } catch (e) {
      alert('Greška pri čuvanju');
    }
    setSavingContact(false);
  }

  async function sendReply() {
    if (!replyText.trim()) return;
    const lastReceived = [...conversation].reverse().find(m => m.type === 'received');
    if (!lastReceived) return;
    setSending(true);
    try {
      await API.post(`/messages/${lastReceived.id}/reply`, { replyText });
      setReplyText('');
      loadConversation();
    } catch (e) {
      alert(e.response?.data?.error || 'Greška pri slanju');
    }
    setSending(false);
  }

  async function sendEditedReply(messageId) {
    if (!editText.trim()) return;
    setInlineSendingId(messageId);
    try {
      await API.post(`/messages/${messageId}/reply`, { replyText: editText });
      setEditingMessageId(null);
      setEditText('');
      loadConversation();
    } catch (e) {
      alert(e.response?.data?.error || 'Greška pri slanju');
    }
    setInlineSendingId(null);
  }

  async function sendDirectReply(messageId, text) {
    if (!text?.trim()) return;
    setInlineSendingId(messageId);
    try {
      await API.post(`/messages/${messageId}/reply`, { replyText: text });
      loadConversation();
    } catch (e) {
      alert(e.response?.data?.error || 'Greška pri slanju');
    }
    setInlineSendingId(null);
  }

  async function sendQuickReply(messageId) {
    if (!quickReplyText.trim()) return;
    setInlineSendingId(`quick-${messageId}`);
    try {
      await API.post(`/messages/${messageId}/reply`, { replyText: quickReplyText });
      setQuickReplyId(null);
      setQuickReplyText('');
      loadConversation();
    } catch (e) {
      alert(e.response?.data?.error || 'Greška pri slanju');
    }
    setInlineSendingId(null);
  }

  async function updatePriority(messageId, priority) {
    try {
      await API.patch(`/messages/${messageId}/priority`, { priority });
      setOpenPriorityId(null);
      loadConversation();
    } catch (e) {
      alert('Greška pri izmeni prioriteta');
    }
  }

  async function sendAiChat() {
    if (!aiChatInput.trim()) return;
    const lastReceived = [...conversation].reverse().find(m => m.type === 'received');
    if (!lastReceived) return;

    const userMsg = {
      type: 'user',
      content: aiChatInput,
      createdAt: new Date().toISOString(),
      id: `tmp-${Date.now()}`
    };
    setAiChatHistory(prev => [...prev, userMsg]);
    setAiChatInput('');
    setAiChatSending(true);

    try {
      await API.post(`/messages/${lastReceived.id}/chat`, { content: aiChatInput });
    } catch (e) {
      alert(e.response?.data?.error || 'Greška');
    }
    setAiChatSending(false);
  }

  const filteredConversation = useMemo(() => {
    if (priorityFilter === 'all') return conversation;
    return conversation.filter(m => {
      if (m.type !== 'received') return true;
      return m.priority === priorityFilter;
    });
  }, [conversation, priorityFilter]);

  const grouped = useMemo(() => groupByDay(filteredConversation), [filteredConversation]);

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-full text-text-primary">
        <Loader2 className="animate-spin mr-2" /> Učitavanje...
      </div>
    );
  }

  const lastReceived = [...conversation].reverse().find(m => m.type === 'received');

  const InfoContent = () => (
    <>
      <div className="text-center mb-5">
        <div className={`w-20 h-20 rounded-full ${SOURCE_COLORS[contact.source] || 'bg-gray-500'} flex items-center justify-center text-white font-bold text-2xl mx-auto mb-3`}>
          {getInitials(contact.name)}
        </div>
        <h2 className="font-bold text-text-primary text-lg">{contact.name}</h2>
        <p className="text-xs text-text-secondary mt-0.5">{contact.address}</p>
        <span className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-bg-secondary border border-border text-[10px] text-text-muted uppercase tracking-wide font-medium">
          <span className={`w-1.5 h-1.5 rounded-full ${SOURCE_COLORS[contact.source] || 'bg-gray-400'}`} />
          {SOURCE_LABELS[contact.source] || contact.source}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-bg-secondary border border-border p-3 rounded-btn text-center">
          <div className="text-xl font-bold text-text-primary">{contact.messageCount}</div>
          <div className="text-[10px] text-text-secondary uppercase tracking-wide mt-0.5 font-medium">Poruka</div>
        </div>
        <div className="bg-bg-secondary border border-border p-3 rounded-btn text-center">
          <div className="text-sm font-bold text-text-primary">{new Date(contact.firstSeen).toLocaleDateString('sr')}</div>
          <div className="text-[10px] text-text-secondary uppercase tracking-wide mt-0.5 font-medium">Prvi kontakt</div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-text-secondary flex items-center gap-1.5 mb-1.5 font-medium">
            <Tag size={12} /> Tagovi
          </label>
          <input
            value={tags}
            onChange={e => setTags(e.target.value)}
            className="w-full bg-input-bg border border-input-border rounded-btn px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="Oznake odvojene zarezom..."
          />
        </div>
        <div>
          <label className="text-xs text-text-secondary mb-1.5 block font-medium">Beleške</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full bg-input-bg border border-input-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-blue-500 min-h-[100px] text-text-primary resize-none transition-colors"
            placeholder="Dodaj belešku..."
          />
        </div>
        <button
          onClick={saveContact}
          disabled={savingContact}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-btn text-sm flex items-center justify-center gap-2 transition-colors font-medium"
        >
          {savingContact ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Sačuvaj
        </button>
      </div>

      {contact.aiSummary && (
        <div className="mt-5 p-3 bg-ai-bg border border-ai-border rounded-btn">
          <div className="text-ai-text text-[10px] font-semibold mb-1 uppercase tracking-wide flex items-center gap-1">
            <Sparkles size={10} /> AI Profil
          </div>
          <p className="text-xs text-ai-text/90 leading-relaxed">{contact.aiSummary}</p>
        </div>
      )}
    </>
  );

  return (
    <div className="flex flex-col h-full bg-bg relative">
      {/* ===== HEADER ===== */}
      <header className="bg-card border-b border-border px-3 py-2.5 flex items-center gap-2 shrink-0 z-10">
        <button
          onClick={() => navigate('/contacts')}
          className="p-2 hover:bg-surface-hover rounded-btn text-text-secondary transition-colors"
          title="Nazad"
        >
          <ArrowLeft size={20} />
        </button>

        <div className={`w-9 h-9 rounded-full ${SOURCE_COLORS[contact.source] || 'bg-gray-500'} flex items-center justify-center text-white font-bold text-xs shrink-0`}>
          {getInitials(contact.name)}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-text-primary text-sm truncate">{contact.name}</h1>
          <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
            <span>{contact.messageCount} poruka</span>
            <span>·</span>
            <span className={`inline-block w-2 h-2 rounded-full ${SOURCE_COLORS[contact.source] || 'bg-gray-400'}`} />
            <span className="uppercase text-[10px] tracking-wide">{SOURCE_LABELS[contact.source] || contact.source}</span>
          </div>
        </div>

        {/* Priority Filter */}
        <div className="relative hidden sm:block" ref={filterRef}>
          <button
            onClick={() => setShowPriorityFilter(!showPriorityFilter)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-text-secondary hover:bg-surface-hover rounded-btn transition-colors border border-border"
          >
            <Flag size={12} />
            <span>{PRIORITY_OPTIONS.find(o => o.value === priorityFilter)?.label}</span>
            <ChevronDown size={12} />
          </button>
          {showPriorityFilter && (
            <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-card shadow-lg z-50 py-1 min-w-[140px]">
              {PRIORITY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setPriorityFilter(opt.value); setShowPriorityFilter(false); }}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-surface-hover transition-colors ${priorityFilter === opt.value ? 'text-blue-500 font-medium' : 'text-text-secondary'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => { setShowInfo(false); setShowAiPanel(true); }}
          className="p-2 hover:bg-surface-hover rounded-btn text-text-secondary transition-colors"
          title="AI Chat"
        >
          <Brain size={18} />
        </button>

        <button
          onClick={() => { setShowAiPanel(false); setShowInfo(!showInfo); }}
          className={`p-2 rounded-btn transition-colors ${showInfo ? 'bg-blue-600/10 text-blue-500' : 'text-text-secondary hover:bg-surface-hover'}`}
          title="Informacije"
        >
          <User size={18} />
        </button>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-1">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-blue-500" size={28} />
              </div>
            ) : grouped.length === 0 ? (
              <div className="text-center py-20 text-text-muted text-sm">Nema poruka sa ovim kontaktom</div>
            ) : (
              grouped.map((item, i) => {
                if (item.type === 'date') {
                  return (
                    <div key={`d-${i}`} className="flex justify-center my-4">
                      <span className="text-[10px] text-text-muted bg-surface px-3 py-1 rounded-full uppercase tracking-wide font-medium">
                        {formatDate(item.date)}
                      </span>
                    </div>
                  );
                }

                const isReceived = item.type === 'received';
                const isSent = item.type === 'sent';
                const isAi = item.type === 'ai';
                const isEditing = editingMessageId === item.id;
                const isQuickReply = quickReplyId === item.id;
                const isSending = inlineSendingId === item.id;
                const isQuickSending = inlineSendingId === `quick-${item.id}`;

                return (
                  <div key={`${item.type}-${item.id}-${i}`} className="mb-3">
                    <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} gap-2`}>
                      {/* Avatar for received/ai */}
                      {(isReceived || isAi) && (
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 mt-1 ${
                          isAi
                            ? 'bg-ai-bg border border-ai-border'
                            : (SOURCE_COLORS[item.source] || SOURCE_COLORS[contact.source] || 'bg-gray-500')
                        }`}>
                          {isAi ? <Bot size={12} className="text-ai-text" /> : getInitials(item.fromName || contact.name)}
                        </div>
                      )}

                      <div className={`max-w-[80%] md:max-w-[60%] ${isSent ? 'order-1' : 'order-2'}`}>
                        {/* Bubble */}
                        <div className={`relative px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm transition-all ${
                          isSent
                            ? 'bg-blue-600 text-white rounded-br-md'
                            : isAi
                              ? 'bg-ai-bg border border-ai-border text-ai-text rounded-bl-md'
                              : 'bg-surface border border-border text-text-primary rounded-bl-md hover:brightness-[1.02]'
                        }`}>
                          {isReceived && item.subject && (
                            <div className="text-xs font-semibold text-text-secondary mb-1">{item.subject}</div>
                          )}

                          {/* AI Summary */}
                          {isReceived && item.aiSummary && (
                            <div className="mb-2 p-2 bg-ai-bg/60 border border-ai-border/40 rounded-btn">
                              <div className="flex items-center gap-1 text-ai-text text-[10px] font-semibold mb-0.5 uppercase">
                                <Sparkles size={10} /> AI Sažetak
                              </div>
                              <p className="text-[11px] text-ai-text/90 leading-snug">{item.aiSummary}</p>
                            </div>
                          )}

                          {/* Content */}
                          <p className="whitespace-pre-wrap">{item.content}</p>

                          {/* Suggested Reply */}
                          {isReceived && item.aiReply && !isEditing && (
                            <div className="mt-2 pt-2 border-t border-border/50">
                              <div className="flex items-center gap-1 text-reply-text text-[10px] font-semibold mb-1 uppercase">
                                <MessageSquare size={10} /> Predloženi odgovor
                              </div>
                              <p className="text-[11px] text-text-secondary italic leading-snug mb-2">{item.aiReply}</p>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => { setEditingMessageId(item.id); setEditText(item.aiReply); }}
                                  className="flex items-center gap-1 px-2 py-1 rounded-btn text-[11px] bg-surface border border-border text-text-secondary hover:bg-surface-hover transition-colors"
                                >
                                  <Pencil size={10} /> Izmeni
                                </button>
                                <button
                                  onClick={() => sendDirectReply(item.id, item.aiReply)}
                                  disabled={isSending}
                                  className="flex items-center gap-1 px-2 py-1 rounded-btn text-[11px] bg-reply-bg border border-reply-border text-reply-text hover:brightness-95 transition-colors disabled:opacity-60"
                                >
                                  {isSending ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                                  Pošalji
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Editing Mode */}
                          {isReceived && isEditing && (
                            <div className="mt-2 pt-2 border-t border-border/50">
                              <div className="flex items-center gap-1 text-reply-text text-[10px] font-semibold mb-1 uppercase">
                                <Pencil size={10} /> Izmeni odgovor
                              </div>
                              <AutoResizeTextarea
                                value={editText}
                                onChange={e => setEditText(e.target.value)}
                                className="w-full bg-bg border border-input-border rounded-btn px-2.5 py-2 text-xs text-text-primary focus:outline-none focus:border-blue-500 mb-2"
                                placeholder="Izmeni odgovor..."
                                maxRows={4}
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => sendEditedReply(item.id)}
                                  disabled={isSending || !editText.trim()}
                                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-btn text-[11px] bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
                                >
                                  {isSending ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                                  Pošalji
                                </button>
                                <button
                                  onClick={() => { setEditingMessageId(null); setEditText(''); }}
                                  className="px-2.5 py-1.5 rounded-btn text-[11px] bg-surface border border-border text-text-secondary hover:bg-surface-hover transition-colors"
                                >
                                  Otkaži
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Priority selector */}
                          {isReceived && (
                            <div className="absolute -top-2 -right-2 priority-dropdown">
                              <button
                                onClick={() => setOpenPriorityId(openPriorityId === item.id ? null : item.id)}
                                className="w-5 h-5 rounded-full bg-card border border-border shadow-sm flex items-center justify-center text-text-muted hover:text-text-secondary transition-colors"
                                title="Prioritet"
                              >
                                <Flag size={10} />
                              </button>
                              {openPriorityId === item.id && (
                                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-card shadow-lg z-20 py-1 min-w-[110px]">
                                  <button
                                    onClick={() => updatePriority(item.id, null)}
                                    className="w-full text-left px-2.5 py-1 text-[10px] text-text-secondary hover:bg-surface-hover flex items-center gap-1.5"
                                  >
                                    <span className="w-2 h-2 rounded-full bg-gray-300" />
                                    Bez prioriteta
                                  </button>
                                  {Object.entries(PRIORITY_CONFIG).map(([key, conf]) => (
                                    <button
                                      key={key}
                                      onClick={() => updatePriority(item.id, key)}
                                      className="w-full text-left px-2.5 py-1 text-[10px] text-text-secondary hover:bg-surface-hover flex items-center gap-1.5"
                                    >
                                      <span className={`w-2 h-2 rounded-full ${conf.color}`} />
                                      {conf.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Timestamp & Priority */}
                        <div className={`flex items-center gap-1.5 mt-1 ${isSent ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-[10px] text-text-muted">{formatTime(item.createdAt)}</span>
                          {isReceived && item.priority && <PriorityBadge priority={item.priority} />}
                          {isSent && <Check size={10} className="text-blue-300" />}
                        </div>
                      </div>
                    </div>

                    {/* Quick reply row */}
                    {isReceived && (
                      <div className={`flex mt-1 pl-9 ${isSent ? 'justify-end' : 'justify-start'}`}>
                        {!isQuickReply ? (
                          <button
                            onClick={() => setQuickReplyId(item.id)}
                            className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text-secondary transition-colors px-2 py-1 rounded-btn hover:bg-surface"
                          >
                            <CornerDownLeft size={10} /> Brzi odgovor
                          </button>
                        ) : (
                          <div className="w-full max-w-[80%] md:max-w-[60%]">
                            <div className="flex gap-2 items-end">
                              <AutoResizeTextarea
                                value={quickReplyText}
                                onChange={e => setQuickReplyText(e.target.value)}
                                className="flex-1 bg-bg border border-input-border rounded-btn px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-blue-500"
                                placeholder="Napiši brzi odgovor..."
                                maxRows={3}
                                autoFocus
                              />
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => sendQuickReply(item.id)}
                                  disabled={isQuickSending || !quickReplyText.trim()}
                                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-btn transition-colors flex items-center justify-center"
                                >
                                  {isQuickSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                </button>
                                <button
                                  onClick={() => { setQuickReplyId(null); setQuickReplyText(''); }}
                                  className="bg-surface hover:bg-surface-hover border border-border text-text-secondary px-3 py-1.5 rounded-btn transition-colors flex items-center justify-center"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Reply Input */}
          <div className="shrink-0 border-t border-border bg-card px-3 py-2.5 md:px-4 md:py-3">
            <div className="flex gap-2 items-end">
              <AutoResizeTextarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
                placeholder={lastReceived ? 'Napiši odgovor...' : 'Nema primljenih poruka za odgovor'}
                className="flex-1 bg-input-bg border border-input-border rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-text-primary min-h-[44px]"
                maxRows={3}
                disabled={!lastReceived}
              />
              <button
                onClick={sendReply}
                disabled={sending || !replyText.trim() || !lastReceived}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white px-4 py-2.5 rounded-btn transition-colors flex items-center justify-center shrink-0 h-[44px]"
              >
                {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Info Sidebar */}
        {showInfo && (
          <div className="hidden lg:flex flex-col w-80 border-l border-border bg-card shrink-0 overflow-y-auto z-10 p-5">
            <InfoContent />
          </div>
        )}
      </div>

      {/* Mobile Info Overlay */}
      {showInfo && (
        <div className="lg:hidden absolute inset-0 z-[50] flex flex-col">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowInfo(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-card max-h-[85%] flex flex-col z-[60]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <h3 className="font-semibold text-text-primary">Informacije</h3>
              <button onClick={() => setShowInfo(false)} className="p-2 hover:bg-surface-hover rounded-btn text-text-secondary">
                <X size={18} />
              </button>
            </div>
            <div className="overflow-y-auto p-4">
              <InfoContent />
            </div>
          </div>
        </div>
      )}

      {/* ===== AI CHAT PANEL ===== */}
      {showAiPanel && (
        <>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/20 z-[50]" onClick={() => setShowAiPanel(false)} />

          {/* Desktop Panel */}
          <div className="hidden md:flex flex-col absolute inset-y-0 right-0 w-[400px] bg-card border-l border-border shadow-2xl z-[60]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0 bg-bg-secondary">
              <div className="flex items-center gap-2">
                <Brain size={18} className="text-ai-text" />
                <h3 className="font-semibold text-text-primary text-sm truncate">AI Asistent — {contact.name}</h3>
              </div>
              <button onClick={() => setShowAiPanel(false)} className="p-2 hover:bg-surface-hover rounded-btn text-text-secondary">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {aiChatHistory.length === 0 ? (
                <div className="text-center py-10 text-text-muted text-sm">
                  Postavite pitanje AI asistentu o ovom kontaktu.
                </div>
              ) : (
                aiChatHistory.map((msg, i) => (
                  <div key={`ai-${msg.id}-${i}`} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.type === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-ai-bg border border-ai-border text-ai-text rounded-bl-md'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {aiChatSending && (
                <div className="flex justify-start">
                  <div className="bg-ai-bg border border-ai-border rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-ai-text/40 animate-pulse-dot" />
                      <span className="w-2 h-2 rounded-full bg-ai-text/40 animate-pulse-dot" style={{ animationDelay: '0.2s' }} />
                      <span className="w-2 h-2 rounded-full bg-ai-text/40 animate-pulse-dot" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={aiMessagesEndRef} />
            </div>
            <div className="shrink-0 border-t border-border bg-card px-4 py-3">
              <div className="flex gap-2 items-end">
                <AutoResizeTextarea
                  value={aiChatInput}
                  onChange={e => setAiChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiChat(); } }}
                  placeholder="Pitaj AI asistenta..."
                  className="flex-1 bg-input-bg border border-input-border rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-text-primary min-h-[44px]"
                  maxRows={3}
                />
                <button
                  onClick={sendAiChat}
                  disabled={aiChatSending || !aiChatInput.trim()}
                  className="bg-ai-text hover:brightness-110 disabled:opacity-50 text-white px-4 py-2.5 rounded-btn transition-colors flex items-center justify-center shrink-0 h-[44px]"
                >
                  {aiChatSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </div>
          </div>

          {/* Mobile Bottom Sheet */}
          <div className="md:hidden absolute bottom-0 left-0 right-0 bg-card rounded-t-card max-h-[85%] flex flex-col z-[60]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Brain size={18} className="text-ai-text shrink-0" />
                <h3 className="font-semibold text-text-primary text-sm truncate">AI Asistent — {contact.name}</h3>
              </div>
              <button onClick={() => setShowAiPanel(false)} className="p-2 hover:bg-surface-hover rounded-btn text-text-secondary shrink-0">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {aiChatHistory.length === 0 ? (
                <div className="text-center py-10 text-text-muted text-sm">
                  Postavite pitanje AI asistentu o ovom kontaktu.
                </div>
              ) : (
                aiChatHistory.map((msg, i) => (
                  <div key={`ai-m-${msg.id}-${i}`} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.type === 'user'
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-ai-bg border border-ai-border text-ai-text rounded-bl-md'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ))
              )}
              {aiChatSending && (
                <div className="flex justify-start">
                  <div className="bg-ai-bg border border-ai-border rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-ai-text/40 animate-pulse-dot" />
                      <span className="w-2 h-2 rounded-full bg-ai-text/40 animate-pulse-dot" style={{ animationDelay: '0.2s' }} />
                      <span className="w-2 h-2 rounded-full bg-ai-text/40 animate-pulse-dot" style={{ animationDelay: '0.4s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={aiMessagesEndRef} />
            </div>
            <div className="shrink-0 border-t border-border bg-card px-4 py-3">
              <div className="flex gap-2 items-end">
                <AutoResizeTextarea
                  value={aiChatInput}
                  onChange={e => setAiChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiChat(); } }}
                  placeholder="Pitaj AI asistenta..."
                  className="flex-1 bg-input-bg border border-input-border rounded-btn px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-text-primary min-h-[44px]"
                  maxRows={3}
                />
                <button
                  onClick={sendAiChat}
                  disabled={aiChatSending || !aiChatInput.trim()}
                  className="bg-ai-text hover:brightness-110 disabled:opacity-50 text-white px-4 py-2.5 rounded-btn transition-colors flex items-center justify-center shrink-0 h-[44px]"
                >
                  {aiChatSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
