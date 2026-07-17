import supabase from './db-client.js';

/**
 * Single endpoint to run any AI agent on a prompt.
 * Reads the agent's chosen model + provider, calls the right upstream API,
 * stores the output back to the agent's recent tasks and writes activity.
 */

async function callOpenRouter({ apiKey, model, system, prompt }) {
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
      temperature: 0.7,
      max_tokens: 1600,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${t.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content || '';
}

async function callNvidia({ apiKey, model, system, prompt }) {
  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1600,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`NVIDIA NIM error ${res.status}: ${t.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content || '';
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const { agent_id, prompt, save_as } = req.body;
    if (!agent_id || !prompt) return res.status(400).json({ error: 'agent_id and prompt required' });

    // Load agent
    const { data: agent, error: agentErr } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agent_id)
      .single();
    if (agentErr || !agent) return res.status(404).json({ error: 'Agent not found' });

    // Resolve provider + model
    const provider = agent.provider || (agent.model?.includes('nvidia') ? 'nvidia' : 'openrouter');
    const model = agent.model;
    const apiKey = provider === 'nvidia' ? process.env.NVIDIA_API_KEY : process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: `API key for ${provider} not configured. Add ${provider === 'nvidia' ? 'NVIDIA_API_KEY' : 'OPENROUTER_API_KEY'} in Vercel env vars.`,
      });
    }

    // Mark agent busy
    await supabase.from('agents').update({ status: 'working' }).eq('id', agent_id);

    let output = '';
    try {
      output = provider === 'nvidia'
        ? await callNvidia({ apiKey, model, system: agent.system_prompt, prompt })
        : await callOpenRouter({ apiKey, model, system: agent.system_prompt, prompt });
    } finally {
      await supabase.from('agents').update({ status: 'online' }).eq('id', agent_id);
    }

    // Store as task
    const { data: task } = await supabase.from('tasks').insert({
      agent_id,
      title: save_as || `${agent.name} task`,
      description: prompt,
      output,
      status: 'completed',
    }).select().single();

    // Activity log
    await supabase.from('activity_log').insert({
      type: 'agent_run',
      message: `${agent.name} completed a task via ${provider}/${model}`,
      reference_id: task?.id,
    });

    return res.status(200).json({ ok: true, output, task_id: task?.id });
  } catch (err) {
    console.error('agent-run error:', err);
    res.status(500).json({ error: err.message });
  }
}
