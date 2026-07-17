import supabase from './db-client.js';

/**
 * Run a chain of agents on a brief. The CEO posts a brief; we run:
 *   manager (plan) -> ui agent -> backend agent -> marketing agent
 *   -> researcher (improvements) -> reviewer (final QA report).
 * Saves each step's output, returns the full chain.
 */

async function callProvider({ provider, model, system, prompt, apiKey }) {
  if (provider === 'nvidia') {
    const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
        max_tokens: 1800,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`NVIDIA error ${res.status}: ${t.slice(0, 200)}`);
    }
    const j = await res.json();
    return j.choices?.[0]?.message?.content || '';
  }
  // openrouter default
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://cimetro.ai',
      'X-Title': 'CIMETRO',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 1800,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${t.slice(0, 200)}`);
  }
  const j = await res.json();
  return j.choices?.[0]?.message?.content || '';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { brief, client_name } = req.body;
    if (!brief) return res.status(400).json({ error: 'brief required' });

    const { data: agents } = await supabase.from('agents').select('*');
    if (!agents?.length) return res.status(500).json({ error: 'No agents configured' });

    const byRole = (r) => agents.find((a) => (a.role || '').toLowerCase().includes(r));

    const manager = byRole('manager');
    const ui = byRole('ui');
    const backend = byRole('backend');
    const marketing = byRole('marketing');
    const researcher = byRole('research');
    const reviewer = byRole('review');

    const steps = [];

    async function runAgent(agent, prompt) {
      if (!agent) return { agent: null, output: '[Agent not configured]' };
      const provider = agent.provider || 'openrouter';
      const apiKey = provider === 'nvidia' ? process.env.NVIDIA_API_KEY : process.env.OPENROUTER_API_KEY;
      if (!apiKey) return { agent, output: `[API key for ${provider} not set]` };
      try {
        const output = await callProvider({
          provider,
          model: agent.model,
          system: agent.system_prompt,
          prompt,
          apiKey,
        });
        return { agent, output };
      } catch (err) {
        return { agent, output: `[Error: ${err.message}]` };
      }
    }

    // 1. Manager plan
    const planPrompt = `Client: ${client_name || 'N/A'}\nBrief: ${brief}\n\nBreak this into a project plan: scope, deliverables, timeline, owner agents (UI/Backend/Marketing), risks, and a success metric. Be concise.`;
    const plan = await runAgent(manager, planPrompt);
    steps.push({ role: 'manager', agent_id: manager?.id, title: 'Project plan', output: plan.output });

    // 2. UI agent
    const uiPrompt = `Brief: ${brief}\nManager plan: ${plan.output}\n\nProduce a UI design specification: pages, sections, components, color/motion feel, typography, and a brief component tree. 10 bullets max.`;
    const uiOut = await runAgent(ui, uiPrompt);
    steps.push({ role: 'ui', agent_id: ui?.id, title: 'UI spec', output: uiOut.output });

    // 3. Backend agent
    const bePrompt = `Brief: ${brief}\nUI spec: ${uiOut.output}\n\nPropose backend architecture: data model, API endpoints (REST), third-party services, auth, hosting choice, and a deployment checklist. 10 bullets max.`;
    const beOut = await runAgent(backend, bePrompt);
    steps.push({ role: 'backend', agent_id: backend?.id, title: 'Backend spec', output: beOut.output });

    // 4. Marketing agent
    const mkPrompt = `Brief: ${brief}\nProject plan: ${plan.output}\n\nDraft a launch marketing plan: positioning, audience, channels (organic + paid), 5 social hooks, an email subject + body, and 1 landing page hero copy.`;
    const mkOut = await runAgent(marketing, mkPrompt);
    steps.push({ role: 'marketing', agent_id: marketing?.id, title: 'Marketing plan', output: mkOut.output });

    // 5. Researcher — improvement ideas
    const rsPrompt = `Brief: ${brief}\nCombined team outputs: plan=${plan.output}\nui=${uiOut.output}\nbackend=${beOut.output}\nmarketing=${mkOut.output}\n\nSuggest 5 concrete improvements, market positioning angles, and 2 product extension ideas. Each item ≤2 lines.`;
    const rsOut = await runAgent(researcher, rsPrompt);
    steps.push({ role: 'researcher', agent_id: researcher?.id, title: 'Ideas & improvements', output: rsOut.output });

    // 6. Reviewer — final QA
    const rvPrompt = `CEO brief: ${brief}\n\nTeam outputs:\nPLAN: ${plan.output}\nUI: ${uiOut.output}\nBACKEND: ${beOut.output}\nMARKETING: ${mkOut.output}\nRESEARCH: ${rsOut.output}\n\nVerify: does the team output match the CEO brief? Give a verdict (PASS / NEEDS WORK / FAIL), 0-100 confidence score, top 3 gaps, and a one-paragraph rationale. Be specific.`;
    const rvOut = await runAgent(reviewer, rvPrompt);
    steps.push({ role: 'reviewer', agent_id: reviewer?.id, title: 'Final review', output: rvOut.output });

    // Persist run as project + review
    const { data: project } = await supabase.from('projects').insert({
      name: brief.slice(0, 80),
      client: client_name || 'Internal',
      description: brief,
      status: 'in_review',
      budget: 0,
    }).select().single();

    const verdictMatch = /PASS/i.test(rvOut.output) ? 'pass' : /FAIL/i.test(rvOut.output) ? 'fail' : 'needs_work';
    const scoreMatch = rvOut.output.match(/(\d{1,3})\s*\/\s*100|(\d{1,3})\s*%/);
    const score = scoreMatch ? Number(scoreMatch[1] || scoreMatch[2]) : 70;

    const { data: review } = await supabase.from('reviews').insert({
      reference_id: project?.id,
      reference_type: 'team_run',
      brief,
      summary: `Run for: ${brief.slice(0, 120)}`,
      output: rvOut.output,
      verdict: verdictMatch,
      score,
      status: 'completed',
      gaps: [],
    }).select().single();

    await supabase.from('activity_log').insert({
      type: 'team_review',
      message: `Team review completed: ${verdictMatch} (${score}/100)`,
      reference_id: review?.id,
    });

    return res.status(200).json({
      ok: true,
      project,
      review,
      steps,
    });
  } catch (err) {
    console.error('team-review error:', err);
    res.status(500).json({ error: err.message });
  }
}
