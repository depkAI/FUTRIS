import { NextResponse } from 'next/server'

interface AIInput {
  color: string
  characteristic: string
  relationshipStatus: string
  day: number
  dayMeaning: string
  themes: string[]
  tone: string
}

const SYSTEM_PROMPT = `You are the fortune writer for "Four Cups", an old-school love fortune game. You write exactly TWO short, mysterious, emotionally-engaging lines.

Rules:
- Line 1 addresses the user's CURRENT love life / relationship situation.
- Line 2 addresses their FUTURE in love.
- You may weave in a playful prediction (possible new connection, reconnection, emotional clarity, an upcoming conversation, someone expressing feelings, relationship growth, a turning point, moving on) using language like "may", "could", "might", "appears to", or "your path suggests".
- Never claim certainty. Never speak of real, named people. Never invent facts.
- Do NOT change the relationship status. Do NOT change the selected day.
- Do not mention game logic, cups, or that this is generated.
- Keep the tone mysterious, concise and intriguing. Two sentences total.
- Respond ONLY with a JSON object: {"line1": "...", "line2": "..."}`

export async function POST(req: Request) {
  let input: AIInput | null = null
  try {
    input = (await req.json()) as AIInput
  } catch {
    return NextResponse.json({ source: 'engine' }, { status: 200 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json({ source: 'engine' }, { status: 200 })
  }

  const userPrompt = `Color: ${input.color}
Characteristic: ${input.characteristic}
Relationship: ${input.relationshipStatus}
Day: ${input.day}
Day meaning: ${input.dayMeaning}
Themes from their journey: ${input.themes.join(', ')}
Tone: ${input.tone}

Write the two-line love fortune now.`

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.8,
        max_tokens: 180,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (!res.ok) throw new Error(`openai ${res.status}`)
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
    }
    const content = json.choices?.[0]?.message?.content ?? ''
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('no json in llm output')
    const parsed = JSON.parse(match[0]) as { line1?: string; line2?: string }
    if (!parsed.line1 || !parsed.line2) throw new Error('missing lines')
    return NextResponse.json({
      source: 'ai',
      line1: parsed.line1.trim(),
      line2: parsed.line2.trim(),
    })
  } catch {
    return NextResponse.json({ source: 'engine' }, { status: 200 })
  }
}