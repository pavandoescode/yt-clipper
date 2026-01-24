"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter, useSearchParams } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function LiveStreamsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [streams, setStreams] = useState([]);
    const [message, setMessage] = useState('');
    const [isError, setIsError] = useState(false);
    const [sortOrder, setSortOrder] = useState('old');
    const [markingDoneId, setMarkingDoneId] = useState(null);
    const [showDone, setShowDone] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);
    const [totalDone, setTotalDone] = useState(0);
    const [totalAll, setTotalAll] = useState(0);

    // Refetch when dependencies change
    useEffect(() => {
        setStreams([]);
        setPage(1);
        fetchStreams(1, true);
    }, [showDone, sortOrder]);

    const fetchStreams = async (pageNum = 1, reset = false) => {
        if (reset) setLoading(true);
        else setLoadingMore(true);

        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/channel/streams?page=${pageNum}&limit=9&showDone=${showDone}&sortOrder=${sortOrder}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = response.data;

            if (reset) {
                setStreams(data.streams);
            } else {
                setStreams(prev => [...prev, ...data.streams]);
            }
            setHasMore(data.hasMore);
            setTotal(data.total);
            setTotalDone(data.totalDone);
            setTotalAll(data.totalAll);
            setPage(pageNum);
        } catch (error) {
            console.error('Fetch error:', error);
        }
        setLoading(false);
        setLoadingMore(false);
    };

    const handleLoadMore = () => {
        fetchStreams(page + 1, false);
    };

    const handleFetchNew = async () => {
        setFetching(true);
        setMessage('');
        setIsError(false);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(`${API_URL}/channel/fetch`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessage(response.data.message);
            setIsError(false);
            // Refresh the list
            fetchStreams(1, true);
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Failed to fetch';
            if (errorMsg.includes('API key')) {
                setMessage('');
            } else {
                setMessage(errorMsg);
                setIsError(true);
            }
        }
        setFetching(false);
    };

    const handleAnalyze = (videoId) => {
        router.push(`/analyze/${videoId}`);
    };

    const handleMarkDone = async (streamId) => {
        setMarkingDoneId(streamId);
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/channel/stream/${streamId}/done`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Remove from current list
            setStreams(prev => prev.filter(s => s._id !== streamId));
            // Update counts
            setTotal(prev => prev - 1);
            setTotalDone(prev => prev + 1);

            // Fetch one replacement stream if more are available
            if (hasMore) {
                const currentCount = streams.length - 1; // After removal
                const response = await axios.get(`${API_URL}/channel/streams?page=1&limit=${currentCount + 1}&showDone=${showDone}&sortOrder=${sortOrder}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = response.data;
                // Get the last stream which should be the new one
                if (data.streams.length > currentCount) {
                    const newStream = data.streams[data.streams.length - 1];
                    setStreams(prev => [...prev, newStream]);
                }
                setHasMore(data.hasMore);
            }
        } catch (error) {
            console.error('Mark done error:', error);
        }
        setMarkingDoneId(null);
    };

    const handleUndo = async (streamId) => {
        setMarkingDoneId(streamId);
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/channel/stream/${streamId}/undo`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Remove from current done list
            setStreams(prev => prev.filter(s => s._id !== streamId));
            // Refetch to get updated counts
            const response = await axios.get(`${API_URL}/channel/streams?page=1&limit=1&showDone=${showDone}&sortOrder=${sortOrder}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = response.data;
            setTotal(data.total);
            setTotalDone(data.totalDone);
            setHasMore(data.hasMore);
        } catch (error) {
            console.error('Undo error:', error);
        }
        setMarkingDoneId(null);
    };

    const formatDuration = (duration) => {
        if (!duration) return '';
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match) return duration;
        const hours = match[1] || '0';
        const minutes = (match[2] || '0').padStart(2, '0');
        const seconds = (match[3] || '0').padStart(2, '0');
        return hours !== '0' ? `${hours}:${minutes}:${seconds}` : `${minutes}:${seconds}`;
    };

    const formatViews = (viewCount) => {
        if (!viewCount) return '';
        const num = parseInt(viewCount);
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M views';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K views';
        return num + ' views';
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1>Live Streams</h1>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Streams from @ezLiveOfficial • {totalAll} streams</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                display: 'flex',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '8px',
                                padding: '3px',
                                gap: '2px',
                                border: '1px solid var(--border)'
                            }}>
                                <button
                                    onClick={() => setShowDone(false)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        background: !showDone ? 'var(--accent)' : 'transparent',
                                        color: !showDone ? '#000000' : 'var(--text-muted)',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    Pending
                                </button>
                                <button
                                    onClick={() => setShowDone(true)}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        background: showDone ? 'var(--accent)' : 'transparent',
                                        color: showDone ? '#000000' : 'var(--text-muted)',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    Done
                                </button>
                            </div>
                            <div style={{
                                display: 'flex',
                                background: 'var(--bg-secondary)',
                                borderRadius: '8px',
                                padding: '4px',
                                gap: '2px',
                                border: '1px solid var(--border)'
                            }}>
                                <button
                                    onClick={() => setSortOrder('old')}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        background: sortOrder === 'old' ? 'var(--accent)' : 'transparent',
                                        color: sortOrder === 'old' ? '#000000' : 'var(--text-muted)',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    Old to New
                                </button>
                                <button
                                    onClick={() => setSortOrder('new')}
                                    style={{
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '13px',
                                        fontWeight: '500',
                                        background: sortOrder === 'new' ? 'var(--accent)' : 'transparent',
                                        color: sortOrder === 'new' ? '#000000' : 'var(--text-muted)',
                                        transition: 'all 0.15s ease'
                                    }}
                                >
                                    New to Old
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleFetchNew}
                    disabled={fetching}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    {fetching ? (
                        <>
                            <span style={{
                                width: '16px',
                                height: '16px',
                                border: '2px solid rgba(255,255,255,0.3)',
                                borderTopColor: 'white',
                                borderRadius: '50%',
                                animation: 'spin 0.8s linear infinite'
                            }}></span>
                            Fetching...
                        </>
                    ) : (
                        <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                            </svg>
                            Fetch New
                        </>
                    )}
                </button>
            </div>

            {message && (
                <div style={{
                    background: isError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                    border: isError ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 16px',
                    marginBottom: '24px',
                    color: isError ? '#ef4444' : '#22c55e',
                    fontSize: '14px'
                }}>
                    {message}
                </div>
            )}

            {loading ? (
                <div className="loading-card">
                    <div className="loading-spinner"></div>
                    <p>Loading streams...</p>
                </div>
            ) : streams.length === 0 ? (
                <div className="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <h3>No streams found</h3>
                    <p>Click "Fetch New" to load streams from YouTube</p>
                </div>
            ) : (
                <>
                    <div className="streams-grid">
                        {streams.map((stream) => (
                            <div
                                key={stream._id}
                                className="stream-card"
                                onClick={() => handleAnalyze(stream.videoId)}
                                style={{ cursor: 'pointer' }}
                            >
                                <div className="stream-thumbnail">
                                    {stream.thumbnail ? (
                                        <img src={stream.thumbnail} alt={stream.title} />
                                    ) : (
                                        <div className="thumbnail-placeholder">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
                                            </svg>
                                        </div>
                                    )}
                                    {stream.duration && (
                                        <span className="duration-badge">{formatDuration(stream.duration)}</span>
                                    )}
                                    {stream.isAnalyzed && (
                                        <span className="analyzed-badge">Analyzed</span>
                                    )}
                                </div>
                                <div className="stream-info">
                                    <h3 className="stream-title">{stream.title}</h3>
                                    <div className="stream-meta">
                                        <span>{formatDate(stream.publishedAt)}</span>
                                        {stream.clipCount > 0 && (
                                            <span style={{
                                                color: 'var(--accent)',
                                                fontWeight: '500'
                                            }}>
                                                • {stream.clipCount} clips
                                            </span>
                                        )}
                                        {stream.viewCount && <span>• {formatViews(stream.viewCount)}</span>}
                                    </div>
                                </div>
                                <div className="stream-actions">
                                    {stream.isDone ? (
                                        <button
                                            className="btn btn-ghost"
                                            onClick={(e) => { e.stopPropagation(); handleUndo(stream._id); }}
                                            style={{ fontSize: '14px', padding: '10px 16px', color: '#22c55e' }}
                                        >
                                            ✓ Undo
                                        </button>
                                    ) : markingDoneId === stream._id ? (
                                        <span style={{
                                            fontSize: '14px',
                                            padding: '10px 16px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '4px',
                                            color: 'var(--text-muted)',
                                            minWidth: '100px'
                                        }}>
                                            <span style={{
                                                width: '14px',
                                                height: '14px',
                                                border: '2px solid rgba(255,255,255,0.2)',
                                                borderTopColor: 'var(--primary)',
                                                borderRadius: '50%',
                                                animation: 'spin 0.8s linear infinite'
                                            }}></span>
                                        </span>
                                    ) : (
                                        <button
                                            className="btn btn-ghost"
                                            onClick={(e) => { e.stopPropagation(); handleMarkDone(stream._id); }}
                                            style={{ fontSize: '14px', padding: '10px 16px' }}
                                        >
                                            Mark Done
                                        </button>
                                    )}
                                    <button
                                        className="btn btn-primary"
                                        onClick={(e) => { e.stopPropagation(); handleAnalyze(stream.videoId); }}
                                        style={{ fontSize: '14px', padding: '10px 20px' }}
                                    >
                                        Analyze
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    {hasMore && (
                        <div style={{ textAlign: 'center', marginTop: '24px' }}>
                            <button
                                className="btn btn-ghost"
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                style={{ padding: '12px 32px' }}
                            >
                                {loadingMore ? 'Loading...' : `Load More (${total - streams.length} remaining)`}
                            </button>
                        </div>
                    )}
                </>
            )}

            <style jsx>{`
                .streams-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 24px;
                }
                
                .stream-card {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    overflow: hidden;
                    transition: all 0.2s ease;
                }
                
                .stream-card:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-lg);
                    border-color: var(--border-accent);
                }
                
                .stream-card:hover .stream-thumbnail::after {
                    opacity: 0.5;
                }
                
                .stream-thumbnail {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 16/9;
                    background: var(--bg-primary);
                }
                
                .stream-thumbnail::after {
                    display: none;
                }
                
                .stream-thumbnail img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                
                .thumbnail-placeholder {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-primary) 100%);
                }
                
                .thumbnail-placeholder svg {
                    width: 48px;
                    height: 48px;
                    color: var(--text-muted);
                }
                
                .duration-badge {
                    position: absolute;
                    bottom: 8px;
                    right: 8px;
                    background: rgba(0, 0, 0, 0.9);
                    color: white;
                    padding: 3px 6px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: 600;
                    z-index: 1;
                }
                
                .analyzed-badge {
                    position: absolute;
                    top: 8px;
                    left: 8px;
                    background: var(--success);
                    color: white;
                    padding: 4px 10px;
                    border-radius: 4px;
                    font-size: 11px;
                    font-weight: 600;
                    z-index: 1;
                }
                
                .stream-info {
                    padding: 16px;
                }
                
                .stream-title {
                    font-size: 15px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: 8px;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    line-height: 1.5;
                }
                
                .stream-meta {
                    font-size: 13px;
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                .stream-actions {
                    display: flex;
                    gap: 10px;
                    padding: 0 16px 16px;
                }
                
                .stream-actions .btn,
                .stream-actions > span {
                    flex: 1;
                    border-radius: 8px;
                    min-width: 0;
                }
                
                .stream-actions .btn-ghost {
                    background: var(--bg-primary);
                    border: 1px solid var(--border);
                }
                
                .stream-actions .btn-ghost:hover {
                    background: var(--bg-hover);
                    border-color: var(--border-accent);
                }
            `}</style>
        </>
    );
}
