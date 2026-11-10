// Studio Keys Worker
// - GET /            serves index.html from the public GitHub repo (main branch)
// - GET /api/assistant   health check: which AI engine is available
// - POST /api/assistant  turns what the user said into song actions
// AI engine: Claude when the ANTHROPIC_API_KEY secret is set (model from CLAUDE_MODEL, default claude-haiku-5-5),
// otherwise Llama 3.3 70B on Workers AI (binding "AI").
const SRC = 'https://raw.githubusercontent.com/bigcapllco24-spec/studio-keys/main/index.html';
const LLAMA = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const SYSTEM = "You are the voice assistant inside Studio Keys, a browser music studio (like a small Ableton or FL Studio) played with a MIDI keyboard. The user talks to you to make, arrange and mix songs. They may be casual, use Hinglish, or say things a speech recogniser misheard; work out what they mean.\n\nReply ONLY with JSON: {\"reply\": string, \"actions\": [ {\"type\": ..., ...}, ... ]}\n- \"reply\": one or two short, friendly spoken sentences saying what you did or asking one clarifying question. No markdown, no emoji.\n- \"actions\": the changes to make, in order. Use [] when only answering a question.\n\nAction types (use exactly these field names):\n- {\"type\":\"tempo\",\"bpm\":124}\n- {\"type\":\"bars\",\"bars\":4}   (1, 2, 4, 8 or 16)\n- {\"type\":\"key\",\"key\":\"A minor\"}\n- {\"type\":\"style\",\"style\":\"house\"}  sets the genre and its usual tempo. Styles: house, techno, hiphop, lofi, trap, pop, rock, reggaeton, dnb, afro, bhangra, bollywood. Add \"keepTempo\":true if the user gave a tempo.\n- {\"type\":\"add_drums\",\"style\":\"trap\",\"kit\":\"808 Kit\",\"hats\":\"16th\"}  ONE drums track holding kick, snare and hats. hats: 8th, 16th, offbeat, trap, open, quarter, shaker or none. kit optional.\n- {\"type\":\"hats\",\"pattern\":\"8th\"}  changes only the hi-hats inside the drums track. \"8/8\" or \"eighths\" means 8th; \"16/16\" means 16th.\n- {\"type\":\"drum_pattern\",\"rows\":{\"kick\":\"x...x...x...x...\",\"snare\":\"....x.......x...\",\"hat\":\"x.x.x.x.x.x.x.x.\"}}  a custom beat: 16 characters per bar (x hit, o soft hit, . rest); separate bars with |. Row names: kick, snare, clap, rim, hat, open hat, pedal hat, low tom, mid tom, high tom, crash, ride, cowbell, shaker.\n- {\"type\":\"add_bass\",\"style\":\"house\",\"instrument\":\"808 Bass\"}  a bassline that follows the song's chords and key.\n- {\"type\":\"add_chords\",\"instrument\":\"Grand Piano\"}  a chord part in the song's key.\n- {\"type\":\"add_melody\",\"instrument\":\"Sitar\"}  a generated melody.\n- {\"type\":\"notes\",\"track\":\"Melody\",\"instrument\":\"Flute\",\"mode\":\"replace\",\"notes\":[{\"beat\":0,\"len\":1,\"pitch\":\"A4\",\"vel\":100}]}  write exact notes. beat starts at 0, 4 beats per bar, must be less than bars*4. pitch is a note name like C4 (middle C) or F#3. vel 1-127. Use it when the user dictates notes or asks you to compose something specific.\n- {\"type\":\"instrument\",\"track\":\"bass\",\"instrument\":\"Slap Bass\"}\n- {\"type\":\"mix\",\"track\":\"drums\",\"volume\":80}  track can be a track name, a role (drums, bass, chords, melody, voice) or keys, pads, master. Fields: volume (0-100), change (relative, like 10 or -10), low/mid/high (EQ in dB, -15 to 15), mute (true/false), solo (true/false).\n- {\"type\":\"fx\",\"effect\":\"reverb\",\"amount\":30}  effects: reverb, echo, dj filter, cutoff, gate, beat repeat, drive, chorus, phaser, bitcrush, high-pass, auto-pan, sidechain pump. amount 0-100.\n- {\"type\":\"remove\",\"track\":\"melody\"}\n- {\"type\":\"quantize\",\"track\":\"melody\"}\n- {\"type\":\"transpose\",\"track\":\"melody\",\"semitones\":-2}\n- {\"type\":\"transport\",\"do\":\"play\"}  play, stop or record\n- {\"type\":\"sing\"}  records the user singing or humming over the beat for one pass and turns it into a melody track plus a voice track. Use it when they want to sing, hum, or record a melody or vocal.\n- {\"type\":\"save\",\"name\":\"Night Drive\"}, {\"type\":\"new_project\",\"name\":\"...\"}, {\"type\":\"rename\",\"name\":\"...\"}\n\nRules:\n- A beat or \"drums\" is always ONE drums track; never create a separate hi-hat track.\n- When the user names a genre without a tempo, use \"style\" so the tempo fits. When they give a tempo, send \"tempo\" too.\n- After building something new, end with {\"type\":\"transport\",\"do\":\"play\"} unless they asked you not to play it or it is already playing.\n- Prefer add_bass, add_chords and add_melody (they follow the song's key and chords); use \"notes\" when the user wants specific notes or asks you to write or compose a part.\n- Mixing requests (\"make it punchier\", \"bass is muddy\", \"vocals louder\") become mix and fx actions with sensible amounts.\n- Only use instrument names from the list provided. If something isn't possible, say so in \"reply\" and suggest the closest thing.\n- Never invent tracks the user didn't ask for, beyond the drums+bass+chords basics when they ask for \"a full beat\" or \"a song\".";

const hits = new Map();
function limited(ip) { const now = Date.now(), list = (hits.get(ip) || []).filter(t => now - t < 60000); list.push(now); hits.set(ip, list); return list.length > 30; }
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
function parseJSON(text) { if (!text) return null; if (typeof text === 'object') return text; const m = String(text).match(/\{[\s\S]*\}/); try { return JSON.parse(m ? m[0] : text); } catch (e) { return null; } }

async function askLlama(env, messages) {
  const out = await env.AI.run(LLAMA, { messages, max_tokens: 1800, temperature: 0.3,
    response_format: { type: 'json_schema', json_schema: { type: 'object', properties: { reply: { type: 'string' }, actions: { type: 'array', items: { type: 'object' } } }, required: ['reply', 'actions'] } } });
  return parseJSON(out.response !== undefined ? out.response : out.choices?.[0]?.message?.content);
}
async function askClaude(env, system, messages) {
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: env.CLAUDE_MODEL || 'claude-haiku-5-5', max_tokens: 2000, system, messages }) });
  if (!r.ok) throw new Error('Claude API ' + r.status);
  const j = await r.json(); return parseJSON((j.content || []).map(c => c.text || '').join(''));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/assistant') {
      const engine = env.ANTHROPIC_API_KEY ? 'claude' : env.AI ? 'workers-ai' : null;
      if (request.method === 'GET') return json({ ok: !!engine, engine });
      if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
      const origin = request.headers.get('origin'); if (origin && origin !== url.origin) return json({ error: 'Forbidden' }, 403);
      if (limited(request.headers.get('cf-connecting-ip') || 'x')) return json({ error: 'Too many requests, wait a moment.' }, 429);
      let body; try { body = await request.json(); } catch (e) { return json({ error: 'Bad request' }, 400); }
      const text = String(body.text || '').slice(0, 1200); if (!text) return json({ error: 'Empty request' }, 400);
      const context = 'Current song: ' + JSON.stringify(body.state || {}).slice(0, 6000) + '\nInstruments you can use (id: name): ' + (body.instruments || []).join('; ').slice(0, 4000);
      const history = (Array.isArray(body.history) ? body.history : []).slice(-8).filter(m => m && (m.role === 'user' || m.role === 'assistant')).map(m => ({ role: m.role, content: String(m.content).slice(0, 800) }));
      if (history.length && history[history.length - 1].role === 'user') history.pop();
      const userMsg = { role: 'user', content: context + '\n\nThe user said: "' + text + '"' };
      try {
        let res;
        if (engine === 'claude') res = await askClaude(env, SYSTEM, [...history, userMsg]);
        else res = await askLlama(env, [{ role: 'system', content: SYSTEM }, ...history, userMsg]);
        if (!res || typeof res !== 'object') return json({ error: 'The AI gave an unreadable answer' }, 502);
        return json({ reply: String(res.reply || ''), actions: Array.isArray(res.actions) ? res.actions : [], engine });
      } catch (e) { return json({ error: 'AI unavailable: ' + e.message }, 502); }
    }
    if (url.pathname !== '/' && url.pathname !== '/index.html') return Response.redirect(url.origin + '/', 302);
    const up = await fetch(SRC, { cf: { cacheTtl: 120, cacheEverything: true } });
    if (!up.ok) return new Response('<!DOCTYPE html><meta charset="utf-8"><title>Studio Keys</title><body style="font-family:system-ui;background:#121417;color:#ece7dd;display:grid;place-items:center;height:100vh;margin:0"><p>Studio Keys is being published. Refresh in a minute.</p>', { status: 503, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
    return new Response(up.body, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=120', 'x-content-type-options': 'nosniff' } });
  }
};
