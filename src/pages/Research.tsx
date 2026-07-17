import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Section, Empty, Spinner } from '../components/StatCard';
import { FlaskConical, Sparkles, Check, Trash2 } from 'lucide-react';

export default function Research() {
  const [ideas, setIdeas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('general');
  const [fetching, setFetching] = useState(false);
  const [filter, setFilter] = useState<'all' | 'new' | 'approved'>('all');

  async function load() {
    setLoading(true);
    const d = await fetch('/api/research').then((r) => r.json());
    setIdeas(d || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function fetchIdeas() {
    setFetching(true);
    try {
      await fetch('/api/researcher-fetch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category }) });
      await load();
    } finally { setFetching(false); }
  }

  async function approve(id: number) {
    await fetch('/api/research', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: 'approved' }) });
    load();
  }
  async function remove(id: number) {
    if (!confirm('Discard this idea?')) return;
    await fetch('/api/research', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    load();
  }

  const filtered = ideas.filter((i) => filter === 'all' ? true : i.status === filter).sort((a, b) => b.score - a.score);

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Research Lab"
        subtitle="Ideas surfaced by the Researcher agent. Review, approve, and add extras as you see fit."
        actions={
          <div className="flex items-center gap-2">
            <input className="input w-44" placeholder="Category" value={category} onChange={(e) => setCategory(e.target.value)} />
            <button className="btn btn-primary" disabled={fetching} onClick={fetchIdeas}>
              <Sparkles size={14} /> {fetching ? 'Researching...' : 'Fetch ideas'}
            </button>
          </div>
        }
      />

      <div className="flex gap-2 mb-4">
        {['all', 'new', 'approved'].map((f) => (
          <button key={f} onClick={() => setFilter(f as any)} className={`px-3 py-1.5 rounded-lg text-sm capitalize ${filter === f ? 'bg-violet-500/15 text-violet-200 border border-violet-500/30' : 'bg-white/[0.03] text-gray-400 border border-[#1f1f2e]'}`}>{f}</button>
        ))}
        <div className="ml-auto text-sm text-gray-500 self-center">{filtered.length} ideas</div>
      </div>

      {loading ? <Spinner /> : !filtered.length ? (
        <Section title="Idea vault empty"><Empty message="Click 'Fetch ideas' to have the researcher surface fresh ones." /></Section>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((i) => (
            <div key={i.id} className="card-gradient rounded-2xl p-5">
              <div className="flex items-start justify-between mb-2">
                <div className="badge badge-idle">{i.category}</div>
                <div className={`text-xs font-mono ${i.score >= 75 ? 'text-emerald-300' : i.score >= 50 ? 'text-amber-300' : 'text-gray-400'}`}>
                  {i.score}/100
                </div>
              </div>
              <h3 className="font-display font-semibold text-lg mb-2 leading-tight">{i.title}</h3>
              <p className="text-sm text-gray-400 line-clamp-4 mb-4">{i.summary}</p>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  {i.status === 'approved' && <span className="badge badge-online">approved</span>}
                  {i.status === 'new' && <span className="badge badge-idle">new</span>}
                </div>
                <div className="flex gap-1">
                  {i.status !== 'approved' && <button onClick={() => approve(i.id)} className="btn btn-ghost px-2 py-1"><Check size={14} /></button>}
                  <button onClick={() => remove(i.id)} className="btn btn-danger px-2 py-1"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
