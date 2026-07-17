import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Section, Empty, Spinner } from '../components/StatCard';
import Modal from '../components/Modal';
import { Plus, Trash2 } from 'lucide-react';

const LANES = [
  { id: 'planning', label: 'Planning' },
  { id: 'design', label: 'Design' },
  { id: 'build', label: 'Build' },
  { id: 'launch', label: 'Launch' },
  { id: 'completed', label: 'Completed' },
];

export default function Projects() {
  const [projects, setProjects] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [openBrief, setOpenBrief] = useState(false);
  const [briefClient, setBriefClient] = useState('');
  const [briefText, setBriefText] = useState('');
  const [running, setRunning] = useState(false);
  const [runOutput, setRunOutput] = useState<any>(null);

  async function load() {
    setLoading(true);
    const [p, r] = await Promise.all([
      fetch('/api/projects').then((r) => r.json()),
      fetch('/api/reviews').then((r) => r.json()),
    ]);
    setProjects(p || []);
    setReviews(r || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create(d: any) {
    await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
    setOpen(false); load();
  }
  async function move(p: any, dir: number) {
    const idx = LANES.findIndex((l) => l.id === p.status);
    const next = LANES[Math.min(Math.max(idx + dir, 0), LANES.length - 1)];
    await fetch('/api/projects', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, status: next.id }) });
    load();
  }
  async function remove(p: any) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    await fetch('/api/projects', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id }) });
    load();
  }

  async function runFullTeam() {
    if (!briefText.trim()) return;
    setRunning(true); setRunOutput(null);
    try {
      const res = await fetch('/api/team-review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brief: briefText, client_name: briefClient }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Run failed');
      setRunOutput(j);
      setOpenBrief(false);
      setBriefText(''); setBriefClient('');
      load();
    } catch (e: any) {
      setRunOutput({ error: e.message });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Projects"
        subtitle="Live projects for clients. Move work across lanes or run the full team on a new brief."
        actions={
          <div className="flex gap-2">
            <button className="btn btn-ghost" onClick={() => setOpenBrief(true)}>Run full team</button>
            <button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> New Project</button>
          </div>
        }
      />

      {loading ? <Spinner /> : !projects.length ? (
        <Section title="No projects yet">
          <Empty message="Create one, or use 'Run full team' to let every agent plan + build for a brief." />
        </Section>
      ) : (
        <div className="grid lg:grid-cols-5 gap-4">
          {LANES.map((lane) => (
            <div key={lane.id} className="card-gradient rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider">{lane.label}</h3>
                <span className="text-xs text-gray-500">{projects.filter((p) => p.status === lane.id).length}</span>
              </div>
              <div className="space-y-2">
                {projects.filter((p) => p.status === lane.id).map((p) => {
                  const review = reviews.find((r) => r.reference_id === p.id);
                  return (
                    <div key={p.id} className="bg-black/30 border border-[#1f1f2e] rounded-lg p-3">
                      <div className="font-medium text-sm">{p.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{p.client} · {p.budget ? `$${p.budget}` : '—'}</div>
                      {p.description && <p className="text-xs text-gray-400 mt-2 line-clamp-2">{p.description}</p>}
                      {review && (
                        <div className={`mt-2 inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded font-mono uppercase ${
                          review.verdict === 'pass' ? 'bg-emerald-500/15 text-emerald-300' :
                          review.verdict === 'fail' ? 'bg-red-500/15 text-red-300' :
                          'bg-amber-500/15 text-amber-300'
                        }`}>
                          Review: {review.verdict} · {review.score}
                        </div>
                      )}
                      <div className="flex gap-1 mt-3">
                        <button onClick={() => move(p, -1)} className="btn btn-ghost text-xs px-2 py-1">←</button>
                        <button onClick={() => move(p, 1)} className="btn btn-ghost text-xs px-2 py-1">→</button>
                        <button onClick={() => remove(p)} className="btn btn-danger text-xs px-2 py-1 ml-auto"><Trash2 size={12} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <NewProject onClose={() => setOpen(false)} onSave={create} />}

      {openBrief && (
        <Modal open onClose={() => setOpenBrief(false)} title="Run the full team" wide>
          <p className="text-sm text-gray-400 mb-4">Manager → UI → Backend → Marketing → Researcher → Reviewer will each generate output for your brief.</p>
          <input className="input mb-3" placeholder="Client (optional)" value={briefClient} onChange={(e) => setBriefClient(e.target.value)} />
          <textarea className="textarea" rows={6} placeholder="Describe the brief — what does the client want?" value={briefText} onChange={(e) => setBriefText(e.target.value)} />
          <div className="flex gap-2 mt-4">
            <button className="btn btn-ghost flex-1" onClick={() => setOpenBrief(false)}>Cancel</button>
            <button className="btn btn-primary flex-1" disabled={running || !briefText.trim()} onClick={runFullTeam}>{running ? 'Running team...' : 'Run team'}</button>
          </div>
        </Modal>
      )}

      {runOutput && (
        <Modal open onClose={() => setRunOutput(null)} title="Team run output" wide>
          {runOutput.error ? <div className="text-red-300">{runOutput.error}</div> : (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="card-gradient p-3 rounded-lg">
                  <div className="text-xs text-gray-400 uppercase">Verdict</div>
                  <div className={`text-lg font-bold mt-1 ${runOutput.review?.verdict === 'pass' ? 'text-emerald-300' : 'text-amber-300'}`}>{runOutput.review?.verdict?.toUpperCase()}</div>
                </div>
                <div className="card-gradient p-3 rounded-lg">
                  <div className="text-xs text-gray-400 uppercase">Confidence</div>
                  <div className="text-lg font-bold mt-1">{runOutput.review?.score}/100</div>
                </div>
                <div className="card-gradient p-3 rounded-lg">
                  <div className="text-xs text-gray-400 uppercase">Steps</div>
                  <div className="text-lg font-bold mt-1">{runOutput.steps?.length}</div>
                </div>
              </div>
              {runOutput.steps?.map((s: any, i: number) => (
                <div key={i} className="card-gradient rounded-lg p-4">
                  <div className="font-mono uppercase text-xs text-violet-300">{s.role}</div>
                  <div className="text-sm text-gray-400 mb-2">{s.title}</div>
                  <pre className="text-xs text-gray-300 whitespace-pre-wrap max-h-56 overflow-y-auto">{s.output}</pre>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function NewProject({ onClose, onSave }: { onClose: () => void; onSave: (d: any) => void }) {
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [deadline, setDeadline] = useState('');
  return (
    <Modal open onClose={onClose} title="New project" wide>
      <div className="space-y-3">
        <input className="input" placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="Client" value={client} onChange={(e) => setClient(e.target.value)} />
        <textarea className="textarea" rows={4} placeholder="Description / scope" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <input className="input" placeholder="Budget USD" value={budget} onChange={(e) => setBudget(e.target.value)} />
          <input className="input" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-2">
          <button className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={() => onSave({ name, client, description, budget: Number(budget) || 0, deadline, status: 'planning' })}>Create project</button>
        </div>
      </div>
    </Modal>
  );
}
