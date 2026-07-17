import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { Section, Empty, Spinner } from '../components/StatCard';
import { Sparkles, ShieldCheck } from 'lucide-react';

export default function Reviews() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/reviews').then((r) => r.json()).then((d) => { setReviews(d || []); setLoading(false); });
  }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Reviews" subtitle="QA reports from the Reviewer agent — checks that team output matches the original CEO brief." />

      {loading ? <Spinner /> : !reviews.length ? (
        <Section title="No reviews yet"><Empty message="Run the team from the Projects page to generate one." /></Section>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="card-gradient rounded-2xl p-6">
              <div className="flex items-start justify-between mb-3 gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-gray-500 font-mono uppercase">{r.reference_type} · {new Date(r.created_at).toLocaleString()}</div>
                  <div className="font-display font-semibold text-lg mt-1">{r.summary}</div>
                  {r.brief && <div className="text-sm text-gray-400 mt-2"><span className="text-gray-500">Brief:</span> {r.brief}</div>}
                </div>
                <div className="flex items-center gap-3">
                  <div className={`badge badge-${r.verdict === 'pass' ? 'online' : r.verdict === 'fail' ? 'offline' : 'working'}`}>
                    <ShieldCheck size={12} /> {r.verdict?.toUpperCase()}
                  </div>
                  <div className="font-mono text-2xl font-bold">{r.score}<span className="text-gray-500 text-sm">/100</span></div>
                </div>
              </div>
              {r.output && (
                <pre className="text-xs text-gray-300 whitespace-pre-wrap mt-4 p-4 bg-black/30 rounded-lg border border-[#1f1f2e] max-h-72 overflow-y-auto">{r.output}</pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
