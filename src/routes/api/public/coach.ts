// ===============================================
// Jiya Fit Buddy - secure AI endpoint for Coach Jiya
// ===============================================
// The browser NEVER sees the AI key. The page sends the user's question plus
// the Supabase access token here; this server code checks the token, then
// calls the Lovable AI gateway with the secret key.

import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

const MODEL = 'google/gemini-2.5-flash'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

export const Route = createFileRoute('/api/public/coach')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const SUPABASE_URL = process.env['SUPABASE_URL']
        const SUPABASE_PUBLISHABLE_KEY = process.env['SUPABASE_PUBLISHABLE_KEY']
        const LOVABLE_API_KEY = process.env['LOVABLE_API_KEY']

        if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY || !LOVABLE_API_KEY) {
          return json({ error: 'The AI coach is not configured yet.' }, 500)
        }

        // 1. Check that a real logged in user is asking.
        const authHeader = request.headers.get('authorization') ?? ''
        const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
        if (!token) return json({ error: 'Please log in again.' }, 401)

        const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
          auth: { persistSession: false, autoRefreshToken: false },
        })
        const { data: claims, error: claimsError } = await supabase.auth.getClaims(token)
        if (claimsError || !claims?.claims?.sub) {
          return json({ error: 'Please log in again.' }, 401)
        }

        // 2. Read the question and the user facts the page sent.
        let payload: { message?: string; facts?: string; history?: Array<{ sender: string; message: string }> }
        try {
          payload = await request.json()
        } catch {
          return json({ error: 'Bad request.' }, 400)
        }

        const message = (payload.message ?? '').toString().slice(0, 1000).trim()
        if (!message) return json({ error: 'Type a question first.' }, 400)

        const facts = (payload.facts ?? '').toString().slice(0, 2000)
        const history = Array.isArray(payload.history) ? payload.history.slice(-10) : []

        const systemPrompt =
          'You are Jiya, a friendly Indian fitness coach inside the Jiya Fit Buddy app. ' +
          'Answer questions about workouts, exercises, exercise replacement, goals, calories, ' +
          'nutrition, recovery, progress and daily activity. Use the user facts below to make ' +
          'every answer personal. Be practical and encouraging, use simple English, and keep ' +
          'answers under 150 words unless the user asks for a full plan. Never give medical ' +
          'diagnoses; suggest seeing a doctor for pain or illness.\n\nUSER FACTS:\n' +
          facts

        const messages = [
          { role: 'system', content: systemPrompt },
          ...history.map((item) => ({
            role: item.sender === 'user' ? 'user' : 'assistant',
            content: String(item.message).slice(0, 1000),
          })),
          { role: 'user', content: message },
        ]

        // 3. Ask the AI gateway.
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ model: MODEL, messages }),
        })

        if (response.status === 429) {
          return json({ error: 'Coach Jiya is busy right now. Please try again in a minute.' }, 429)
        }
        if (response.status === 402) {
          return json({ error: 'The AI credits for this project have run out.' }, 402)
        }
        if (!response.ok) {
          console.error('AI gateway error', response.status, await response.text())
          return json({ error: 'Coach Jiya could not answer just now.' }, 502)
        }

        const result = (await response.json()) as {
          choices?: Array<{ message?: { content?: string } }>
        }
        const reply = result.choices?.[0]?.message?.content?.trim()
        if (!reply) return json({ error: 'Coach Jiya had nothing to say. Try again.' }, 502)

        return json({ reply })
      },
    },
  },
})
