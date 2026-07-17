import { useEffect, useState, useRef } from 'react';
import PageHeader from '../components/PageHeader';
import { Section, Spinner } from '../components/StatCard';
import { Send, Trash2 } from 'lucide-react';

export default function Messages() {
  const [messages, setMessages] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [fromAgent, setFromAgent] = useState('CEO');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  async function load() {
    const [m, a] = await Promise.all([
      fetch('/api/messages').then((r) => r.json()),
      fetch('/api/agents').then((r) => r.json()),
    ]);
    setMessages(m || []);
    setAgents(a || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    if (!content.trim()) return;
    await fetch('/api/messages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from_agent: fromAgent, content, channel: 'general' }) });
    setContent('');
    load();
  }
  async function remove(id: number) {
    await fetch('/api/messages', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="Team Messages" subtitle="Internal channel — drop notes that any agent or teammate can read." />

      {loading ? <Spinner /> : (
        <Section title="Channel #general">
          <div className="h-[480px] flex flex-col">
            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {messages.map((m) => (
                <div key={m.id} className="flex gap-3 group">
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-400 to-cyan-400 grid place-items-center text-xs font-bold text-black shrink-0">
                    {(m.from_agent || '?').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-sm">{m.from_agent}</span>
                      <span className="text-[10px] text-gray-600 font-mono">{new Date(m.created_at).toLocaleString()}</span>
                    </div>
                    <div className="text-sm text-gray-300 whitespace-pre-wrap">{m.content}</div>
                  </div>
                  <button onClick={() => remove(m.id)} className="opacity-0 group-hover:opacity-100 transition-opacity btn btn-danger px-2 py-1 h-7 text-xs"><Trash2 size={12} /></button>
                </div>
              ))}
              <div ref={endRef} />
              {!messages.length && <div className="text-gray-500 text-sm text-center py-12">Quiet so far. Drop the first message ↓</div>}
            </div>
            <div className="mt-4 flex gap-2">
              <select className="select w-32" value={fromAgent} onChange={(e) => setFromAgent(e.target.value)}>
                <option value="CEO">CEO</option>
                {agents.map((a) => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
              <input className="input flex-1" placeholder="Type a message..." value={content} onChange={(e) => setContent(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
              <button className="btn btn-primary" onClick={send}><Send size={14} /> Send</button>
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}
