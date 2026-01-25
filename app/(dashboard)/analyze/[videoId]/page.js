"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import ClipCard from '@/components/ClipCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function AnalyzePage() {
    const params = useParams();
    const videoId = params?.videoId;
    const router = useRouter();

    const [url] = useState(`https://www.youtube.com/watch?v=${videoId}`);
    const [initialLoading, setInitialLoading] = useState(true);
    const [streamInfo, setStreamInfo] = useState(null);
    const [analyses, setAnalyses] = useState([]);
    const [collapsedAnalyses, setCollapsedAnalyses] = useState({});

    // Manual import state
    const [importCollapsed, setImportCollapsed] = useState(true);
    const [jsonInput, setJsonInput] = useState('');
    const [promptCopied, setPromptCopied] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [importError, setImportError] = useState('');

    // AI Studio prompt
    const AI_STUDIO_PROMPT = `Analyze the livestream video at this link: ${url}

**OUTPUT FORMAT: Return ONLY valid JSON, no other text:**

{
  "videoDuration": "01:12:10",
  "individualClips": [
    {
      "clipNumber": 1,
      "title": "Short catchy title for the clip",
      "timestampStart": "00:04:51",
      "timestampEnd": "00:05:28",
      "category": "Hard Truth / Brutal Honesty",
      "summary": "Brief description of what happens in this moment",
      "keyLine": "The exact powerful quote from this moment",
      "suggestedLength": "20-40 seconds",
      "suggestedTitles": ["Title Option 1", "Title Option 2"]
    }
  ]
}

Identify moments that match the emotional style, tone, and themes that historically perform well on my clips channel.

WHAT MY AUDIENCE LIKES (INFERRED FROM BEST-PERFORMING TITLES)
Based on past viral videos, my audience strongly engages with clips that fall into these emotion-driven categories:

1. Hard Truth / Brutal Honesty
Direct, blunt statements that challenge comfort.
Examples: calling out excuses, discipline over feelings, confronting laziness, uncomfortable truths

2. Emotional Vulnerability / Pain Points
Moments showing struggle, frustration, or emotional honesty.
Examples: "I'm tired but still pushing", loneliness, doubt, FOMO, being left behind while others succeed

3. High-Energy Motivation
Clips with fire, intensity, or hype-creating lines.
Examples: consistency > motivation, no rest, no shortcuts, relentless self-improvement

4. Story Time With a Lesson
Short stories with a clear takeaway.
Examples: lessons from failure, moments that shaped mindset

5. Self-Respect / Boundaries
Strong messages about personal value and cutting toxicity.
Examples: respecting your time

6. Hopeful Motivational Push
Encouragement mixed with emotional intensity.
Examples: "You're the last hope", "Best version of yourself", "Confusion is Just Laziness- start working hard now"

YOUR JOB:
Use these categories to identify both:
A) Similar clips - Moments that match the patterns above
B) New clip opportunities - Moments that weren't in past titles but fit what the audience would love next

Think: raw honesty, strong opinions, relatable inner battles, mindset switches, life philosophy moments

**RULES:**
- Find 2-6 clips from the video that you find perfect as this prompt 
- Use EXACT timestamps from the video (HH:MM:SS format)
- Each clip should be 20 seconds - 3 minutes (OR MORE) long
- Focus on: punchy quotes, emotional peaks, mindset shifts, life philosophy moments
- KeyLine must be an ACTUAL quote from the video
- Only include moments that would genuinely go viral as clips

Analyze the video now and return the JSON:`;

    // Group clips by livestreamId
    const groupClipsByAnalysis = (clips) => {
        if (!clips || clips.length === 0) return [];
        const groupMap = new Map();
        clips.forEach(clip => {
            const lsId = clip.livestreamId?._id || clip.livestreamId || 'unknown';
            if (!groupMap.has(lsId)) groupMap.set(lsId, []);
            groupMap.get(lsId).push(clip);
        });
        const groups = Array.from(groupMap.values()).map(group =>
            group.sort((a, b) => a.clipNumber - b.clipNumber)
        );
        groups.sort((a, b) => new Date(b[0]?.createdAt) - new Date(a[0]?.createdAt));
        return groups;
    };

    useEffect(() => {
        const fetchExistingClips = async () => {
            try {
                const token = localStorage.getItem('token');
                const clipsRes = await axios.get(`${API_URL}/clips/by-video/${videoId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (clipsRes.data.exists && clipsRes.data.clips.length > 0) {
                    const grouped = groupClipsByAnalysis(clipsRes.data.clips);
                    if (grouped.length > 0) {
                        setAnalyses(grouped);
                        // Exapnd the first group by default, collapse others
                        const initialState = {};
                        grouped.forEach((_, idx) => {
                            initialState[idx] = idx !== 0; // true means collapsed
                        });
                        setCollapsedAnalyses(initialState);
                    }
                }
                try {
                    const streamRes = await axios.get(`${API_URL}/channel/stream/video/${videoId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (streamRes.data) setStreamInfo(streamRes.data);
                } catch (e) {
                    if (clipsRes.data.livestream) {
                        setStreamInfo({ title: clipsRes.data.livestream.title });
                    }
                }
            } catch (e) {
                console.error('Error fetching existing clips:', e);
            }
            setInitialLoading(false);
        };
        if (videoId) fetchExistingClips();
    }, [videoId]);

    const handleClipSaveToggle = (clipId) => {
        setAnalyses(prevGroups => {
            return prevGroups.map(group =>
                group.map(clip =>
                    clip._id === clipId ? { ...clip, isSaved: !clip.isSaved } : clip
                )
            );
        });
    };

    const copyPrompt = async () => {
        try {
            await navigator.clipboard.writeText(AI_STUDIO_PROMPT);
            setPromptCopied(true);
            setTimeout(() => setPromptCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleImportJSON = async () => {
        if (!jsonInput.trim()) return;

        setImportLoading(true);
        setImportError('');

        try {
            let parsed;
            try {
                let cleaned = jsonInput.trim();
                if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
                if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
                if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
                parsed = JSON.parse(cleaned.trim());
            } catch (e) {
                throw new Error('Invalid JSON format. Please paste the exact output from AI Studio.');
            }

            const clips = parsed.individualClips || [];
            if (clips.length === 0) {
                throw new Error('No clips found in JSON. Make sure individualClips array exists.');
            }

            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${API_URL}/clips/import`,
                { clips, videoId, url },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            // Add new analysis to the top
            if (response.data.clips && response.data.clips.length > 0) {
                setAnalyses(prev => [response.data.clips, ...prev]);
                // Ensure new analysis is expanded (index 0)
                setCollapsedAnalyses(prev => {
                    const newState = {};
                    Object.keys(prev).forEach(key => {
                        newState[parseInt(key) + 1] = prev[key]; // shift existing indices
                    });
                    newState[0] = false; // expand new one
                    return newState;
                });
            }

            setJsonInput('');
            setImportCollapsed(true);

        } catch (err) {
            setImportError(err.response?.data?.message || err.message);
        } finally {
            setImportLoading(false);
        }
    };

    const handleMarkDone = async () => {
        if (!streamInfo?._id) {
            router.push('/livestreams');
            return;
        }
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/channel/stream/${streamInfo._id}/done`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Mark done error:', error);
        }
        router.push('/livestreams');
    };

    if (initialLoading) {
        return (
            <div className="loading-card">
                <div className="loading-spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <>
            {/* Top bar */}
            {/* Top bar */}
            <div className="url-toolbar">
                <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="url-link"
                >
                    {url}
                </a>
                <button
                    className="btn btn-primary mark-done-btn"
                    onClick={handleMarkDone}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Mark as Done
                </button>
            </div>

            <div className="page-header">
                <h1>{streamInfo?.title || 'Analyze Livestream'}</h1>
                <p>Import clips from AI Studio</p>
            </div>

            {/* Manual Import Section - Collapsible */}
            <div style={{
                padding: '12px 16px',
                background: 'var(--bg-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                marginBottom: '20px'
            }}>
                <div
                    onClick={() => setImportCollapsed(!importCollapsed)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                    }}
                >
                    <span style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                        </svg>
                        Import Clips from AI Studio
                    </span>
                    <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{
                            transform: importCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                            color: 'var(--text-muted)'
                        }}
                    >
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </div>

                {!importCollapsed && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 16px' }}>
                            Copy the prompt below, run it in AI Studio with your video, then paste the JSON result.
                        </p>

                        {/* Step 1: Copy Prompt */}
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
                                STEP 1: Copy prompt & run in AI Studio
                            </label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    className="btn btn-primary"
                                    onClick={(e) => { e.stopPropagation(); copyPrompt(); }}
                                    style={{ fontSize: '13px' }}
                                >
                                    {promptCopied ? (
                                        <>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="20 6 9 17 4 12"></polyline>
                                            </svg>
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                            </svg>
                                            Copy Prompt
                                        </>
                                    )}
                                </button>
                                <a
                                    href="https://aistudio.google.com/u/1/prompts/new_chat?pli=1"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn btn-ghost"
                                    style={{ fontSize: '13px' }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    Open AI Studio ↗
                                </a>
                            </div>
                        </div>

                        {/* Step 2: Paste JSON */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
                                STEP 2: Paste the JSON response
                            </label>
                            <textarea
                                className="input"
                                placeholder='Paste the JSON output here... (starts with { "videoDuration": ... })'
                                value={jsonInput}
                                onChange={(e) => setJsonInput(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    width: '100%',
                                    minHeight: '150px',
                                    marginBottom: '12px',
                                    fontFamily: 'monospace',
                                    fontSize: '12px',
                                    resize: 'vertical'
                                }}
                            />

                            {importError && (
                                <div style={{
                                    padding: '10px 12px',
                                    background: 'rgba(255, 68, 68, 0.1)',
                                    border: '1px solid #ff4444',
                                    borderRadius: '6px',
                                    color: '#ff4444',
                                    fontSize: '12px',
                                    marginBottom: '12px'
                                }}>
                                    {importError}
                                </div>
                            )}

                            <button
                                className="btn btn-primary"
                                onClick={(e) => { e.stopPropagation(); handleImportJSON(); }}
                                disabled={importLoading || !jsonInput.trim()}
                                style={{ width: '100%', fontSize: '14px', padding: '12px' }}
                            >
                                {importLoading ? (
                                    'Importing...'
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                            <polyline points="7 10 12 15 17 10"></polyline>
                                            <line x1="12" y1="15" x2="12" y2="3"></line>
                                        </svg>
                                        Import Clips to Database
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Render all analysis groups */}
            {analyses.length > 0 && (
                <section style={{ marginTop: '24px' }}>
                    <div className="section-header" style={{ marginBottom: '24px' }}>
                        <h2 style={{ color: 'var(--text-muted)' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <circle cx="12" cy="12" r="6"></circle>
                                <circle cx="12" cy="12" r="2"></circle>
                            </svg>
                            Extracted Clips
                            <span className="count">({analyses.reduce((acc, g) => acc + g.length, 0)})</span>
                        </h2>
                    </div>

                    {analyses.map((analysisGroup, idx) => {
                        const analysisDate = new Date(analysisGroup[0]?.createdAt);
                        const dateStr = analysisDate.toLocaleDateString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                        });
                        const isCollapsed = collapsedAnalyses[idx]; // now defaults value directly

                        return (
                            <div key={idx} style={{ marginBottom: '24px' }}>
                                <div
                                    onClick={() => setCollapsedAnalyses(prev => ({
                                        ...prev,
                                        [idx]: !isCollapsed
                                    }))}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        padding: '12px 16px',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: isCollapsed ? '8px' : '8px 8px 0 0',
                                        border: '1px solid var(--border)',
                                        borderBottom: isCollapsed ? '1px solid var(--border)' : 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <svg
                                        width="14"
                                        height="14"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        style={{
                                            transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                                            transition: 'transform 0.2s',
                                            color: 'var(--text-muted)'
                                        }}
                                    >
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                    <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '500' }}>
                                        Import from {dateStr}
                                    </span>
                                    <span style={{
                                        fontSize: '12px',
                                        color: 'var(--text-muted)',
                                        background: 'var(--bg-hover)',
                                        padding: '2px 8px',
                                        borderRadius: '4px'
                                    }}>
                                        {analysisGroup.length} clips
                                    </span>
                                </div>
                                {!isCollapsed && (
                                    <div style={{
                                        padding: '16px',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: '0 0 8px 8px',
                                        border: '1px solid var(--border)',
                                        borderTop: 'none'
                                    }}>
                                        <div className="grid grid-2">
                                            {analysisGroup.map((clip) => (
                                                <ClipCard
                                                    key={clip._id}
                                                    clip={{ ...clip, videoUrl: url }}
                                                    onSaveToggle={handleClipSaveToggle}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </section>
            )}
        </>
    );
}
