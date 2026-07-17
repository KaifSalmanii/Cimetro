import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { StatCard, Section, Spinner } from '../components/StatCard';
import { useAuth } from '../contexts/AuthContext';
import { Users, ClipboardList, CheckCircle, FlaskConical, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { user } = useAuth();
  const [agents, setAgents] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [a, o, p, r, l] = await Promise.all([
          fetch('/api/agents').then((r) => r.json()),
          fetch('/api/orders').then((r) => r.json()),
          fetch('/api/projects').then((r) => r.json()),
          fetch('/api/reviews').then((r) => r.json()),
          fetch('/api/activity').then((r) => r.json()),
        ]);
        setAgents(a || []);
        setOrders(o || []);
        setProjects(p || []);
        setReviews(r || []);
        setActivity(l || []);
      } finally { setLoading(false); }
    })();
  }, []);

  const online = agents.filter((a) => a.status === 'online').length;
  const working = agents.filter((a) => a.status === 'working').length;
  const pendingOrders = orders.filter((o) => o.status === 'received' || o.status === 'in_progress').length;
  const liveProjects = projects.filter((p) => p.status !== 'completed').length;
  const passed = reviews.filter((r) => r.verdict === 'pass').length;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="text-xs text-gray-500 font-mono tracking-widest mb-2">FOUNDER · CEO</div>
        <h1 className="font-display text-4xl font-bold leading-tight">
          Good {greet()}, <span className="gradient-text">{(user?.email || '').split('@')[0] || 'CEO'}</span>
        </h1>
        <p className="text-gray-400 mt-2">Your AI company is operational. {online} agents online, {working} working, {pendingOrders} orders in the pipeline.</p>
      </div>

      {loading ? <Spinner /> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <StatCard label="Agents online" value={`${online}/${agents.length}`} icon={<Users size={14} />} accent="violet" />
            <StatCard label="Working now" value={working} icon={<Sparkles size={14} />} accent="cyan" />
            <StatCard label="Open orders" value={pendingOrders} icon={<ClipboardList size={14} />} accent="amber" />
            <StatCard label="Live projects" value={liveProjects} icon={<CheckCircle size={14} />} accent="green" />
            <StatCard label="Reviews passed" value={`${passed}/${reviews.length}`} icon={<FlaskConical size={14} />} accent="violet" />
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Section title="Agents — live status">
                <div className="grid sm:grid-cols-2 gap-3">
                  {agents.map((a) => (
                    <Link key={a.id} to="/agents" className="card-gradient rounded-xl p-4 glass-hover transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg grid place-items-center text-lg" style={{ background: a.color || '#7c3aed22', color: a.color || '#a78bfa' }}>
                          {a.icon || a.name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{a.name}</div>
                          <div className="text-xs text-gray-500 truncate">{a.role}</div>
                        </div>
                        <div className={`badge badge-${a.status === 'online' ? 'online' : a.status === 'working' ? 'working' : 'idle'}`}>
                          <span className={`pulse-dot ${a.status === 'working' ? 'yellow' : 'green'}`} />
                          {a.status || 'idle'}
                        </div>
                      </div>
                    </Link>
                  ))}
                  {!agents.length && <div className="text-gray-500 text-sm col-span-2 py-6 text-center">No agents yet — visit Agents to add some.</div>}
                </div>
              </Section>

              <div className="mt-6">
                <Section title="Latest orders">
                  <div className="space-y-2">
                    {orders.slice(0, 5).map((o) => (
                      <div key={o.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5">
                        <div className="w-2 h-2 rounded-full bg-violet-400" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{o.title}</div>
                          <div className="text-xs text-gray-500">{o.client_name} · ${o.budget || 0}</div>
                        </div>
                        <div className="text-xs text-gray-400 capitalize">{o.status?.replace(/_/g, ' ')}</div>
                      </div>
                    ))}
                    {!orders.length && <div className="text-gray-500 text-sm py-4 text-center">No orders yet.</div>}
                  </div>
                </Section>
              </div>
            </div>

            <Section title="Recent activity">
              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {activity.slice(0, 30).map((a) => (
                  <div key={a.id} className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-2 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm text-gray-300">{a.message}</div>
                      <div className="text-[10px] text-gray-600 font-mono mt-0.5">{new Date(a.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
                {!activity.length && <div className="text-gray-500 text-sm">No activity yet.</div>}
              </div>
            </Section>
          </div>
        </>
      )}
    </div>
  );
}

function greet() {
  const h = new Date().getHours();
  return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
}
