import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Section, Empty, Spinner } from '../components/StatCard';
import Modal from '../components/Modal';
import { Plus, Check, X } from 'lucide-react';

export default function Approvals() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  async function load() {
    setLoading(true);
    const d = await fetch('/api/approvals').then((r) => r.json());
    setItems(d || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function decide(id: number, decision: 'approved' | 'rejected', note = '') {
    await fetch('/api/approvals', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status: decision, decision_note: note }) });
    load();
  }
  async function create(d: any) {
    await fetch('/api/approvals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
    setOpen(false); load();
  }

  const pending = items.filter((i) => i.status === 'pending');
  const decided = items.filter((i) => i.status !== 'pending');

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader
        title="Approvals"
        subtitle="Decisions only the CEO (you) can sign off on."
        actions={<button className="btn btn-primary" onClick={() => setOpen(true)}><Plus size={16} /> New Request</button>}
      />

      {loading ? <Spinner /> : (
        <div className="grid lg:grid-cols-2 gap-6">
          <Section title={`Pending (${pending.length})`}>
            {pending.length ? pending.map((a) => (
              <div key={a.id} className="bg-black/30 border border-[#1f1f2e] rounded-lg p-4 mb-3">
                <div className="font-medium">{a.title}</div>
                <div className="text-xs text-gray-500 mt-1">From: {a.requested_by || 'agent'}</div>
                {a.summary && <p className="text-sm text-gray-400 mt-2">{a.summary}</p>}
                <div className="flex gap-2 mt-4">
                  <button onClick={() => decide(a.id, 'approved')} className="btn btn-primary text-sm py-2 px-3"><Check size={14} /> Approve</button>
                  <button onClick={() => decide(a.id, 'rejected')} className="btn btn-danger text-sm py-2 px-3"><X size={14} /> Reject</button>
                </div>
              </div>
            )) : <Empty message="Nothing waiting on you." />}
          </Section>

          <Section title={`Decided (${decided.length})`}>
            {decided.length ? decided.slice(0, 20).map((a) => (
              <div key={a.id} className="bg-black/20 border border-[#1f1f2e] rounded-lg p-4 mb-3 opacity-80">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{a.title}</div>
                  <div className={`badge badge-${a.status === 'approved' ? 'online' : 'offline'}`}>{a.status}</div>
                </div>
                {a.summary && <p className="text-sm text-gray-500 mt-2 line-clamp-2">{a.summary}</p>}
                {a.decision_note && <p className="text-xs text-gray-400 mt-2 italic">CEO: {a.decision_note}</p>}
              </div>
            )) : <Empty message="No history yet." />}
          </Section>
        </div>
      )}

      {open && <NewApproval onClose={() => setOpen(false)} onSave={create} />}
    </div>
  );
}

function NewApproval({ onClose, onSave }: { onClose: () => void; onSave: (d: any) => void }) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [requestedBy, setRequestedBy] = useState('Self');
  return (
    <Modal open onClose={onClose} title="Create approval request" wide>
      <div className="space-y-3">
        <input className="input" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input className="input" placeholder="Requested by (agent or person)" value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} />
        <textarea className="textarea" rows={5} placeholder="Details / context" value={summary} onChange={(e) => setSummary(e.target.value)} />
        <div className="flex gap-2 pt-2">
          <button className="btn btn-ghost flex-1" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary flex-1" onClick={() => onSave({ title, summary, requested_by: requestedBy })}>Send for approval</button>
        </div>
      </div>
    </Modal>
  );
}
