import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api';
import { ArrowLeft, User, MessageSquare, Calendar, Tag, Save } from 'lucide-react';

export default function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [stats, setStats] = useState({ total: 0, email: 0, whatsapp: 0, viber: 0, slack: 0 });

  useEffect(() => {
    loadContact();
    loadMessages();
  }, [id]);

  async function loadContact() {
    try {
      const { data } = await API.get(`/contacts/${id}`);
      setContact(data);
      setNotes(data.notes || '');
      setTags(data.tags || '');
    } catch (e) {}
  }

  async function loadMessages() {
    try {
      const { data } = await API.get(`/contacts/${id}/messages`);
      setMessages(data);
      const s = { total: data.length, email: 0, whatsapp: 0, viber: 0, slack: 0 };
      data.forEach(m => { if (s[m.source] !== undefined) s[m.source]++; });
      setStats(s);
    } catch (e) {}
  }

  async function saveContact() {
    await API.patch(`/contacts/${id}`, { notes, tags });
    alert('Sačuvano!');
  }

  if (!contact) return <div className="p-6 text-text-primary">Učitavanje...</div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate('/contacts')} className="flex items-center gap-2 text-text-secondary hover:text-text-primary mb-4 transition-colors">
        <ArrowLeft size={18} /> Nazad
      </button>

      <div className="bg-card border border-border rounded-card p-6 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center">
            <User size={28} className="text-text-muted" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{contact.name}</h1>
            <p className="text-text-secondary">{contact.address} · {contact.source}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-bg-secondary border border-border p-3 rounded-btn text-center"><div className="text-2xl font-bold text-text-primary">{stats.total}</div><div className="text-xs text-text-secondary">Ukupno</div></div>
          <div className="bg-bg-secondary border border-border p-3 rounded-btn text-center"><div className="text-2xl font-bold text-text-primary">{stats.email}</div><div className="text-xs text-text-secondary">Email</div></div>
          <div className="bg-bg-secondary border border-border p-3 rounded-btn text-center"><div className="text-2xl font-bold text-text-primary">{stats.whatsapp}</div><div className="text-xs text-text-secondary">WhatsApp</div></div>
          <div className="bg-bg-secondary border border-border p-3 rounded-btn text-center"><div className="text-2xl font-bold text-text-primary">{stats.slack}</div><div className="text-xs text-text-secondary">Slack</div></div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary flex items-center gap-1 mb-1"><Tag size={14} /> Tagovi (odvojeni zarezom)</label>
            <input value={tags} onChange={e => setTags(e.target.value)}
              className="w-full bg-input-bg border border-input-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-blue-500 text-text-primary" />
          </div>
          <div>
            <label className="text-sm text-text-secondary mb-1 block">Beleške</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full bg-input-bg border border-input-border rounded-btn px-3 py-2 text-sm focus:outline-none focus:border-blue-500 min-h-[100px] text-text-primary" />
          </div>
          <button onClick={saveContact}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-btn text-sm flex items-center gap-2 transition-colors">
            <Save size={16} /> Sačuvaj
          </button>
        </div>
      </div>

      <h2 className="text-lg font-bold mb-4 text-text-primary">Istorija poruka</h2>
      <div className="space-y-3">
        {messages.map(m => (
          <div key={m.id} className="bg-card border border-border rounded-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-blue-500 uppercase">{m.source}</span>
              <span className="text-xs text-text-muted">{new Date(m.receivedAt).toLocaleString('sr')}</span>
            </div>
            {m.subject && <div className="text-sm font-medium text-text-secondary mb-1">{m.subject}</div>}
            <p className="text-sm text-text-secondary">{m.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
