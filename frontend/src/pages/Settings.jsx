import React, { useEffect, useState } from 'react';
import API from '../api';
import { useTheme } from '../context/ThemeContext';
import { Settings, Mail, Smartphone, MessageCircle, Hash, Cpu, Database, Check, AlertTriangle, Loader2, Sun, Moon } from 'lucide-react';

const AI_PROVIDERS = [
  { key: 'anthropic', label: 'Anthropic Claude', models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5'], url: 'https://console.anthropic.com/settings/keys' },
  { key: 'openai', label: 'OpenAI / ChatGPT', models: ['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo'], url: 'https://platform.openai.com/api-keys' },
  { key: 'gemini', label: 'Google Gemini', models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'], url: 'https://aistudio.google.com/app/apikey' },
  { key: 'ollama', label: 'Ollama (lokalni, besplatno)', models: ['llama3.2', 'mistral', 'phi3', 'gemma2'], url: 'https://ollama.com' },
  { key: 'custom', label: 'Custom AI', models: [], url: '' },
];

export default function SettingsPage() {
  const { theme, toggleTheme } = useTheme();
  const [settings, setSettings] = useState(null);
  const [aiConfig, setAiConfig] = useState({ provider: '', model: '', apiKey: '', mode: 'auto', customName: '', customUrl: '', customFormat: 'openai', customHeaders: '', customPrompt: '' });
  const [aiTest, setAiTest] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [usage, setUsage] = useState(null);
  const [qr, setQr] = useState(null);
  const [waStatus, setWaStatus] = useState({ ready: false });
  const [backupInfo, setBackupInfo] = useState(null);
  const [viberToken, setViberToken] = useState('');
  const [slackBotToken, setSlackBotToken] = useState('');
  const [slackAppToken, setSlackAppToken] = useState('');

  useEffect(() => {
    loadSettings();
    loadUsage();
    loadBackupInfo();
    loadWhatsApp();
  }, []);

  async function loadSettings() {
    try {
      const { data } = await API.get('/settings');
      setSettings(data);
      setAiConfig({
        provider: data.aiProvider || '',
        model: data.aiModel || '',
        apiKey: '',
        mode: data.aiMode || 'auto',
        customName: data.aiCustomName || '',
        customUrl: data.aiCustomUrl || '',
        customFormat: data.aiCustomFormat || 'openai',
        customHeaders: data.aiCustomHeaders || '',
        customPrompt: data.aiCustomPrompt || '',
      });
    } catch (e) {}
  }

  async function loadUsage() {
    try {
      const { data } = await API.get('/ai/usage');
      setUsage(data);
    } catch (e) {}
  }

  async function loadBackupInfo() {
    try {
      const { data } = await API.get('/backup/info');
      setBackupInfo(data.latest);
    } catch (e) {}
  }

  async function loadWhatsApp() {
    try {
      const { data } = await API.get('/whatsapp/status');
      setWaStatus(data);
      if (!data.ready) {
        const qrRes = await API.get('/whatsapp/qr');
        setQr(qrRes.data.qr);
      }
    } catch (e) {}
  }

  async function saveAI() {
    await API.post('/settings/ai/config', {
      provider: aiConfig.provider,
      model: aiConfig.model,
      apiKey: aiConfig.apiKey || undefined,
      mode: aiConfig.mode,
      customName: aiConfig.customName,
      customUrl: aiConfig.customUrl,
      customFormat: aiConfig.customFormat,
      customHeaders: aiConfig.customHeaders,
      customPrompt: aiConfig.customPrompt,
    });
    alert('AI podešavanja sačuvana!');
    loadSettings();
  }

  async function testAI() {
    setAiLoading(true);
    setAiTest(null);
    try {
      const { data } = await API.post('/settings/ai/test');
      setAiTest(data);
    } catch (e) {
      setAiTest({ ok: false, error: e.response?.data?.error || 'Greška' });
    }
    setAiLoading(false);
  }

  async function downloadBackup() {
    window.open('/api/backup/download');
  }

  async function resetUsage() {
    await API.post('/ai/usage/reset');
    loadUsage();
  }

  const provider = AI_PROVIDERS.find(p => p.key === aiConfig.provider);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Podešavanja</h1>

      {/* Theme */}
      <Section icon={Sun} title="Izgled">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-text-secondary">
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            <span className="text-sm">{theme === 'dark' ? 'Tamna tema' : 'Svetla tema'}</span>
          </div>
          <button onClick={toggleTheme}
            className="bg-surface hover:bg-surface-hover text-text-primary text-sm px-4 py-2 rounded-btn border border-border transition-colors">
            {theme === 'dark' ? 'Prebaci na svetlu' : 'Prebaci na tamnu'}
          </button>
        </div>
      </Section>

      {/* Gmail */}
      <Section icon={Mail} title="Gmail">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {settings?.gmailConnected ? <Check size={16} className="text-green-500" /> : <AlertTriangle size={16} className="text-text-muted" />}
            <span className="text-sm text-text-secondary">{settings?.gmailConnected ? 'Povezan' : 'Nije povezan'}</span>
          </div>
          <button onClick={async () => { const { data } = await API.post('/settings/gmail/connect'); window.location.href = data.url; }}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-btn transition-colors">Poveži Gmail</button>
        </div>
      </Section>

      {/* WhatsApp */}
      <Section icon={Smartphone} title="WhatsApp">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {waStatus.ready ? <Check size={16} className="text-green-500" /> : <Loader2 size={16} className="animate-spin text-text-muted" />}
            <span className="text-sm text-text-secondary">{waStatus.ready ? 'Spreman' : 'Čeka QR kod...'}</span>
          </div>
        </div>
        {qr && !waStatus.ready && (
          <div className="bg-white p-4 rounded-btn inline-block">
            <img src={qr} alt="WhatsApp QR" className="w-48 h-48" />
            <p className="text-gray-800 text-xs text-center mt-2">Skenirajte sa WhatsApp-om</p>
          </div>
        )}
      </Section>

      {/* Viber */}
      <Section icon={MessageCircle} title="Viber">
        <div className="space-y-3">
          <input value={viberToken} onChange={e => setViberToken(e.target.value)}
            className="w-full bg-input-bg border border-input-border rounded-btn px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-blue-500"
            placeholder="Viber Auth Token" />
          <button onClick={async () => { await API.post('/settings/viber/token', { token: viberToken }); alert('Viber token sačuvan!'); loadSettings(); }}
            className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-btn transition-colors">Sačuvaj i testiraj</button>
          <p className="text-xs text-text-muted">Viber Bot API ne podržava uvoz starijih poruka.</p>
        </div>
      </Section>

      {/* Slack */}
      <Section icon={Hash} title="Slack">
        <div className="space-y-3">
          <input value={slackBotToken} onChange={e => setSlackBotToken(e.target.value)}
            className="w-full bg-input-bg border border-input-border rounded-btn px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-blue-500"
            placeholder="Bot Token (xoxb-...)" />
          <input value={slackAppToken} onChange={e => setSlackAppToken(e.target.value)}
            className="w-full bg-input-bg border border-input-border rounded-btn px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-blue-500"
            placeholder="App Token (xapp-..., za Socket Mode)" />
          <button onClick={async () => { await API.post('/settings/slack/connect', { botToken: slackBotToken, appToken: slackAppToken }); alert('Slack povezan!'); loadSettings(); }}
            className="bg-[#4a154b] hover:bg-[#3a1040] text-white text-sm px-4 py-2 rounded-btn transition-colors">Poveži Slack</button>
        </div>
      </Section>

      {/* AI */}
      <Section icon={Cpu} title="AI Podešavanja">
        <div className="space-y-4">
          <div>
            <label className="text-sm text-text-secondary mb-2 block">Provajder</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {AI_PROVIDERS.map(p => (
                <label key={p.key} className={`flex items-center gap-2 p-3 rounded-btn border cursor-pointer transition-colors ${aiConfig.provider === p.key ? 'border-blue-500 bg-blue-500/10' : 'border-border bg-card'}`}>
                  <input type="radio" name="provider" checked={aiConfig.provider === p.key} onChange={() => setAiConfig({ ...aiConfig, provider: p.key, model: p.models[0] || '' })} />
                  <span className="text-sm text-text-primary">{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          {provider && provider.url && (
            <div className="text-xs text-text-secondary">
              Link za ključ: <a href={provider.url} target="_blank" rel="noreferrer" className="text-blue-500 underline">{provider.url}</a>
            </div>
          )}

          {aiConfig.provider !== 'ollama' && (
            <div>
              <label className="text-sm text-text-secondary">API Ključ</label>
              <input type="password" value={aiConfig.apiKey} onChange={e => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                className="w-full bg-input-bg border border-input-border rounded-btn px-3 py-2 text-sm mt-1 focus:outline-none focus:border-blue-500 text-text-primary"
                placeholder="sk-..." />
              {settings?.aiApiKey && <p className="text-xs text-text-muted mt-1">Sačuvan: {settings.aiApiKey}</p>}
            </div>
          )}

          {provider && provider.models.length > 0 && (
            <div>
              <label className="text-sm text-text-secondary">Model</label>
              <select value={aiConfig.model} onChange={e => setAiConfig({ ...aiConfig, model: e.target.value })}
                className="w-full bg-input-bg border border-input-border rounded-btn px-3 py-2 text-sm mt-1 text-text-primary">
                {provider.models.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}

          {aiConfig.provider === 'custom' && (
            <div className="space-y-3 border border-border rounded-card p-4">
              <div><label className="text-xs text-text-secondary">Naziv provajdera</label><input value={aiConfig.customName} onChange={e => setAiConfig({ ...aiConfig, customName: e.target.value })} className="w-full bg-input-bg border border-input-border rounded-btn px-3 py-2 text-sm mt-1 text-text-primary" /></div>
              <div><label className="text-xs text-text-secondary">API URL</label><input value={aiConfig.customUrl} onChange={e => setAiConfig({ ...aiConfig, customUrl: e.target.value })} className="w-full bg-input-bg border border-input-border rounded-btn px-3 py-2 text-sm mt-1 text-text-primary" /></div>
              <div><label className="text-xs text-text-secondary">Naziv modela</label><input value={aiConfig.model} onChange={e => setAiConfig({ ...aiConfig, model: e.target.value })} className="w-full bg-input-bg border border-input-border rounded-btn px-3 py-2 text-sm mt-1 text-text-primary" /></div>
              <div>
                <label className="text-xs text-text-secondary">Format</label>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-1 text-sm text-text-primary"><input type="radio" checked={aiConfig.customFormat === 'openai'} onChange={() => setAiConfig({ ...aiConfig, customFormat: 'openai' })} /> OpenAI</label>
                  <label className="flex items-center gap-1 text-sm text-text-primary"><input type="radio" checked={aiConfig.customFormat === 'anthropic'} onChange={() => setAiConfig({ ...aiConfig, customFormat: 'anthropic' })} /> Anthropic</label>
                </div>
              </div>
              <div><label className="text-xs text-text-secondary">Headers (JSON, opciono)</label><input value={aiConfig.customHeaders} onChange={e => setAiConfig({ ...aiConfig, customHeaders: e.target.value })} className="w-full bg-input-bg border border-input-border rounded-btn px-3 py-2 text-sm mt-1 text-text-primary" /></div>
              <div><label className="text-xs text-text-secondary">System Prompt (opciono)</label><textarea value={aiConfig.customPrompt} onChange={e => setAiConfig({ ...aiConfig, customPrompt: e.target.value })} className="w-full bg-input-bg border border-input-border rounded-btn px-3 py-2 text-sm mt-1 min-h-[60px] text-text-primary" /></div>
              <div className="text-xs text-text-muted">
                <p>OpenAI kompatibilni servisi:</p>
                <p>Groq · Mistral · Together AI · Perplexity · OpenRouter · Fireworks</p>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm text-text-secondary mb-2 block">AI Režim</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm text-text-primary"><input type="radio" checked={aiConfig.mode === 'auto'} onChange={() => setAiConfig({ ...aiConfig, mode: 'auto' })} /> Automatski</label>
              <label className="flex items-center gap-2 text-sm text-text-primary"><input type="radio" checked={aiConfig.mode === 'manual'} onChange={() => setAiConfig({ ...aiConfig, mode: 'manual' })} /> Na zahtev (štedi tokene)</label>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={testAI} disabled={aiLoading}
              className="bg-surface hover:bg-surface-hover text-text-primary text-sm px-4 py-2 rounded-btn flex items-center gap-2 disabled:opacity-50 border border-border transition-colors">
              {aiLoading && <Loader2 size={14} className="animate-spin" />} Test konekcije
            </button>
            <button onClick={saveAI}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-btn transition-colors">Sačuvaj</button>
          </div>

          {aiTest && (
            <div className={`p-3 rounded-btn text-sm ${aiTest.ok ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20' : 'bg-red-bg text-red-text border border-red-text/20'}`}>
              {aiTest.ok ? `AI radi! ✅ ${aiTest.ms}ms` : `Greška: ${aiTest.error}`}
            </div>
          )}
        </div>
      </Section>

      {/* AI Usage */}
      {usage && (
        <Section icon={Cpu} title="AI Potrošnja">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div className="bg-bg-secondary border border-border p-3 rounded-btn"><div className="text-text-secondary text-xs">Zahteva</div><div className="font-semibold text-text-primary">{usage.requests}</div></div>
            <div className="bg-bg-secondary border border-border p-3 rounded-btn"><div className="text-text-secondary text-xs">Tokena</div><div className="font-semibold text-text-primary">{usage.tokens.toLocaleString()}</div></div>
            <div className="bg-bg-secondary border border-border p-3 rounded-btn"><div className="text-text-secondary text-xs">Cena</div><div className="font-semibold text-text-primary">~${(usage.tokens * 0.0000015).toFixed(2)}</div></div>
            <div className="bg-bg-secondary border border-border p-3 rounded-btn"><div className="text-text-secondary text-xs">Sažeci</div><div className="font-semibold text-text-primary">{usage.breakdown.summary}%</div></div>
          </div>
          <button onClick={resetUsage} className="text-xs text-red-text hover:text-red-500 mt-2">Resetuj brojač</button>
        </Section>
      )}

      {/* Backup */}
      <Section icon={Database} title="Backup">
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-secondary">
            {backupInfo ? `Poslednji: ${backupInfo.name} (${(backupInfo.size / 1024).toFixed(1)} KB)` : 'Nema backup-a'}
          </div>
          <button onClick={downloadBackup} className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-btn transition-colors">Download .sql</button>
        </div>
      </Section>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-card border border-border rounded-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className="text-blue-500" />
        <h2 className="font-semibold text-text-primary">{title}</h2>
      </div>
      {children}
    </div>
  );
}
