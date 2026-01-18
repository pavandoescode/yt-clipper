import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import ClipCard from '../components/ClipCard';
import { useSidebar } from '../context/SidebarContext';
import { API_URL } from '../config';

function LivestreamAnalyze() {
    const { videoId } = useParams();
    const navigate = useNavigate();
    const { collapsed } = useSidebar();
    const [url, setUrl] = useState(`https://www.youtube.com/watch?v=${videoId}`);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const [streamInfo, setStreamInfo] = useState(null);
    const [inputCollapsed, setInputCollapsed] = useState(false);

    // Progress state
    const [progressMessage, setProgressMessage] = useState('');
    const [clipsProgress, setClipsProgress] = useState({ current: 0, total: 0 });

    useEffect(() => {
        const fetchExistingClips = async () => {
            try {
                // Check for existing clips
                const clipsRes = await axios.get(`${API_URL}/api/clips/by-video/${videoId}`);
                if (clipsRes.data.exists && clipsRes.data.clips.length > 0) {
                    setResult({ clips: clipsRes.data.clips });
                    setInputCollapsed(true);
                }

                // Get stream info from ChannelStream for Mark Done functionality
                try {
                    const streamRes = await axios.get(`${API_URL}/api/channel/stream/video/${videoId}`);
                    if (streamRes.data) {
                        setStreamInfo(streamRes.data);
                    }
                } catch (e) {
                    // If no channel stream exists, try to use livestream info for title display only
                    if (clipsRes.data.livestream) {
                        setStreamInfo({
                            title: clipsRes.data.livestream.title
                            // No _id means mark done won't work, which is fine
                        });
                    }
                }
            } catch (e) {
                console.error('Error fetching existing clips:', e);
            }
            setInitialLoading(false);
        };

        if (videoId) fetchExistingClips();
    }, [videoId]);

    const handleAnalyze = async (e) => {
        e.preventDefault();
        if (!url.trim()) return;

        setLoading(true);
        setError('');
        setProgressMessage('Starting analysis...');
        setClipsProgress({ current: 0, total: 0 });

        const token = localStorage.getItem('token');

        try {
            const response = await fetch(
                `${API_URL}/api/clips/analyze-stream?url=${encodeURIComponent(url)}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            handleSSEEvent(data);
                        } catch (e) { }
                    }
                }
            }
        } catch (err) {
            setError('Connection error. Please try again.');
            setLoading(false);
        }
    };

    const handleSSEEvent = (data) => {
        switch (data.type) {
            case 'progress':
                setProgressMessage(data.message);
                if (data.total) {
                    setClipsProgress({ current: 0, total: data.total });
                }
                break;
            case 'clip':
                setProgressMessage(data.message);
                setClipsProgress({ current: data.current, total: data.total });
                break;
            case 'complete':
                setProgressMessage('');
                // Merge new clips with existing
                setResult(prev => ({
                    clips: [...(prev?.clips || []), ...data.clips]
                }));
                setInputCollapsed(true);
                setLoading(false);
                break;
            case 'error':
                setError(data.message);
                setLoading(false);
                break;
        }
    };

    const handleClipSaveToggle = (clipId) => {
        setResult(prev => ({
            ...prev,
            clips: prev.clips.map(clip =>
                clip._id === clipId ? { ...clip, isSaved: !clip.isSaved } : clip
            )
        }));
    };

    const handleMarkDone = async () => {
        if (!streamInfo?._id) {
            navigate('/livestreams');
            return;
        }
        try {
            await axios.patch(`${API_URL}/api/channel/stream/${streamInfo._id}/done`);
        } catch (error) {
            console.error('Mark done error:', error);
        }
        navigate('/livestreams');
    };

    if (initialLoading) {
        return (
            <div className="app-container">
                <Sidebar />
                <main className={`main-content ${collapsed ? 'collapsed' : ''}`}>
                    <div className="loading-card">
                        <div className="loading-spinner"></div>
                        <p>Loading...</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="app-container">
            <Sidebar />

            <main className={`main-content ${collapsed ? 'collapsed' : ''}`}>
                {/* Top bar with Mark Done when results exist */}
                {result && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '20px',
                        padding: '12px 16px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        border: '1px solid var(--border)'
                    }}>
                        <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none' }}
                        >
                            {url}
                        </a>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            {inputCollapsed && !loading && (
                                <button
                                    className="btn btn-ghost"
                                    onClick={(e) => handleAnalyze(e)}
                                    style={{ fontSize: '13px', padding: '8px 14px' }}
                                >
                                    + Analyze Again
                                </button>
                            )}
                            <button
                                className="btn btn-primary"
                                onClick={handleMarkDone}
                                style={{ padding: '8px 16px', fontSize: '13px' }}
                            >
                                ✓ Mark as Done
                            </button>
                        </div>
                    </div>
                )}

                <div className="page-header">
                    <h1>{streamInfo?.title || 'Analyze Livestream'}</h1>
                    <p>{result ? 'Previous analysis results shown below' : 'Click Analyze to extract viral clips from this video'}</p>
                </div>

                {/* Collapsible URL Input Section */}
                {!inputCollapsed ? (
                    <div className="url-input-section">
                        <h2>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--accent)' }}>
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                            Analyze Livestream
                        </h2>
                        <form onSubmit={handleAnalyze}>
                            <div className="url-input-wrapper">
                                <input
                                    type="url"
                                    className="input"
                                    placeholder="Paste YouTube livestream URL..."
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? 'Analyzing...' : (
                                        <>
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <circle cx="11" cy="11" r="8" />
                                                <path d="M21 21l-4.35-4.35" />
                                            </svg>
                                            Analyze
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : null}

                {/* Error */}
                {error && (
                    <div style={{
                        backgroundColor: 'rgba(255, 68, 68, 0.1)',
                        border: '1px solid #ff4444',
                        borderRadius: '8px',
                        padding: '16px',
                        marginBottom: '24px',
                        color: '#ff4444'
                    }}>
                        {error}
                    </div>
                )}

                {/* Loading with Progress */}
                {loading && (
                    <div style={{
                        textAlign: 'center',
                        padding: '24px 16px',
                        background: 'var(--bg-secondary)',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        marginBottom: '16px'
                    }}>
                        <div className="loading-spinner" style={{ width: '28px', height: '28px', margin: '0 auto 12px' }}></div>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '0' }}>
                            {progressMessage}
                        </p>
                        {clipsProgress.total > 0 && (
                            <div style={{ marginTop: '12px' }}>
                                <div style={{
                                    width: '160px',
                                    height: '4px',
                                    background: 'var(--bg-hover)',
                                    borderRadius: '2px',
                                    margin: '0 auto',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: `${(clipsProgress.current / clipsProgress.total) * 100}%`,
                                        height: '100%',
                                        background: 'var(--accent)',
                                        transition: 'width 0.3s ease'
                                    }}></div>
                                </div>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                                    {clipsProgress.current} / {clipsProgress.total} clips
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Results */}
                {result && (
                    <section style={{ marginTop: loading ? '0' : '24px' }}>
                        <div className="section-header">
                            <h2>
                                🎯 Extracted Clips
                                <span className="count">({result.clips.length})</span>
                            </h2>
                        </div>
                        <div className="grid grid-2">
                            {result.clips.map((clip) => (
                                <ClipCard
                                    key={clip._id}
                                    clip={{ ...clip, videoUrl: url }}
                                    onSaveToggle={handleClipSaveToggle}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Empty State */}
                {!loading && !result && !error && (
                    <div className="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <h3>Ready to extract clips</h3>
                        <p>Click Analyze to extract viral moments from this video</p>
                    </div>
                )}
            </main>
        </div>
    );
}

export default LivestreamAnalyze;
