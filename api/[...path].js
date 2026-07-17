// Single catch-all serverless handler for all CIMETRO API endpoints.
// Vercel routes every /api/<anything> URL here; we dispatch by req.query.path.

import supabase from '../lib/db.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function setCors(res) {
  for (const k of Object.keys(CORS)) res.setHeader(k, CORS[k]);
}

function json(res, code, body) {
  res.status(code).json(body);
}

async function callProvider({ provider, model, system, prompt, apiKey, max_tokens = 1600, temperature = 0.7 }) {
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
        temperature,
        max_tokens,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`NVIDIA error ${res.status}: ${t.slice(0, 200)}`);
    }
    const j = await res.json();
    return j.choices?.[0]?.message?.content || '';
  }
  // default: openrouter
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
      temperature,
      max_tokens,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${t.slice(0, 200)}`);
  }
  const j = await res.json();
  return j.choices?.[0]?.message?.content || '';
}

function getProviderFor(agent) {
  return agent.provider || (agent.model?.includes('nvidia') ? 'nvidia' : 'openrouter');
}

// ---------- handlers ----------

async function handleAgents(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('agents').select('*').order('id', { ascending: true });
    if (error) throw error;
    return json(res, 200, data);
  }
  if (req.method === 'POST') {
    const { name, role, system_prompt, model, provider, status, color, icon } = req.body || {};
    const { data, error } = await supabase.from('agents').insert({ name, role, system_prompt, model, provider, status: status || 'idle', color, icon }).select().single();
    if (error) throw error;
    return json(res, 201, data);
  }
  if (req.method === 'PUT') {
    const { id, ...updates } = req.body || {};
    const { data, error } = await supabase.from('agents').update(updates).eq('id', id).select().single();
    if (error) throw error;
    return json(res, 200, data);
  }
  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    const { error } = await supabase.from('agents').delete().eq('id', id);
    if (error) throw error;
    return json(res, 200, { ok: true });
  }
  return json(res, 405, { error: 'Method not allowed' });
}

async function handleOrders(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return json(res, 200, data);
  }
  if (req.method === 'POST') {
    const { client_name, client_email, title, brief, budget, priority } = req.body || {};
    const { data, error } = await supabase.from('orders').insert({
      client_name, client_email, title, brief, budget,
      priority: priority || 'normal', status: 'received',
    }).select().single();
    if (error) throw error;
    await supabase.from('activity_log').insert({ type: 'order_created', message: `New order from ${client_name}: ${title}`, reference_id: data.id });
    return json(res, 201, data);
  }
  if (req.method === 'PUT') {
    const { id, ...updates } = req.body || {};
    const { data, error } = await supabase.from('orders').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return json(res, 200, data);
  }
  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) throw error;
    return json(res, 200, { ok: true });
  }
  return json(res, 405, { error: 'Method not allowed' });
}

async function handleProjects(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return json(res, 200, data);
  }
  if (req.method === 'POST') {
    const { name, client, description, status, budget, deadline } = req.body || {};
    const { data, error } = await supabase.from('projects').insert({ name, client, description, status: status || 'planning', budget, deadline }).select().single();
    if (error) throw error;
    return json(res, 201, data);
  }
  if (req.method === 'PUT') {
    const { id, ...updates } = req.body || {};
    const { data, error } = await supabase.from('projects').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return json(res, 200, data);
  }
  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
    return json(res, 200, { ok: true });
  }
  return json(res, 405, { error: 'Method not allowed' });
}

async function handleTasks(req, res) {
  const orderId = req.query?.order_id;
  if (req.method === 'GET') {
    let q = supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (orderId) q = q.eq('order_id', orderId);
    const { data, error } = await q;
    if (error) throw error;
    return json(res, 200, data);
  }
  if (req.method === 'POST') {
    const { order_id, agent_id, title, description, status } = req.body || {};
    const { data, error } = await supabase.from('tasks').insert({
      order_id: order_id || null, agent_id, title, description, status: status || 'queued',
    }).select().single();
    if (error) throw error;
    return json(res, 201, data);
  }
  if (req.method === 'PUT') {
    const { id, ...updates } = req.body || {};
    const { data, error } = await supabase.from('tasks').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return json(res, 200, data);
  }
  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    const { error } = await supabase.from('tasks').delete().eq('id', id);
    if (error) throw error;
    return json(res, 200, { ok: true });
  }
  return json(res, 405, { error: 'Method not allowed' });
}

async function handleResearch(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('research_ideas').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return json(res, 200, data);
  }
  if (req.method === 'POST') {
    const { title, summary, category, source, score } = req.body || {};
    const { data, error } = await supabase.from('research_ideas').insert({
      title, summary, category, source, score: score || 0, status: 'new',
    }).select().single();
    if (error) throw error;
    return json(res, 201, data);
  }
  if (req.method === 'PUT') {
    const { id, ...updates } = req.body || {};
    const { data, error } = await supabase.from('research_ideas').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return json(res, 200, data);
  }
  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    const { error } = await supabase.from('research_ideas').delete().eq('id', id);
    if (error) throw error;
    return json(res, 200, { ok: true });
  }
  return json(res, 405, { error: 'Method not allowed' });
}

async function handleApprovals(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('approvals').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return json(res, 200, data);
  }
  if (req.method === 'POST') {
    const { title, summary, requested_by, reference_id, reference_type, payload } = req.body || {};
    const { data, error } = await supabase.from('approvals').insert({
      title, summary, requested_by, reference_id, reference_type, payload: payload || null, status: 'pending',
    }).select().single();
    if (error) throw error;
    return json(res, 201, data);
  }
  if (req.method === 'PUT') {
    const { id, ...updates } = req.body || {};
    const { data, error } = await supabase.from('approvals').update({ ...updates, decided_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return json(res, 200, data);
  }
  return json(res, 405, { error: 'Method not allowed' });
}

async function handleReviews(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return json(res, 200, data);
  }
  if (req.method === 'POST') {
    const { reference_id, reference_type, brief, summary, verdict, score, gaps } = req.body || {};
    const { data, error } = await supabase.from('reviews').insert({
      reference_id, reference_type, brief, summary, verdict: verdict || 'pending', score: score || 0, gaps: gaps || [], status: 'in_review',
    }).select().single();
    if (error) throw error;
    return json(res, 201, data);
  }
  if (req.method === 'PUT') {
    const { id, ...updates } = req.body || {};
    const { data, error } = await supabase.from('reviews').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
    if (error) throw error;
    return json(res, 200, data);
  }
  return json(res, 405, { error: 'Method not allowed' });
}

async function handleActivity(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return json(res, 200, data);
  }
  if (req.method === 'POST') {
    const { type, message, reference_id } = req.body || {};
    const { data, error } = await supabase.from('activity_log').insert({ type, message, reference_id: reference_id || null }).select().single();
    if (error) throw error;
    return json(res, 201, data);
  }
  return json(res, 405, { error: 'Method not allowed' });
}

async function handleMessages(req, res) {
  if (req.method === 'GET') {
    const { data, error } = await supabase.from('messages').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return json(res, 200, data);
  }
  if (req.method === 'POST') {
    const { from_agent, to_agent, content, channel } = req.body || {};
    const { data, error } = await supabase.from('messages').insert({
      from_agent, to_agent: to_agent || null, content, channel: channel || 'general',
    }).select().single();
    if (error) throw error;
    return json(res, 201, data);
  }
  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    const { error } = await supabase.from('messages').delete().eq('id', id);
    if (error) throw error;
    return json(res, 200, { ok: true });
  }
  return json(res, 405, { error: 'Method not allowed' });
}

async function handleAgentRun(req, res) {
  const { agent_id, prompt, save_as } = req.body || {};
  if (!agent_id || !prompt) return json(res, 400, { error: 'agent_id and prompt required' });

  const { data: agent, error: agentErr } = await supabase.from('agents').select('*').eq('id', agent_id).single();
  if (agentErr || !agent) return json(res, 404, { error: 'Agent not found' });

  const provider = getProviderFor(agent);
  const apiKey = provider === 'nvidia' ? process.env.NVIDIA_API_KEY : process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return json(res, 500, {
      error: `API key for ${provider} not configured. Add ${provider === 'nvidia' ? 'NVIDIA_API_KEY' : 'OPENROUTER_API_KEY'} in Vercel env vars.`,
    });
  }

  await supabase.from('agents').update({ status: 'working' }).eq('id', agent_id);

  let output = '';
  try {
    output = await callProvider({ provider, model: agent.model, system: agent.system_prompt, prompt, apiKey });
  } finally {
    await supabase.from('agents').update({ status: 'online' }).eq('id', agent_id);
  }

  const { data: task } = await supabase.from('tasks').insert({
    agent_id, title: save_as || `${agent.name} task`, description: prompt, output, status: 'completed',
  }).select().single();

  await supabase.from('activity_log').insert({
    type: 'agent_run', message: `${agent.name} completed a task via ${provider}/${agent.model}`, reference_id: task?.id,
  });

  return json(res, 200, { ok: true, output, task_id: task?.id });
}

async function handleTeamReview(req, res) {
  const { brief, client_name } = req.body || {};
  if (!brief) return json(res, 400, { error: 'brief required' });

  const { data: agents } = await supabase.from('agents').select('*');
  if (!agents?.length) return json(res, 500, { error: 'No agents configured' });

  const byRole = (r) => agents.find((a) => (a.role || '').toLowerCase().includes(r));
  const manager = byRole('manager');
  const ui = byRole('ui');
  const backend = byRole('backend');
  const marketing = byRole('marketing');
  const researcher = byRole('research');
  const reviewer = byRole('review');

  const steps = [];

  async function runAgent(agent, prompt) {
    if (!agent) return '[Agent not configured]';
    const provider = getProviderFor(agent);
    const apiKey = provider === 'nvidia' ? process.env.NVIDIA_API_KEY : process.env.OPENROUTER_API_KEY;
    if (!apiKey) return `[API key for ${provider} not set]`;
    try {
      return await callProvider({ provider, model: agent.model, system: agent.system_prompt, prompt, apiKey, max_tokens: 1800, temperature: 0.6 });
    } catch (err) {
      return `[Error: ${err.message}]`;
    }
  }

  const plan = await runAgent(manager, `Client: ${client_name || 'N/A'}\nBrief: ${brief}\n\nBreak this into a project plan: scope, deliverables, timeline, owner agents (UI/Backend/Marketing), risks, and a success metric. Be concise.`);
  steps.push({ role: 'manager', agent_id: manager?.id, title: 'Project plan', output: plan });

  const uiOut = await runAgent(ui, `Brief: ${brief}\nManager plan: ${plan}\n\nProduce a UI design specification: pages, sections, components, color/motion feel, typography, and a brief component tree. 10 bullets max.`);
  steps.push({ role: 'ui', agent_id: ui?.id, title: 'UI spec', output: uiOut });

  const beOut = await runAgent(backend, `Brief: ${brief}\nUI spec: ${uiOut}\n\nPropose backend architecture: data model, API endpoints (REST), third-party services, auth, hosting choice, and a deployment checklist. 10 bullets max.`);
  steps.push({ role: 'backend', agent_id: backend?.id, title: 'Backend spec', output: beOut });

  const mkOut = await runAgent(marketing, `Brief: ${brief}\nProject plan: ${plan}\n\nDraft a launch marketing plan: positioning, audience, channels (organic + paid), 5 social hooks, an email subject + body, and 1 landing page hero copy.`);
  steps.push({ role: 'marketing', agent_id: marketing?.id, title: 'Marketing plan', output: mkOut });

  const rsOut = await runAgent(researcher, `Brief: ${brief}\nCombined team outputs: plan=${plan}\nui=${uiOut}\nbackend=${beOut}\nmarketing=${mkOut}\n\nSuggest 5 concrete improvements, market positioning angles, and 2 product extension ideas. Each item ≤2 lines.`);
  steps.push({ role: 'researcher', agent_id: researcher?.id, title: 'Ideas & improvements', output: rsOut });

  const rvOut = await runAgent(reviewer, `CEO brief: ${brief}\n\nTeam outputs:\nPLAN: ${plan}\nUI: ${uiOut}\nBACKEND: ${beOut}\nMARKETING: ${mkOut}\nRESEARCH: ${rsOut}\n\nVerify: does the team output match the CEO brief? Give a verdict (PASS / NEEDS WORK / FAIL), 0-100 confidence score, top 3 gaps, and a one-paragraph rationale. Be specific.`);
  steps.push({ role: 'reviewer', agent_id: reviewer?.id, title: 'Final review', output: rvOut });

  const { data: project } = await supabase.from('projects').insert({
    name: brief.slice(0, 80), client: client_name || 'Internal', description: brief, status: 'in_review', budget: 0,
  }).select().single();

  const verdictMatch = /PASS/i.test(rvOut) ? 'pass' : /FAIL/i.test(rvOut) ? 'fail' : 'needs_work';
  const scoreMatch = rvOut.match(/(\d{1,3})\s*\/\s*100|(\d{1,3})\s*%/);
  const score = scoreMatch ? Number(scoreMatch[1] || scoreMatch[2]) : 70;

  const { data: review } = await supabase.from('reviews').insert({
    reference_id: project?.id, reference_type: 'team_run', brief, summary: `Run for: ${brief.slice(0, 120)}`,
    output: rvOut, verdict: verdictMatch, score, status: 'completed', gaps: [],
  }).select().single();

  await supabase.from('activity_log').insert({
    type: 'team_review', message: `Team review completed: ${verdictMatch} (${score}/100)`, reference_id: review?.id,
  });

  return json(res, 200, { ok: true, project, review, steps });
}

async function handleResearcherFetch(req, res) {
  const { category } = req.body || {};
  const { data: agents } = await supabase.from('agents').select('*');
  const researcher = agents?.find((a) => (a.role || '').toLowerCase().includes('research'));
  if (!researcher) return json(res, 500, { error: 'No researcher agent configured' });

  const provider = getProviderFor(researcher);
  const apiKey = provider === 'nvidia' ? process.env.NVIDIA_API_KEY : process.env.OPENROUTER_API_KEY;
  if (!apiKey) return json(res, 500, { error: `Missing ${provider === 'nvidia' ? 'NVIDIA_API_KEY' : 'OPENROUTER_API_KEY'}` });

  await supabase.from('agents').update({ status: 'working' }).eq('id', researcher.id);

  const prompt = `Find 8 fresh, current business + product ideas for a digital agency called CIMETRO (UI/UX, web apps, marketing, AI integrations). Category focus: ${category || 'general'}. For each idea return: title (≤8 words), 2-sentence summary, category, and a 0-100 opportunity score with brief reason. Format as a numbered list, no extra commentary.`;

  let raw = '';
  try {
    raw = await callProvider({ provider, model: researcher.model, system: researcher.system_prompt, prompt, apiKey, temperature: 0.8, max_tokens: 1800 });
  } finally {
    await supabase.from('agents').update({ status: 'online' }).eq('id', researcher.id);
  }

  const items = [];
  const blocks = raw.split(/\n\s*\n|(?=^\d+\.\s)/m);
  for (const block of blocks) {
    const m = block.match(/^\s*\d+\.\s+(.+?)(?:\n|$)([\s\S]*)/);
    if (!m) continue;
    const title = m[1].trim();
    const body = (m[2] || '').trim();
    const scoreM = body.match(/(\d{1,3})\s*\/\s*100|(\d{1,3})\s*%/);
    const score = scoreM ? Number(scoreM[1] || scoreM[2]) : 60;
    const catM = body.match(/category[:\s]+([a-zA-Z &/]+)/i);
    const cat = catM ? catM[1].trim().slice(0, 40) : (category || 'general');
    items.push({ title, summary: body.slice(0, 320), category: cat, score, source: 'ai-researcher' });
  }

  if (!items.length) {
    items.push({ title: 'AI Receptionist for Local Businesses', summary: raw.slice(0, 280), category: category || 'general', score: 70, source: 'ai-researcher' });
  }

  const { data, error } = await supabase.from('research_ideas').insert(items).select();
  if (error) throw error;

  await supabase.from('activity_log').insert({
    type: 'research', message: `Researcher added ${items.length} ideas (category: ${category || 'general'})`,
  });

  return json(res, 200, { ok: true, inserted: items.length, ideas: data });
}

const ROUTES = {
  'agents': handleAgents,
  'orders': handleOrders,
  'projects': handleProjects,
  'tasks': handleTasks,
  'research': handleResearch,
  'approvals': handleApprovals,
  'reviews': handleReviews,
  'activity': handleActivity,
  'messages': handleMessages,
  'agent-run': handleAgentRun,
  'team-review': handleTeamReview,
  'researcher-fetch': handleResearcherFetch,
};

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const path = req.query?.path;
    const segments = Array.isArray(path) ? path : (path ? [path] : []);
    const key = segments[0] || '';
    const fn = ROUTES[key];
    if (!fn) {
      return json(res, 404, { error: `Unknown endpoint: /api/${segments.join('/') || ''}` });
    }
    return await fn(req, res);
  } catch (err) {
    console.error('API error:', err);
    return json(res, 500, { error: err.message });
  }
}
