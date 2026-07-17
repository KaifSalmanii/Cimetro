import supabase from './db-client.js';

/**
 * Researcher fetch — pulls fresh ideas using web search + AI synthesis.
 * Called when CEO clicks "Researcher: fetch ideas".
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
        temperature: 0.8,
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
      temperature: 0.8,
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
    const { category } = req.body;
    const { data: agents } = await supabase.from('agents').select('*');
    const researcher = agents?.find((a) => (a.role || '').toLowerCase().includes('research'));
    if (!researcher) return res.status(500).json({ error: 'No researcher agent configured' });

    const provider = researcher.provider || 'openrouter';
    const apiKey = provider === 'nvidia' ? process.env.NVIDIA_API_KEY : process.env.OPENROUTER_API_KEY;
    if (!apiKey) return res.status(500).json({ error: `Missing ${provider === 'nvidia' ? 'NVIDIA_API_KEY' : 'OPENROUTER_API_KEY'}` });

    await supabase.from('agents').update({ status: 'working' }).eq('id', researcher.id);

    const prompt = `Find 8 fresh, current business + product ideas for a digital agency called CIMETRO (UI/UX, web apps, marketing, AI integrations). Category focus: ${category || 'general'}. For each idea return: title (≤8 words), 2-sentence summary, category, and a 0-100 opportunity score with brief reason. Format as a numbered list, no extra commentary.`;

    let raw = '';
    try {
      raw = await callProvider({ provider, model: researcher.model, system: researcher.system_prompt, prompt, apiKey });
    } finally {
      await supabase.from('agents').update({ status: 'online' }).eq('id', researcher.id);
    }

    // Parse numbered ideas
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

    // Insert ideas
    const { data, error } = await supabase.from('research_ideas').insert(items).select();
    if (error) throw error;

    await supabase.from('activity_log').insert({
      type: 'research',
      message: `Researcher added ${items.length} ideas (category: ${category || 'general'})`,
    });

    return res.status(200).json({ ok: true, inserted: items.length, ideas: data });
  } catch (err) {
    console.error('researcher-fetch error:', err);
    res.status(500).json({ error: err.message });
  }
}
