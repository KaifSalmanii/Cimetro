import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Section, Spinner } from '../components/StatCard';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/agents').then((r) => r.json()).then((d) => { setAgents(d || []); setLoading(false); });
  }, []);

  async function updateAgent(id: number, patch: any) {
    await fetch('/api/agents', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...patch }) });
    const d = await fetch('/api/agents').then((r) => r.json());
    setAgents(d || []);
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageHeader title="Settings" subtitle="Per-agent model routing, account info, and API keys." />

      <div className="space-y-6">
        <Section title="Account">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Email</span><span>{user?.email || '—'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Role</span><span>Founder · CEO</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Company</span><span>CIMETRO</span></div>
          </div>
        </Section>

        <Section title="API keys (Vercel env)">
          <p className="text-sm text-gray-400 mb-3">Keys you set in the Vercel dashboard for this deployment are read server-side. Add the following names:</p>
          <ul className="text-sm space-y-1.5 font-mono">
            <li className="flex justify-between p-2 rounded bg-black/30 border border-[#1f1f2e]"><span className="text-gray-500">NVIDIA NIM</span><span className="text-violet-300">NVIDIA_API_KEY</span></li>
            <li className="flex justify-between p-2 rounded bg-black/30 border border-[#1f1f2e]"><span className="text-gray-500">OpenRouter</span><span className="text-cyan-300">OPENROUTER_API_KEY</span></li>
          </ul>
          <p className="text-xs text-gray-500 mt-3">Each agent can independently route through either provider — pick the strongest model for each role on the Agents page.</p>
        </Section>

        {loading ? <Spinner /> : (
          <Section title="Per-agent model routing">
            <div className="space-y-3">
              {agents.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-black/30 border border-[#1f1f2e]">
                  <div className="w-9 h-9 rounded-lg grid place-items-center" style={{ background: (a.color || '#7c3aed') + '22', color: a.color || '#a78bfa' }}>{a.icon || '🤖'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{a.name}</div>
                    <div className="text-xs text-gray-500 truncate">{a.role}</div>
                  </div>
                  <input
                    className="input w-72 text-xs font-mono"
                    placeholder="e.g. anthropic/claude-3.5-sonnet"
                    defaultValue={a.model}
                    onBlur={(e) => updateAgent(a.id, { model: e.target.value, provider: e.target.value.includes('nvidia') || e.target.value.startsWith('meta/') || e.target.value.startsWith('mistralai/') ? 'nvidia' : 'openrouter' })}
                  />
                </div>
              ))}
              {!agents.length && <div className="text-gray-500 text-sm">No agents configured yet.</div>}
            </div>
          </Section>
        )}
      </div>
    </div>
  );
}
