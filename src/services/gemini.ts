/**
 * Calls Google Gemini API to generate a real AI result for a completed task.
 * Set VITE_GEMINI_API_KEY in .env (get one at https://aistudio.google.com/app/apikey).
 */

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-1.5-flash';

export interface AITaskResultPayload {
  summary: string;
  stepsCompleted: string[];
  outcome: string;
}

function getApiKey(): string | undefined {
  return typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY
    ? String(import.meta.env.VITE_GEMINI_API_KEY).trim()
    : undefined;
}

function buildPrompt(taskTitle: string): string {
  return `You are a business task assistant. A user just ran an AI-assisted completion for this task: "${taskTitle}".

Respond with a short, concrete result report in the following JSON format only (no markdown, no code block wrapper):
{
  "summary": "One or two sentences summarizing what was done for this task.",
  "stepsCompleted": ["Step 1 description", "Step 2 description", "Step 3 description", "Step 4 description"],
  "outcome": "One or two sentences on the outcome and any suggested next steps or follow-up."
}

Make the content specific to the task "${taskTitle}"—e.g. for "Finalize Q3 Report" mention report sections, data reviewed, or deliverables; for "Client Onboarding" mention onboarding steps or checklist items. Output only valid JSON.`;
}

export async function generateAITaskResult(taskTitle: string): Promise<AITaskResultPayload> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('Missing API key');
  }

  const url = `${GEMINI_API_BASE}/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(taskTitle) }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    let message = res.statusText;
    try {
      const j = JSON.parse(errBody);
      if (j?.error?.message) message = j.error.message;
    } catch {
      if (errBody) message = errBody.slice(0, 200);
    }
    throw new Error(message || `Gemini API error: ${res.status}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid response from Gemini');
  }

  const trimmed = text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error('AI did not return valid JSON');
  }

  if (!parsed || typeof parsed !== 'object' || !('summary' in parsed) || !('outcome' in parsed)) {
    throw new Error('AI response missing required fields');
  }

  const obj = parsed as Record<string, unknown>;
  const summary = typeof obj.summary === 'string' ? obj.summary : '';
  const outcome = typeof obj.outcome === 'string' ? obj.outcome : '';
  const stepsCompleted = Array.isArray(obj.stepsCompleted)
    ? obj.stepsCompleted.filter((s): s is string => typeof s === 'string')
    : [];

  return { summary: summary || 'Task completed.', stepsCompleted, outcome: outcome || 'Done.' };
}

export function hasGeminiApiKey(): boolean {
  return !!getApiKey();
}
