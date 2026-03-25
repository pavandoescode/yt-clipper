import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import Clip from '@/models/Clip';
import ClipGroup from '@/models/ClipGroup';
import connectDB from '@/lib/db';
import axios from 'axios';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        await connectDB();
        const auth = await verifyAuth(request);
        if (!auth) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        // Ensure models are registered for population
        require('@/models/Clip');
        require('@/models/Livestream');

        // Deep populate clip data and its associated livestream within groups
        const groups = await ClipGroup.find({}).populate({
            path: 'clips.clipId',
            populate: { path: 'livestreamId' }
        }).sort({ createdAt: -1 });
        return NextResponse.json({ groups });
    } catch (error) {
        console.error('Fetch groups error:', error);
        return NextResponse.json({ message: 'Server error' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        await connectDB();
        const auth = await verifyAuth(request);
        if (!auth) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const { clipIds } = await request.json();
        if (!clipIds || !Array.isArray(clipIds) || clipIds.length < 2) {
            return NextResponse.json({ message: 'Select at least 2 clips to group' }, { status: 400 });
        }

        // 1. Fetch full clip data
        const clips = await Clip.find({ _id: { $in: clipIds } });
        if (clips.length === 0) {
            return NextResponse.json({ message: 'Clips not found' }, { status: 404 });
        }

        // 2. Prepare prompt for Gemini
        const clipData = clips.map(c => ({
            id: c._id.toString(),
            clipNumber: c.clipNumber,
            title: c.title,
            summary: c.summary,
            keyLine: c.keyLine,
            category: c.category
        }));

        const prompt = `
You are an expert video editor. I have a list of clips from a YouTube video that I want to group into cohesive segments for social media or chapters.

# INPUT CLIPS:
${JSON.stringify(clipData, null, 2)}

# TASK:
1. Identify clips that together form a SINGLE COHESIVE TOPIC or story. These clips should be suitable for being stitched together into one continuous video about that specific topic.
2. For each group, provide a catchy "name" (the topic title) and a short "description" of what this topic covers.
3. AUDIENCE RETENTION RULE: If a clip is irrelevant or would feel like 'filler' that breaks the topic's momentum, DO NOT include it in a group. It is far better to have a tight, high-quality topic than to include boring clips.
4. ORDERING: Do NOT worry about the narrative sequence or order of clips within a group. Focus only on identifying if they belong to the same topic. The user will decide the final order.
5. FULL LIBERTY: You have full freedom to leave any number of clips as "ungroupedIds" if they do not contribute to a high-quality, continuous discussion on a single topic.

# OUTPUT FORMAT:
Return ONLY a valid JSON object with this structure:
{
  "groups": [
    {
      "name": "Topic Title",
      "description": "Explanation of the single topic",
      "clipIds": ["id1", "id2"] // Clips that belong to this topic
    }
  ],
  "ungroupedIds": ["id3"] // Filler or irrelevant clips that don't fit the main topics
}
`.trim();

        // 3. Call OpenRouter
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ message: 'AI configuration missing (OPENROUTER_API_KEY)' }, { status: 500 });
        }

        const aiResponse = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'google/gemini-2.0-flash-001',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' }
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'YT Clipper'
            }
        });

        const result = aiResponse.data.choices[0].message.content;
        const parsedData = typeof result === 'string' ? JSON.parse(result) : result;

        if (!parsedData.groups || !Array.isArray(parsedData.groups)) {
            throw new Error('Invalid AI response format');
        }

        // 4. Save groups to DB (Filter out single-clip groups in code)
        const createdGroups = [];
        let groupedClipsCount = 0;
        let selfUngroupedCount = 0;

        for (const group of parsedData.groups) {
            const hasEnoughClips = group.clipIds && group.clipIds.length >= 2;

            if (hasEnoughClips) {
                const groupNumber = 'GP-' + Math.random().toString(36).substring(2, 7).toUpperCase();
                const newGroup = await ClipGroup.create({
                    groupNumber,
                    name: group.name,
                    description: group.description,
                    clips: group.clipIds.map((id, index) => ({
                        clipId: id,
                        order: index + 1
                    })),
                    userId: auth.user.id
                });
                createdGroups.push(newGroup);
                groupedClipsCount += group.clipIds.length;
            } else if (group.clipIds && group.clipIds.length === 1) {
                // If AI suggested a 1-clip group, we skip it (treat as ungrouped)
                selfUngroupedCount += 1;
            }
        }

        return NextResponse.json({
            groups: createdGroups,
            groupedClipsCount,
            ungroupedCount: (parsedData.ungroupedIds || []).length + selfUngroupedCount
        });

    } catch (error) {
        console.error('Grouping error:', error);
        return NextResponse.json({
            message: 'AI Grouping failed',
            details: error.response?.data || error.message
        }, { status: 500 });
    }
}
