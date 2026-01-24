// Using Google GenAI SDK with native YouTube video analysis
import { GoogleGenAI } from '@google/genai';

// Initialize the SDK with API key (supports both env variable names)
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
// console.log('Using Gemini API key:', apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET');
const ai = new GoogleGenAI({ apiKey });

const CLIP_ANALYSIS_PROMPT = `You are a YouTube clip analyzer. Your job is to watch this video segment and identify viral-worthy moments.

**CRITICAL RULES:**
- Watch the video carefully and identify specific moments
- Use EXACT timestamps from the video - format as HH:MM:SS
- NEVER generate timestamps that exceed the video's actual duration
- Only include moments that actually exist in the video
- Focus on speech, emotional moments, and impactful statements

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

WHAT MY AUDIENCE LIKES (INFERRED FROM BEST-PERFORMING TITLES)
Based on past viral videos, my audience strongly engages with clips that fall into these emotion-driven categories:

1. Hard Truth / Brutal Honesty
Direct, blunt statements that challenge comfort.

2. Emotional Vulnerability / Pain Points
Moments showing struggle, frustration, or emotional honesty.

3. High-Energy Motivation
Clips with fire, intensity, or hype-creating lines.

4. Story Time With a Lesson
Short stories with a clear takeaway.

5. Self-Respect / Boundaries
Strong messages about personal value and cutting toxicity.

6. Hopeful Motivational Push
Encouragement mixed with emotional intensity.

---

YOUR JOB:
Watch the video and identify moments that match these patterns. Find punchy quotes, emotional peaks, and clippable moments.

Only extract moments that trigger emotion, push mindset, or feel "clippable."`;

// Helper function to format seconds to timestamp
function secondsToTimestamp(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Helper function to parse timestamp to seconds
function timestampToSeconds(timestamp) {
    const parts = timestamp.split(':').map(Number);
    if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return parts[0] * 60 + parts[1];
}

export async function analyzeVideo(videoUrl) {
    try {
        // Extract video ID from URL
        const videoIdMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/live\/)([^&\s?]+)/);
        const videoId = videoIdMatch ? videoIdMatch[1] : null;

        if (!videoId) {
            return {
                success: false,
                error: 'Could not extract video ID from URL'
            };
        }

        const cleanUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log('Analyzing YouTube video:', cleanUrl);

        // For long videos, we'll process in chunks of ~15 minutes each
        // This helps avoid token limits while getting comprehensive coverage
        const CHUNK_DURATION_SECONDS = 15 * 60; // 15 minutes per chunk
        const MAX_CHUNKS = 5; // Process up to 5 chunks (75 minutes max)

        // First, try to analyze without chunking for shorter videos
        // If it fails due to token limits, we'll fall back to chunked analysis

        console.log('Attempting video analysis with Gemini Flash...');

        try {
            // Try with gemini-2.0-flash first (better for long videos)
            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: [
                    {
                        fileData: {
                            fileUri: cleanUrl
                        }
                    },
                    {
                        text: CLIP_ANALYSIS_PROMPT
                    }
                ],
                config: {
                    responseMimeType: 'application/json'
                }
            });

            const text = response.text();
            // console.log('Gemini Flash response received:', text ? text.substring(0, 300) + '...' : 'Empty');

            if (!text) {
                throw new Error('Empty response from Gemini');
            }

            return parseGeminiResponse(text);

        } catch (flashError) {
            console.log('Flash model error:', flashError.message);

            // If flash also fails, try chunked analysis
            if (flashError.message?.includes('token') || flashError.message?.includes('exceeds')) {
                console.log('Video too long, attempting chunked analysis...');
                return await analyzeVideoChunked(cleanUrl, CHUNK_DURATION_SECONDS, MAX_CHUNKS);
            }

            throw flashError;
        }

    } catch (error) {
        console.error('Gemini API error:', error);

        let errorMessage = error.message || 'Unknown error';

        if (errorMessage.includes('private') || errorMessage.includes('unlisted')) {
            errorMessage = 'This video is private or unlisted. Only public YouTube videos can be analyzed.';
        } else if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
            errorMessage = 'API quota exceeded. Please try again later.';
        } else if (errorMessage.includes('token') || errorMessage.includes('exceeds')) {
            errorMessage = 'Video is too long. Try analyzing a shorter video (under 30 minutes works best).';
        }

        return {
            success: false,
            error: errorMessage
        };
    }
}

// Chunked analysis for very long videos
async function analyzeVideoChunked(videoUrl, chunkDuration, maxChunks) {
    console.log(`Starting chunked analysis: ${maxChunks} chunks of ${chunkDuration / 60} minutes each`);

    const allClips = [];
    let clipCounter = 1;

    for (let i = 0; i < maxChunks; i++) {
        const startTime = i * chunkDuration;
        const endTime = (i + 1) * chunkDuration;

        console.log(`Analyzing chunk ${i + 1}/${maxChunks}: ${secondsToTimestamp(startTime)} - ${secondsToTimestamp(endTime)}`);

        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: [
                    {
                        fileData: {
                            fileUri: videoUrl,
                            videoMetadata: {
                                startOffset: { seconds: startTime },
                                endOffset: { seconds: endTime }
                            }
                        }
                    },
                    {
                        text: CLIP_ANALYSIS_PROMPT + `\n\nNOTE: You are analyzing the video segment from ${secondsToTimestamp(startTime)} to ${secondsToTimestamp(endTime)}. Use timestamps relative to the FULL video (add ${secondsToTimestamp(startTime)} offset if needed).`
                    }
                ],
                config: {
                    responseMimeType: 'application/json'
                }
            });

            const text = response.text();
            if (text) {
                const result = parseGeminiResponse(text);
                if (result.success && result.data.individualClips) {
                    // Renumber clips and add to collection
                    for (const clip of result.data.individualClips) {
                        clip.clipNumber = clipCounter++;
                        allClips.push(clip);
                    }
                    console.log(`Chunk ${i + 1} found ${result.data.individualClips.length} clips`);
                }
            }
        } catch (chunkError) {
            console.log(`Chunk ${i + 1} failed:`, chunkError.message);
            // Continue with other chunks even if one fails
        }

        // Small delay between chunks to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`Chunked analysis complete. Total clips found: ${allClips.length}`);

    return {
        success: allClips.length > 0,
        data: {
            individualClips: allClips,
            chunkedSegments: [],
            combinedEdits: [],
            viralPredictions: []
        },
        error: allClips.length === 0 ? 'No clips found in any video segment' : null
    };
}

// Parse and clean Gemini response
function parseGeminiResponse(text) {
    let cleanedText = text.trim();

    // Remove markdown code blocks if present
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

    // console.log(`Parsed ${data.individualClips?.length || 0} clips from response`);

    return {
        success: true,
        data: {
            individualClips: data.individualClips || [],
            chunkedSegments: data.chunkedSegments || [],
            combinedEdits: data.combinedEdits || [],
            viralPredictions: data.viralPredictions || [],
            videoDuration: data.videoDuration
        }
    };
}
