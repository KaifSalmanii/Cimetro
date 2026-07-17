import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Section, Empty, Spinner } from '../components/StatCard';
import Modal from '../components/Modal';
import { Sparkles, Play, Power, Settings2, Trash2, Plus } from 'lucide-react';

const ROLE_PRESETS = [
  { role: 'UI Designer', color: '#a78bfa', icon: '🎨', system_prompt: 'You are CIMETRO\'s expert UI designer. Output clear, modern, conversion-focused UI specs (pages, components, motion, typography, palette) using concise bullet lists. Always match brand voice: dark, sharp, premium.' },
  { role: 'Backend Engineer', color: '#22d3ee', icon: '⚙️', system_prompt: 'You are CIMETRO\'s backend architect. Output API contracts (REST), data models, third-party services, hosting choices (Vercel/Supabase/AWS), and a deployment checklist. Concise bullet lists.' },
  { role: 'Marketing', color: '#f472b6', icon: '📣', system_prompt: 'You are CIMETRO\'s marketing lead. Output launch playbooks, channel strategy, social hooks, email copy, SEO keyword ideas, and ad creative briefs. Use punchy, on-brand language.' },
  { role: 'Manager', color: '#fbbf24', icon: '🧭', system_prompt: 'You are CIMETRO\'s project manager. Decompose briefs into scoped tasks with owner agents, timeline, risks, and success metrics. Always reply with structured bullet plans.' },
  { role: 'Researcher', color: '#34d399', icon: '🔬', system_prompt: 'You are CIMETRO\'s research lead. Find fresh, current business and product ideas, market angles, and competition. Output numbered idea lists with opportunity scores (0-100).' },
  { role: 'Reviewer', color: '#f87171', icon: '🛡️', system_prompt: 'You are CIMETRO\'s QA reviewer. Verify outputs match the original brief, give a clear PASS/NEEDS WORK/FAIL verdict, 0-100 confidence score, top 3 gaps, and a one-paragraph rationale.' },
];

const MODELS = [
  { id: 'openai/gpt-4o', provider: 'openrouter', label: 'GPT-4o (OpenRouter)' },
  { id: 'openai/gpt-4o-mini', provider: 'openrouter', label: 'GPT-4o-mini (OpenRouter)' },
  { id: 'anthropic/claude-3.5-sonnet', provider: 'openrouter', label: 'Claude 3.5 Sonnet (OpenRouter)' },
  { id: 'anthropic/claude-3-haiku', provider: 'openrouter', label: 'Claude 3 Haiku (OpenRouter)' },
  { id: 'google/gemini-2.0-flash-001', provider: 'openrouter', label: 'Gemini 2.0 Flash (OpenRouter)' },
  { id: 'meta-llama/llama-3.1-70b-instruct', provider: 'openrouter', label: 'Llama 3.1 70B (OpenRouter)' },
  { id: 'mistralai/mistral-large-latest', provider: 'openrouter', label: 'Mistral Large (OpenRouter)' },
  { id: 'deepseek/deepseek-chat', provider: 'openrouter', label: 'DeepSeek V3 (OpenRouter)' },
  { id: 'nvidia/llama-3.1-nemotron-70b-instruct', provider: 'nvidia', label: 'NVIDIA Llama 3.1 Nemotron 70B' },
  { id: 'nvidia/mistral-nemo-minitron-8b-base', provider: 'nvidia', label: 'NVIDIA Mistral Nemo 12B' },
  { id: 'meta/llama-3.3-70b-instruct', provider: 'nvidia', label: 'NVIDIA Llama 3.3 70B' },
];

export default function Agents() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<{ kind: 'create' | 'edit'; agent?: any } | null>(null);
  const [running, setRunning] = useState<number | null>(null);
  const [runResult, setRunResult] = useState<{ agentId: number; output: string } | null>(null);

  async function load() {
    setLoading(true);
    const d = await fetch('/api/agents').then((r) => r.json());
    setAgents(d || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(data: any) {
    if (open?.kind === 'edit' && open.agent) {
      await fetch('/api/agents', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: open.agent.id, ...data }) });
    } else {
      await fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    }
    setOpen(null);
    load();
  }

  async function run(agent: any, prompt: string) {
    setRunning(agent.id);
    setRunResult(null);
    try {
      const res = await fetch('/api/agent-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_id: agent.id, prompt, save_as: `${agent.name} run @ ${new Date().toLocaleTimeString()}` }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Run failed');
      setRunResult({ agentId: agent.id, output: j.output });
      load();
    } catch (e: any) {
      setRunResult({ agentId: agent.id, output: `Error: ${e.message}` });
    } finally {
      setRunning(null);
    }
  }

  async function toggleStatus(agent: any) {
    const next = agent.status === 'offline' ? 'online' : 'offline';
    await fetch('/api/agents', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: agent.id, status: next }) });
    load();
  }

  async function remove(agent: any) {
    if (!confirm(`Remove ${agent.name}?`)) return;
    await fetch('/api/agents', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: agent.id }) });
    load();
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="AI Agents"
        subtitle="Each agent has its own role, system prompt, and model — per-role best-fit tools."
        actions={<button className="btn btn-primary" onClick={() => setOpen({ kind: 'create' })}><Plus size={16} /> New Agent</button>}
      />

      {loading ? <Spinner /> : !agents.length ? (
        <Section title="Get started — hire your first agent">
          <Empty message="No agents yet. Click 'New Agent' or load the CIMETRO default roster below." />
          <button className="btn btn-primary mt-4" onClick={async () => {
            for (const r of ROLE_PRESETS) {
              await fetch('/api/agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
                name: r.role + ' Agent', role: r.role, system_prompt: r.system_prompt, color: r.color, icon: r.icon,
                model: 'openai/gpt-4o-mini', provider: 'openrouter', status: 'online',
              }) });
            }
            load();
          }}>Load default CIMETRO roster</button>
        </Section>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((a) => (
            <div key={a.id} className="card-gradient rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl grid place-items-center text-2xl" style={{ background: (a.color || '#7c3aed') + '22', color: a.color || '#a78bfa' }}>
                    {a.icon || a.name?.[0]}
                  </div>
                  <div>
                    <div className="font-display font-semibold">{a.name}</div>
                    <div className="text-xs text-gray-500">{a.role}</div>
                  </div>
                </div>
                <div className={`badge badge-${a.status === 'online' ? 'online' : a.status === 'working' ? 'working' : a.status === 'offline' ? 'offline' : 'idle'}`}>
                  <span className={`pulse-dot ${a.status === 'working' ? 'yellow' : a.status === 'offline' ? 'red' : 'green'}`} />
                  {a.status || 'idle'}
                </div>
              </div>

              <p className="text-xs text-gray-400 line-clamp-3 mb-3">{a.system_prompt?.slice(0, 140)}...</p>

              <div className="flex items-center justify-between text-xs text-gray-500 font-mono mb-4">
                <div className="truncate flex-1">{a.model}</div>
                <div className="text-[10px] uppercase tracking-wider ml-2">{a.provider}</div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => run(a, 'Generate a short status report on what you would do this week for the CIMETRO agency. Keep it under 6 bullets.')} disabled={running === a.id} className="btn btn-primary flex-1 text-sm py-2">
                  <Play size={14} /> {running === a.id ? 'Running...' : 'Run'}
                </button>
                <button onClick={() => setOpen({ kind: 'edit', agent: a })} className="btn btn-ghost"><Settings2 size={14} /></button>
                <button onClick={() => toggleStatus(a)} className="btn btn-ghost"><Power size={14} /></button>
                <button onClick={() => remove(a)} className="btn btn-danger"><Trash2 size={14} /></button>
              </div>

              {runResult && runResult.agentId === a.id && (
                <div className="mt-3 p-3 rounded-lg bg-black/30 border border-[#1f1f2e] text-xs text-gray-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {runResult.output}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {open && (
        <AgentEditor
          initial={open.agent}
          onClose={() => setOpen(null)}
          onSave={save}
        />
      )}
    </div>
  );
}

function AgentEditor({ initial, onClose, onSave }: { initial?: any; onClose: () => void; onSave: (d: any) => void }) {
  const [name, setName] = useState(initial?.name || '');
  const [role, setRole] = useState(initial?.role || '');
  const [system, setSystem] = useState(initial?.system_prompt || '');
  const [model, setModel] = useState(initial?.model || 'openai/gpt-4o-mini');
  const [color, setColor] = useState(initial?.color || '#a78bfa');
  const [icon, setIcon] = useState(initial?.icon || '🤖');

  function applyPreset(p: any) {
    setRole(p.role); setSystem(p.system_prompt); setColor(p.color); setIcon(p.icon);
    if (!name) setName(p.role + ' Agent');
  }

  const provider = MODELS.find((m) => m.id === model)?.provider || 'openrouter';

  return (
    <Modal open onClose={onClose} title={initial ? 'Edit agent' : 'New agent'} wide>
      <div className="space-y-4">
        {!initial && (
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider">Quick presets</label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {ROLE_PRESETS.map((p) => (
                <button key={p.role} onClick={() => applyPreset(p)} className="card-gradient p-3 rounded-lg text-left hover:border-violet-500/40">
                  <div className="text-lg">{p.icon}</div>
                  <div className="text-sm font-medium mt-1">{p.role}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider">Name</label>
            <input className="input mt-1.5" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider">Role</label>
            <input className="input mt-1.5" value={role} onChange={(e) => setRole(e.target.value)} placeholder="UI Designer / Marketing Lead..." />
          </div>
        </div>

        <div>
          <label className="text-xs text-gray-400 uppercase tracking-wider">System prompt</label>
          <textarea className="textarea mt-1.5 font-mono text-xs" rows={6} value={system} onChange={(e) => setSystem(e.target.value)} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="text-xs text-gray-400 uppercase tracking-wider">Model</label>
            <select className="select mt-1.5" value={model} onChange={(e) => setModel(e.target.value)}>
              {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider">Color</label>
            <input className="input mt-1.5 h-10 p-1" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider">Icon</label>
            <input className="input mt-1.5 text-center" value={icon} onChange={(e) => setIcon(e.target.value.slice(0, 2))} />
          </div>
        </div>

        <div className="text-xs text-gray-500 font-mono">Provider: <span className="text-violet-300">{provider}</span></div>

        <div className="flex gap-2 pt-2">
          <button className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={() => onSave({ name, role, system_prompt: system, model, provider, color, icon, status: initial?.status || 'online' })}>{initial ? 'Save' : 'Create Agent'}</button>
        </div>
      </div>
    </Modal>
  );
}
