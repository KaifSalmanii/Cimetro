import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Section, Empty, Spinner } from '../components/StatCard';
import Modal from '../components/Modal';
import { Plus, Trash2, Play } from 'lucide-react';

const STAGES = ['received', 'in_progress', 'review', 'delivered'];

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    const d = await fetch('/api/orders').then((r) => r.json());
    setOrders(d || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function create(data: any) {
    await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    setOpen(false); load();
  }
  async function advance(o: any) {
    const idx = STAGES.indexOf(o.status);
    if (idx < 0 || idx === STAGES.length - 1) return;
    await fetch('/api/orders', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: o.id, status: STAGES[idx + 1] }) });
    load();
  }
  async function remove(o: any) {
    if (!confirm(`Delete order "${o.title}"?`)) return;
    await fetch('/api/orders', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: o.id }) });
    load();
  }

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Customer Orders"
        subtitle="Inbound client work — advance orders through pipeline stages as your agents complete tasks."
        actions={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> New Order</button>}
      />

      {loading ? <Spinner /> : !orders.length ? (
        <Section title="No orders yet">
          <Empty message="Create your first client order to get the team moving." />
        </Section>
      ) : (
        <div className="grid lg:grid-cols-4 gap-4">
          {STAGES.map((stage) => (
            <div key={stage} className="card-gradient rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-gray-300">{stage.replace(/_/g, ' ')}</h3>
                <span className="text-xs text-gray-500">{orders.filter((o) => o.status === stage).length}</span>
              </div>
              <div className="space-y-2">
                {orders.filter((o) => o.status === stage).map((o) => (
                  <div key={o.id} className="bg-black/30 border border-[#1f1f2e] rounded-lg p-3 hover:border-violet-500/40 transition-all">
                    <div className="font-medium text-sm">{o.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{o.client_name} · ${o.budget || 0}</div>
                    {o.brief && <p className="text-xs text-gray-400 mt-2 line-clamp-2">{o.brief}</p>}
                    <div className="flex gap-1 mt-3">
                      {stage !== 'delivered' && (
                        <button onClick={() => advance(o)} className="btn btn-ghost text-xs px-2 py-1"><Play size={12} /></button>
                      )}
                      <button onClick={() => remove(o)} className="btn btn-danger text-xs px-2 py-1 ml-auto"><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
                {!orders.filter((o) => o.status === stage).length && <div className="text-gray-600 text-xs">—</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {open && <NewOrder onClose={() => setOpen(false)} onSave={create} />}
    </div>
  );
}

function NewOrder({ onClose, onSave }: { onClose: () => void; onSave: (d: any) => void }) {
  const [client, setClient] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const [brief, setBrief] = useState('');
  const [budget, setBudget] = useState('');
  const [priority, setPriority] = useState('normal');

  return (
    <Modal open onClose={onClose} title="New client order" wide>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input className="input" placeholder="Client name" value={client} onChange={(e) => setClient(e.target.value)} />
          <input className="input" placeholder="Client email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <input className="input" placeholder="Project title (e.g. 'SaaS landing page redesign')" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="textarea" rows={5} placeholder="What is the client asking for? Goals, audience, timeline..." value={brief} onChange={(e) => setBrief(e.target.value)} />
        <div className="grid grid-cols-2 gap-3">
          <input className="input" placeholder="Budget (USD)" value={budget} onChange={(e) => setBudget(e.target.value)} />
          <select className="select" value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="low">Low priority</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
        <div className="flex gap-2 pt-2">
          <button className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={() => onSave({ client_name: client, client_email: email, title, brief, budget: Number(budget) || 0, priority })}>Create order</button>
        </div>
      </div>
    </Modal>
  );
}
