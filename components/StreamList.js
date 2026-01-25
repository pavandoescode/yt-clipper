"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function StreamList({ initialStreams }) {
    const router = useRouter();
    const [streams, setStreams] = useState(initialStreams || []);
    const [markingDoneId, setMarkingDoneId] = useState(null);

    const [visibleCount, setVisibleCount] = useState(9); // Initial 9

    const handleViewClips = (livestreamId) => {
        router.push(`/livestream/${livestreamId}`);
    };

    const handleMarkDone = async (streamId) => {
        setMarkingDoneId(streamId);
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/channel/stream/${streamId}/done`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStreams(prev => prev.filter(s => s._id !== streamId));
        } catch (error) {
            console.error('Mark done error:', error);
        }
        setMarkingDoneId(null);
    };

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + 9);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const formatViews = (viewCount) => {
        if (!viewCount) return '';
        const num = parseInt(viewCount);
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M views';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K views';
        return num + ' views';
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

    if (streams.length === 0) {
        return (
            <div className="empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <h3>No Active Clips Found</h3>
                <p>Analyze livestreams to extract clips or check the History tab.</p>
                <button
                    className="btn btn-primary"
                    style={{ marginTop: '16px' }}
                    onClick={() => router.push('/livestreams')}
                >
                    Go to Livestreams
                </button>
            </div>
        );
    }

    const visibleStreams = streams.slice(0, visibleCount);

    return (
        <>
            <div className="streams-grid">
                {visibleStreams.map((stream) => (
                    <div
                        key={stream._id}
                        className="stream-card"
                        onClick={() => handleViewClips(stream.livestreamId)}
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
                            {markingDoneId === stream._id ? (
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
                                onClick={(e) => { e.stopPropagation(); handleViewClips(stream.livestreamId); }}
                                style={{ fontSize: '14px', padding: '10px 20px' }}
                            >
                                View Clips
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {visibleCount < streams.length && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: '32px' }}>
                    <button
                        className="btn btn-ghost"
                        onClick={handleLoadMore}
                        style={{ minWidth: '200px' }}
                    >
                        Show More
                    </button>
                </div>
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
                
                .stream-thumbnail {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 16/9;
                    background: var(--bg-primary);
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
