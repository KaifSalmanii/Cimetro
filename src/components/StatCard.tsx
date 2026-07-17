import { ReactNode } from 'react';

export function StatCard({ label, value, icon, accent = 'violet' }: { label: string; value: ReactNode; icon?: ReactNode; accent?: 'violet' | 'cyan' | 'green' | 'amber' }) {
  const accentMap = {
    violet: 'from-violet-500/20 to-violet-500/0 text-violet-300',
    cyan: 'from-cyan-500/20 to-cyan-500/0 text-cyan-300',
    green: 'from-emerald-500/20 to-emerald-500/0 text-emerald-300',
    amber: 'from-amber-500/20 to-amber-500/0 text-amber-300',
  };
  return (
    <div className="card-gradient rounded-2xl p-5 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${accentMap[accent]} pointer-events-none`} />
      <div className="relative">
        <div className="flex items-center justify-between text-gray-400 text-xs uppercase tracking-wider font-medium">
          {label}
          {icon}
        </div>
        <div className="font-display text-3xl font-bold mt-3">{value}</div>
      </div>
    </div>
  );
}

export function Section({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="card-gradient rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function Empty({ message = 'No data yet.' }: { message?: string }) {
  return (
    <div className="text-center py-12 text-gray-500 text-sm">
      {message}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
