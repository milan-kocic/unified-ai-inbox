import React, { useEffect, useState } from 'react';
import API from '../api';
import { useNavigate } from 'react-router-dom';
import { Search, User, MessageSquare, ArrowUpDown } from 'lucide-react';

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('activity');
  const navigate = useNavigate();

  useEffect(() => {
    loadContacts();
  }, [search, sort]);

  async function loadContacts() {
    try {
      const { data } = await API.get('/contacts', { params: { search, sort } });
      setContacts(data);
    } catch (e) {}
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-text-primary">Kontakti</h1>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-text-muted" size={16} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-btn pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 text-text-primary"
            placeholder="Pretraži kontakte..." />
        </div>
        <button onClick={() => setSort(sort === 'activity' ? 'count' : 'activity')}
          className="bg-card border border-border rounded-btn px-4 py-2.5 text-sm text-text-secondary hover:text-text-primary flex items-center gap-2 hover:border-border-strong transition-colors">
          <ArrowUpDown size={16} /> {sort === 'activity' ? 'Aktivnost' : 'Broj poruka'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.map(c => (
          <div key={c.id} onClick={() => navigate(`/contacts/${c.id}`)}
            className="bg-card border border-border rounded-card p-4 cursor-pointer hover:border-border-strong transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center">
                <User size={18} className="text-text-muted" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate text-text-primary">{c.name}</h3>
                <p className="text-xs text-text-secondary truncate">{c.address}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-text-secondary">
              <span className="flex items-center gap-1"><MessageSquare size={12} /> {c.messageCount || c._count?.messages || 0}</span>
              <span>{c.source}</span>
              <span>Poslednji: {new Date(c.lastSeen).toLocaleDateString('sr')}</span>
            </div>
            {c.tags && (
              <div className="flex flex-wrap gap-1 mt-3">
                {c.tags.split(',').map(t => (
                  <span key={t} className="bg-surface text-text-secondary text-[10px] px-2 py-0.5 rounded-btn">{t.trim()}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
