"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';


const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function HistoryPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [livestreams, setLivestreams] = useState([]);
    const [deleting, setDeleting] = useState(null);

    const handleCardClick = (id, e) => {
        // Don't navigate if clicking on links, buttons, or actions
        if (e.target.closest('a') || e.target.closest('button') || e.target.closest('.history-actions')) {
            return;
        }
        router.push(`/livestream/${id}`);
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/clips/history`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLivestreams(response.data.data.livestreams);
        } catch (error) {
            console.error('Fetch error:', error);
        }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        setDeleting(id);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/clips/livestream/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLivestreams(prev => prev.filter(stream => stream._id !== id));
        } catch (error) {
            console.error('Delete error:', error);
        }
        setDeleting(null);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return '#10b981';
            case 'analyzing': return '#f59e0b';
            case 'failed': return '#ef4444';
            default: return '#717171';
        }
    };

    const getThumbnail = (stream) => {
        if (stream.thumbnail) return stream.thumbnail;
        const match = stream.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([^&\s?]+)/);
        return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
    };

    return (
        <>
            <div className="page-header">
                <h1>History</h1>
                <p>Previously analyzed livestreams</p>
            </div>

            {loading ? (
                <div className="loading-card">
                    <div className="loading-spinner"></div>
                    <p>Loading history...</p>
                </div>
            ) : livestreams.length === 0 ? (
                <div className="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12,6 12,12 16,14" />
                    </svg>
                    <h3>No analysis history</h3>
                    <p>Analyzed videos will appear here</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {livestreams.map((stream) => (
                        <div
                            key={stream._id}
                            className={`card history-card ${deleting === stream._id ? 'deleting' : ''}`}
                            onClick={(e) => handleCardClick(stream._id, e)}
                        >
                            <div className="history-card-content">
                                {/* Thumbnail */}
                                <div className="history-thumbnail">
                                    {getThumbnail(stream) ? (
                                        <img
                                            src={getThumbnail(stream)}
                                            alt="Video thumbnail"
                                            onError={(e) => { e.target.style.display = 'none'; }}
                                        />
                                    ) : (
                                        <div className="thumbnail-placeholder">
                                            <svg viewBox="0 0 24 24" fill="currentColor">
                                                <polygon points="5 3 19 12 5 21 5 3" />
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="history-info">
                                    <div className="history-title">
                                        {stream.videoTitle || 'YouTube Livestream'}
                                    </div>
                                    <div className="history-url">
                                        {stream.url}
                                    </div>
                                    <div className="history-meta">
                                        <span>Analyzed {formatDate(stream.createdAt)}</span>
                                        {stream.videoUploadDate && (
                                            <span>• Uploaded {stream.videoUploadDate}</span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="history-actions">
                                    {stream.status !== 'completed' && (
                                        <span
                                            className="badge"
                                            style={{
                                                backgroundColor: getStatusColor(stream.status) + '20',
                                                color: getStatusColor(stream.status),
                                                textTransform: 'capitalize'
                                            }}
                                        >
                                            {stream.status}
                                        </span>
                                    )}
                                    <Link
                                        href={`/livestream/${stream._id}`}
                                        className="btn btn-primary"
                                        style={{ padding: '10px 20px', fontSize: '13px' }}
                                    >
                                        View Clips
                                    </Link>
                                    <button
                                        className="btn btn-ghost delete-btn"
                                        onClick={() => handleDelete(stream._id)}
                                        disabled={deleting === stream._id}
                                        title="Delete"
                                    >
                                        {deleting === stream._id ? (
                                            <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>
                                        ) : (
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                                <line x1="14" y1="11" x2="14" y2="17"></line>
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style jsx>{`
                .history-card {
                    padding: 0 !important;
                    overflow: hidden;
                    transition: all 0.3s ease;
                    cursor: pointer;
                }
                
                .history-card:hover {
                    border-color: var(--border-accent);
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-lg);
                }
                
                .history-card .btn-primary:hover {
                    transform: scale(1.02);
                    color: #000000 !important;
                }
                
                .history-card.deleting {
                    opacity: 0.5;
                    transform: scale(0.98);
                    border-color: var(--danger);
                    background: rgba(239, 68, 68, 0.05);
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 0.3; }
                }
                
                .history-card.deleting {
                    animation: pulse 0.6s ease-in-out infinite;
                }
                
                .history-card-content {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    padding: 16px;
                }
                
                .history-thumbnail {
                    width: 180px;
                    height: 100px;
                    min-width: 180px;
                    border-radius: var(--radius-md);
                    overflow: hidden;
                    background: var(--bg-primary);
                }
                
                .history-thumbnail img {
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
                    background: var(--bg-hover);
                    color: var(--text-muted);
                }
                
                .thumbnail-placeholder svg {
                    width: 32px;
                    height: 32px;
                }
                
                .history-info {
                    flex: 1;
                    min-width: 0;
                }
                
                .history-title {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin-bottom: 6px;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .history-url {
                    font-size: 13px;
                    color: var(--accent);
                    display: block;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    margin-bottom: 6px;
                }
                
                .history-url:hover {
                    color: var(--accent-hover);
                }
                
                .history-meta {
                    font-size: 12px;
                    color: var(--text-muted);
                }
                
                .history-actions {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .delete-btn {
                    padding: 8px !important;
                    color: var(--text-muted);
                }
                
                .delete-btn:hover {
                    color: var(--danger) !important;
                    background: rgba(239, 68, 68, 0.1) !important;
                }
                
                @media (max-width: 768px) {
                    .history-card-content {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    
                    .history-thumbnail {
                        width: 100%;
                        height: 180px;
                    }
                    
                    .history-actions {
                        width: 100%;
                        justify-content: flex-end;
                    }
                }
            `}</style>
        </>
    );
}
