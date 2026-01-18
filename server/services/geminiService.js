// Using OpenRouter API with Gemini 3 Pro Preview
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

const CLIP_ANALYSIS_PROMPT = `You are a YouTube clip analyzer. Your job is to analyze livestream videos and identify viral-worthy moments.

**CRITICAL: You MUST respond ONLY in valid JSON format. No markdown, no explanation, no extra text - just pure JSON.**

RESPONSE SCHEMA:
{
  "individualClips": [
    {
      "clipNumber": 1,
      "title": "The 'Work is Life' Reality Check",
      "timestampStart": "00:04:51",
      "timestampEnd": "00:05:08",
      "category": "Hard Truth / Brutal Honesty",
      "summary": "He dismantles the idea that work motives are different.",
      "keyLine": "Man is no man without work.",
      "suggestedLength": "20-30 seconds",
      "suggestedTitles": ["Why You Are Poor (It's Not Luck)", "Men Without Work Are Nothing"]
    }
  ]

  
}

---



Identify moments that match the emotional style, tone, and themes that historically perform well on my clips channel.
WHAT MY AUDIENCE LIKES (INFERRED FROM BEST-PERFORMING TITLES)
Based on past viral videos, my audience strongly engages with clips that fall into these emotion-driven categories:

1. Hard Truth / Brutal Honesty
Direct, blunt statements that challenge comfort.

Examples of themes:
calling out excuses
discipline over feelings
confronting laziness
uncomfortable truths
2. Emotional Vulnerability / Pain Points
Moments showing struggle, frustration, or emotional honesty.

Examples:
“I’m tired but still pushing”
loneliness, doubt, FOMO
being left behind while others succeed

3. High-Energy Motivation
Clips with fire, intensity, or hype-creating lines.

Examples:
consistency > motivation
no rest, no shortcuts
relentless self-improvement
4. Story Time With a Lesson
Short stories with a clear takeaway.

Examples:
lessons from failure
moments that shaped mindset
5. Self-Respect / Boundaries
Strong messages about personal value and cutting toxicity.

Examples:
respecting your time
6. Hopeful Motivational Push
Encouragement mixed with emotional intensity.

Examples:
“You’re the last hope”
“Best version of yourself”
"Confusion is Just Laziness- start working hard now"
"You don't cry for girl"
"The 3 AM Instagram Trap "
YOUR JOB
Use these categories to identify both:

A) Similar clips
Moments that match the patterns above.

B) New clip opportunities
Moments that weren’t in past titles but fit what the audience would love next.

Think:
raw honesty
strong opinions
relatable inner battles
mindset switches
life philosophy moments
OUTPUT FORMAT
1) Individual Clip Moments
For every clip you find:

Timestamp (start–end)
Category (from the audience themes above)
Summary/Key line
Why it will perform well (relatability, emotional punch, controversy, hype, story)
Suggested Clip Length
Suggested Title Style (NOT a copy of old titles—new but similar energy)



that I should clip next time (e.g., controversial takes, vulnerable moments, hard truths, etc.)
TONE & STYLE
Be creative + analytical.

Focus on:
emotional depth
relatability
intensity
social media virality
punchy moments
clear narrative flow
motivational quotes.

Only extract moments that trigger emotion, push mindset, or feel “clippable.”


---

YOUR JOB:
Use these categories to identify BOTH:
A) Similar clips - Moments that match the patterns above
B) New clip opportunities - Moments that weren't in past titles but fit what the audience would love next

Think: raw honesty, strong opinions, relatable inner battles, mindset switches, life philosophy moments

---

OUTPUT REQUIREMENTS:

1) **Individual Clip Moments** - For every clip you find:
   - Timestamp (start-end)
   - Category (from the audience themes above)
   - Summary/Key line
   - Why it will perform well (relatability, emotional punch, controversy, hype, story)
   - Suggested Clip Length
   - Suggested Title Styles (2-3 options, NOT copies of old titles - new but similar energy)


---

TONE & STYLE:
- Be creative + analytical
- Focus on: emotional depth, relatability, intensity, social media virality, punchy moments, clear narrative flow, motivational quotes
- Only extract moments that trigger emotion, push mindset, or feel "clippable"

---

ANALYZE THIS LIVESTREAM:  `;

export async function analyzeVideo(videoUrl) {
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'YT Clipper Dashboard'
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-preview',
        messages: [
          {
            role: 'user',
            content: CLIP_ANALYSIS_PROMPT + videoUrl
          }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `OpenRouter API error: ${response.status}`);
    }

    const result = await response.json();
    const text = result.choices[0]?.message?.content || '';

    // Clean up the response - remove markdown code blocks if present
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.slice(7);
    }
    if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.slice(3);
    }
    if (cleanedText.endsWith('```')) {
      cleanedText = cleanedText.slice(0, -3);
    }
    cleanedText = cleanedText.trim();

    // Parse JSON
    const data = JSON.parse(cleanedText);

    return {
      success: true,
      data: {
        individualClips: data.individualClips || [],
        chunkedSegments: data.chunkedSegments || [],
        combinedEdits: data.combinedEdits || [],
        viralPredictions: data.viralPredictions || []
      }
    };
  } catch (error) {
    console.error('OpenRouter API error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
