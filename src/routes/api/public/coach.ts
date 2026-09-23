// ===============================================
// AI-Fitness Trainer - secure AI endpoint for Coach Jiya
// ===============================================
// The browser NEVER sees the AI key. The page sends the user's question plus
// the Supabase access token here; this server code checks the token, then
// calls the Lovable AI gateway with the secret key.

import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

const MODEL = 'openai/gpt-6-astra'
const FITNESS_ONLY_REPLY =
  "I'm here to assist you with fitness-related topics only. You can ask me about workouts, exercises, nutrition, calories, recovery, progress, or your fitness goals."

function isClearlyOffTopic(message: string) {
  const text = message.toLowerCase()
  const offTopicPatterns = [
    /prime minister/,
    /president of/,
    /capital of/,
    /tell me (a|another) joke/,
    /write (a|me a|the) (python|javascript|java|c\+\+|php|sql) (program|code|script)/,
    /solve (this |the )?(math|mathematics|equation|algebra)/,
  ]
  return offTopicPatterns.some((pattern) => pattern.test(text))
}

const coachRequestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  facts: z.string().max(2000).optional().default(''),
  history: z
    .array(
      z.object({
        sender: z.enum(['user', 'jiya']),
        message: z.string().max(1000),
      }),
    )
    .max(10)
    .optional()
    .default([]),
})

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
        let payload: unknown
        try {
          payload = await request.json()
        } catch {
          return json({ error: 'Bad request.' }, 400)
        }

        const parsed = coachRequestSchema.safeParse(payload)
        if (!parsed.success) return json({ error: 'Please check your message and try again.' }, 400)
        const { message, facts, history } = parsed.data

        if (isClearlyOffTopic(message)) {
          return json({ reply: FITNESS_ONLY_REPLY })
        }

        const systemPrompt =
          'You are Jiya, the fitness assistant inside the AI-Fitness Trainer application. ' +
          'You may answer only about exercises, workouts, training, strength, cardio, flexibility, ' +
          'mobility, recovery, fitness goals, workout plans, calories, protein, carbohydrates, fat, ' +
          'fitness nutrition, hydration, steps, weight, workout progress, fitness progress, streaks, ' +
          'exercise completion, and how to use AI-Fitness Trainer. If a request is unrelated to those ' +
          'topics, reply with exactly this sentence and nothing else: "' + FITNESS_ONLY_REPLY + '" ' +
          'Do not answer the unrelated request after the restriction sentence. Use the user facts below ' +
          'to personalize relevant answers. Be practical and encouraging, use simple English, and keep ' +
          'answers under 150 words unless the user asks for a full fitness plan. Never give medical ' +
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
        const response = await fetch('https://ai.gateway.lovable.dev/v1/responses', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: MODEL,
            input: messages,
            reasoning: { effort: 'medium', summary: 'auto' },
            store: false,
          }),
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
          output_text?: string
          output?: Array<{ content?: Array<{ type?: string; text?: string }> }>
        }
        const reply = (
          result.output_text ??
          result.output
            ?.flatMap((item) => item.content ?? [])
            .find((item) => item.type === 'output_text')
            ?.text ??
          ''
        ).trim()
        if (!reply) return json({ error: 'Coach Jiya had nothing to say. Try again.' }, 502)

        return json({ reply })
      },
    },
  },
})
