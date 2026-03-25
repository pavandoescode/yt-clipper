"use client";

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import ClipCard from '@/components/ClipCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Utility to parse YouTube duration (e.g., PT1H12M10S) or HH:MM:SS
const parseDuration = (durationStr) => {
    if (!durationStr) return 0;

    // Handle ISO 8601 (YouTube format)
    if (durationStr.startsWith('PT')) {
        const hours = (durationStr.match(/(\d+)H/) || [0, 0])[1];
        const minutes = (durationStr.match(/(\d+)M/) || [0, 0])[1];
        const seconds = (durationStr.match(/(\d+)S/) || [0, 0])[1];
        return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
    }

    // Handle HH:MM:SS or MM:SS
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    return 0;
};

// Utility to format seconds to HH:MM:SS
const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => v.toString().padStart(2, '0')).join(':');
};

export default function AnalyzePage() {
    const params = useParams();
    const videoId = params?.videoId;
    const router = useRouter();

    const [url] = useState(`https://www.youtube.com/watch?v=${videoId}`);
    const [initialLoading, setInitialLoading] = useState(true);
    const [streamInfo, setStreamInfo] = useState(null);
    const [analyses, setAnalyses] = useState([]);
    const [collapsedAnalyses, setCollapsedAnalyses] = useState({});

    // Duration and Segmentation State
    const [durationInput, setDurationInput] = useState('');
    const [totalSeconds, setTotalSeconds] = useState(0);

    // Manual import state
    const [importCollapsed, setImportCollapsed] = useState(true);
    const [jsonInput, setJsonInput] = useState('');
    const [copyStatus, setCopyStatus] = useState({}); // { [segmentIndex]: boolean }
    const [importLoading, setImportLoading] = useState(false);
    const [importError, setImportError] = useState('');

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
                    if (streamRes.data) {
                        setStreamInfo(streamRes.data);
                        
                        // If duration is missing, try to fetch it automatically via yt-dlp
                        if (!streamRes.data.duration || streamRes.data.duration === '0') {
                            try {
                                const metaRes = await axios.post(`${API_URL}/channel/stream/metadata`, { videoId }, {
                                    headers: { Authorization: `Bearer ${token}` }
                                });
                                if (metaRes.data.success && metaRes.data.duration) {
                                    const secs = parseDuration(metaRes.data.duration);
                                    setTotalSeconds(secs);
                                    setDurationInput(formatTime(secs));
                                }
                            } catch (metaErr) {
                                console.error('Auto-fetch metadata failed:', metaErr);
                            }
                        } else {
                            const secs = parseDuration(streamRes.data.duration);
                            setTotalSeconds(secs);
                            setDurationInput(formatTime(secs));
                        }
                    }
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

    // Calculate segments (20 minutes each)
    const segments = useMemo(() => {
        if (totalSeconds <= 0) return [{ start: 0, end: 0, label: 'Full Video' }];

        const SECS_IN_35_MINS = 35 * 60;
        const result = [];
        let current = 0;

        while (current < totalSeconds) {
            const start = current;
            const end = Math.min(current + SECS_IN_35_MINS, totalSeconds);
            result.push({
                start,
                end,
                label: `${formatTime(start)} - ${formatTime(end)}`
            });
            current = end;
        }

        // If only one segment and it's less than 35 mins, just show "Full Video"
        if (result.length === 1) return [{ start: 0, end: totalSeconds, label: 'Full Video' }];

        return result;
    }, [totalSeconds]);

    const generatePrompt = (startSec, endSec) => {
        const timeframeStr = startSec === 0 && endSec === 0
            ? "the entire video"
            : `specifically the segment from ${formatTime(startSec)} to ${formatTime(endSec)}`;

        return `Analyze this live stream and extract video clips that are strictly longer than 60 seconds.

        You must focus on clips that occur ${timeframeStr} approximately.

Look for moments where the speaker delivers 'hard truths' about the tech industry, money, or careers. Prioritize segments featuring high-energy motivation, discussions on self-respect, or personal 'story time' anecdotes that end with a valuable lesson. Specifically, flag conversations around FAANG interviews, AI's impact on developers, resume building, and raw mindset advice regarding success and relationships.

Watch the video:
${url}

**OUTPUT FORMAT: Return ONLY valid JSON, no other text:**

{
  "videoDuration": "${formatTime(totalSeconds)}",
  "individualClips": [
    {
      "clipNumber": 1,
      "title": "Short catchy title for the clip",
      "timestampStart": "00:04:51",
      "timestampEnd": "00:05:28",
      "category": "Hard Truth / Brutal Honesty",
      "summary": "Brief description of what happens in this moment",
      "keyLine": "The exact powerful quote from this moment",
      "suggestedLengthSeconds": 20,
      "suggestedTitles": ["Title Option 1", "Title Option 2"]
    }
  ]
}`;
    };

    const copySegmentPrompt = async (segment, index) => {
        try {
            const prompt = generatePrompt(segment.start, segment.end);
            await navigator.clipboard.writeText(prompt);
            setCopyStatus(prev => ({ ...prev, [index]: true }));
            setTimeout(() => setCopyStatus(prev => ({ ...prev, [index]: false })), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const handleDurationUpdate = () => {
        const secs = parseDuration(durationInput);
        setTotalSeconds(secs);
    };

    const handleClipSaveToggle = (clipId) => {
        setAnalyses(prevGroups => {
            return prevGroups.map(group =>
                group.map(clip =>
                    clip._id === clipId ? { ...clip, isSaved: !clip.isSaved } : clip
                )
            );
        });
    };

    const handleImportJSON = async () => {
        if (!jsonInput.trim()) return;

        setImportLoading(true);
        setImportError('');

        try {
            let parsed;
            try {
                let cleaned = jsonInput.trim();
                // Basic cleanup of markdown blocks if AI Studio adds them
                if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '');
                if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '');
                if (cleaned.endsWith('```')) cleaned = cleaned.replace(/```$/, '');
                parsed = JSON.parse(cleaned.trim());
            } catch (e) {
                throw new Error('Invalid JSON. Please ensure you pasted only the JSON output from AI Studio.');
            }

            const clips = parsed.individualClips || [];
            if (clips.length === 0) {
                throw new Error('No clips found in the JSON data.');
            }

            const token = localStorage.getItem('token');
            const response = await axios.post(
                `${API_URL}/clips/import`,
                { clips, videoId, url },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            if (response.data.clips && response.data.clips.length > 0) {
                setAnalyses(prev => [response.data.clips, ...prev]);
                setCollapsedAnalyses(prev => {
                    const newState = { 0: false };
                    Object.keys(prev).forEach(key => {
                        newState[parseInt(key) + 1] = prev[key];
                    });
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
                <p>Loading Video Info...</p>
            </div>
        );
    }

    return (
        <div style={{ padding: '0 20px 40px' }}>
            {/* Top Bar */}
            <div className="url-toolbar">
                <a href={url} target="_blank" rel="noopener noreferrer" className="url-link">
                    {url}
                </a>
                <button className="btn btn-primary mark-done-btn" onClick={handleMarkDone}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Mark as Done
                </button>
            </div>

            <div className="page-header">
                <h1>{streamInfo?.title || 'Analyze Livestream'}</h1>
                <p>Segmented AI Prompt Generation</p>
            </div>

            {/* Manual Duration Input */}
            <div style={{
                marginBottom: '20px',
                padding: '16px',
                background: 'var(--bg-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
            }}>
                <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                        Total Video Duration (HH:MM:SS)
                    </label>
                    <input
                        type="text"
                        className="input"
                        placeholder="01:12:10"
                        value={durationInput}
                        onChange={(e) => setDurationInput(e.target.value)}
                        onBlur={handleDurationUpdate}
                        style={{ fontSize: '14px' }}
                    />
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '18px' }}>
                    {segments.length > 1 ? `${segments.length} segments calculated` : 'Single segment'}
                </div>
            </div>

            {/* Import Section */}
            <div style={{
                background: 'var(--bg-secondary)',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                marginBottom: '20px',
                overflow: 'hidden'
            }}>
                <div
                    onClick={() => setImportCollapsed(!importCollapsed)}
                    style={{
                        padding: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        background: 'rgba(255, 255, 255, 0.02)'
                    }}
                >
                    <span style={{ fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {segments.length > 1 ? 'Step 1: Copy Segmented Prompts' : 'Step 1: Copy Prompt for AI Studio'}
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
                            transition: 'transform 0.2s'
                        }}
                    >
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </div>

                {!importCollapsed && (
                    <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
                        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                            {segments.length > 1
                                ? 'For better results, Gemini needs to look at short segments. Copy each prompt one-by-one:'
                                : 'Copy the prompt below and run it in AI Studio with your video attached.'}
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
                            {segments.map((seg, idx) => (
                                <div key={idx} style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 14px',
                                    background: 'var(--bg-hover)',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)'
                                }}>
                                    <span style={{ fontSize: '13px', fontWeight: '500' }}>
                                        {seg.label}
                                    </span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button
                                            className="btn btn-primary"
                                            onClick={(e) => { e.stopPropagation(); copySegmentPrompt(seg, idx); }}
                                            style={{ fontSize: '12px', padding: '6px 12px' }}
                                        >
                                            {copyStatus[idx] ? 'Copied!' : 'Copy Prompt'}
                                        </button>
                                        <a
                                            href="https://aistudio.google.com/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-ghost"
                                            style={{ fontSize: '12px', padding: '6px' }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            Open AI ↗
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Step 2: Paste JSON */}
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
                                STEP 2: Paste the JSON response
                            </label>
                            <textarea
                                className="input"
                                placeholder='Paste result here...'
                                value={jsonInput}
                                onChange={(e) => setJsonInput(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                    width: '100%',
                                    minHeight: '120px',
                                    marginBottom: '12px',
                                    fontFamily: 'monospace',
                                    fontSize: '12px'
                                }}
                            />

                            {importError && (
                                <div style={{
                                    padding: '10px',
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
                                style={{ width: '100%', padding: '12px' }}
                            >
                                {importLoading ? 'Importing...' : 'Save Clips to Database'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* List existing analyses */}
            {analyses.length > 0 && (
                <section style={{ marginTop: '24px' }}>
                    <div className="section-header">
                        <h2 style={{ color: 'var(--text-muted)' }}>
                            Extracted Clips ({analyses.reduce((acc, g) => acc + g.length, 0)})
                        </h2>
                    </div>

                    {analyses.map((group, idx) => {
                        const date = new Date(group[0]?.createdAt).toLocaleString();
                        const isExpanded = !collapsedAnalyses[idx];

                        return (
                            <div key={idx} style={{ marginBottom: '16px' }}>
                                <div
                                    onClick={() => setCollapsedAnalyses(p => ({ ...p, [idx]: isExpanded }))}
                                    style={{
                                        padding: '12px 16px',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between'
                                    }}
                                >
                                    <span style={{ fontSize: '13px' }}>Import from {date}</span>
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{group.length} clips</span>
                                </div>

                                {isExpanded && (
                                    <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px' }}>
                                        {group.map(clip => (
                                            <ClipCard key={clip._id} clip={{ ...clip, videoUrl: url }} onSaveToggle={handleClipSaveToggle} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </section>
            )}
        </div>
    );
}
