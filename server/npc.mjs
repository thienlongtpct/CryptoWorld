import { prepareNpc } from '../src/characters/views.ts';

const GEMINI_MISSING = 'Gemini is not configured on the account server. Set GEMINI_API_KEY to enable tutoring. Guest introductions do not need it.';

function modelName(model) {
  return typeof model === 'string' && /^[a-zA-Z0-9._-]+$/.test(model) ? model : 'gemini-3.5-flash';
}

async function callGemini({ gemini, model, system, view, question }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName(model)}:generateContent`;
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-goog-api-key': gemini,
      },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{
          role: 'user',
          parts: [
            { text: `Permitted view:\n${JSON.stringify(view)}` },
            { text: `Question:\n${question}` },
          ],
        }],
        // Thinking tokens count toward maxOutputTokens, so keep thinking low and leave headroom for the answer.
        generationConfig: { temperature: 0.4, maxOutputTokens: 1500, thinkingConfig: { thinkingLevel: 'low' } },
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    return { status: 504, body: { error: 'Gemini took too long. The scripted introduction is still available.' } };
  }
  const data = await response.json().catch(() => ({}));
  const candidate = data?.candidates?.[0];
  const text = candidate?.content?.parts?.filter(part => !part.thought).map(part => part.text || '').join('').trim() || '';
  if (response.ok && candidate?.finishReason === 'MAX_TOKENS') {
    return { status: 502, body: { error: 'The answer was cut off. Try a shorter or more specific question.' } };
  }
  if (!response.ok || !text) {
    const message = data?.error?.message;
    const safe = typeof message === 'string' && !message.includes(gemini) ? message : 'Gemini did not return a tutoring answer.';
    return { status: 502, body: { error: safe } };
  }
  return { status: 200, body: { answer: text, characterId: view.characterId, mode: view.mode } };
}

export async function answerNpc({ gemini = '', model = '', body }) {
  const prepared = prepareNpc(body);
  if (!prepared.ok) return { status: prepared.status, body: { error: prepared.error } };
  if (!gemini) return { status: 503, body: { error: GEMINI_MISSING, configured: false } };
  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  return callGemini({ gemini, model, system: prepared.system, view: prepared.view, question });
}
