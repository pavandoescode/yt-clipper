"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ClipCard from '@/components/ClipCard';
import { useUI } from '@/context/UIContext';


const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function HistoryPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [livestreams, setLivestreams] = useState([]);
    const [doneGroups, setDoneGroups] = useState([]);
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const [deleting, setDeleting] = useState(null);
    const [deletingGroup, setDeletingGroup] = useState(null);
    const { showToast } = useUI();

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
            setLivestreams(response.data.data.livestreams || []);
            setDoneGroups(response.data.data.doneGroups || []);
        } catch (error) {
            console.error('Fetch error:', error);
        }
        setLoading(false);
    };

    const handleDelete = async (id) => {
        // ... (existing handleDelete)
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

    const handleDeleteGroup = async (id) => {
        setDeletingGroup(id);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/clips/group/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDoneGroups(prev => prev.filter(group => group._id !== id));
            showToast('Group deleted successfully', 'success');
        } catch (error) {
            console.error('Delete group error:', error);
            showToast('Failed to delete group', 'error');
        }
        setDeletingGroup(null);
    };

    const toggleGroupExpand = (groupId) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    };

    const timestampToSeconds = (ts) => {
        if (!ts) return 0;
        const parts = ts.split(':').map(Number);
        if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
        if (parts.length === 2) return parts[0] * 60 + parts[1];
        return parts[0] || 0;
    };

    const formatTotalDuration = (clips) => {
        const totalSeconds = clips.reduce((acc, c) => {
            const clip = c.clipId;
            const start = timestampToSeconds(clip?.timestampStart);
            const end = timestampToSeconds(clip?.timestampEnd);
            return acc + Math.abs(end - start);
        }, 0);
        
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };

    const formatDate = (dateString) => {
        // ... (existing formatDate)
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
        // ... (existing getStatusColor)
        switch (status) {
            case 'completed': return '#10b981';
            case 'analyzing': return '#f59e0b';
            case 'failed': return '#ef4444';
            default: return '#717171';
        }
    };

    const getThumbnail = (stream) => {
        // ... (existing getThumbnail)
        if (stream.thumbnail) return stream.thumbnail;
        const match = stream.url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/)([^&\s?]+)/);
        return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
    };

    return (
        <>
            <div className="page-header">
                <h1>History</h1>
                <p>Previously analyzed livestreams and finished groups</p>
            </div>

            {loading ? (
                <div className="loading-card">
                    <div className="loading-spinner"></div>
                    <p>Loading history...</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {/* Livestreams Section */}
                    <div>
                        <h2 className="section-title">Analyzed Livestreams</h2>
                        {livestreams.length === 0 ? (
                            <div className="empty-state" style={{ padding: '40px' }}>
                                <p style={{ color: 'var(--text-muted)' }}>No analysis history</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {livestreams.map((stream) => (
                                    <div
                                        key={stream._id}
                                        className={`card history-card ${deleting === stream._id ? 'deleting' : ''}`}
                                        onClick={(e) => handleCardClick(stream._id, e)}
                                    >
                                        <div className="history-card-content">
                                            <div className="history-thumbnail">
                                                {getThumbnail(stream) ? (
                                                    <img src={getThumbnail(stream)} alt="Video thumbnail" />
                                                ) : (
                                                    <div className="thumbnail-placeholder">
                                                        <svg viewBox="0 0 24 24" fill="currentColor">
                                                            <polygon points="5 3 19 12 5 21 5 3" />
                                                        </svg>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="history-info">
                                                <div className="history-title">{stream.videoTitle || 'YouTube Livestream'}</div>
                                                <div className="history-url">{stream.url}</div>
                                                <div className="history-meta">
                                                    <span>Analyzed {formatDate(stream.createdAt)}</span>
                                                </div>
                                            </div>
                                            <div className="history-actions">
                                                <Link href={`/livestream/${stream._id}`} className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '13px' }}>
                                                    View Clips
                                                </Link>
                                                <button className="btn btn-ghost delete-btn" onClick={() => handleDelete(stream._id)} disabled={deleting === stream._id}>
                                                    {deleting === stream._id ? <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div> : (
                                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <polyline points="3 6 5 6 21 6"></polyline>
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                        </svg>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Done Groups Section */}
                    <div>
                        <h2 className="section-title">Marked as Done Groups</h2>
                        {doneGroups.length === 0 ? (
                            <div className="empty-state" style={{ padding: '40px' }}>
                                <p style={{ color: 'var(--text-muted)' }}>No finished groups found</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {doneGroups.map((group) => {
                                    const isExpanded = expandedGroups.has(group._id);
                                    return (
                                        <div key={group._id} className={`aig-group-accordion ${isExpanded ? 'aig-group-expanded' : ''}`}>
                                            <div className="aig-group-header" onClick={() => toggleGroupExpand(group._id)}>
                                                <div className="aig-group-header-left">
                                                    <svg
                                                        width="18" height="18" viewBox="0 0 24 24"
                                                        fill="none" stroke="currentColor" strokeWidth="2.5"
                                                        className="aig-group-chevron"
                                                        style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                                                    >
                                                        <polyline points="6 9 12 15 18 9"></polyline>
                                                    </svg>
                                                    <div className="aig-group-info">
                                                        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <span className="group-num-badge">{group.groupNumber}</span>
                                                            {group.name}
                                                        </h3>
                                                        <p>Finished on {formatDate(group.updatedAt)} • {group.clips.length} Clips</p>
                                                    </div>
                                                </div>
                                                <div className="aig-group-header-right">
                                                    <div className="aig-group-badge">
                                                        {formatTotalDuration(group.clips)}
                                                    </div>
                                                    <button 
                                                        className="btn btn-ghost delete-btn" 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteGroup(group._id);
                                                        }} 
                                                        disabled={deletingGroup === group._id}
                                                    >
                                                        {deletingGroup === group._id ? <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div> : (
                                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                            </svg>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                            {isExpanded && (
                                                <div className="aig-group-body">
                                                    <div className="aig-group-cards-grid">
                                                        {group.clips.sort((a, b) => a.order - b.order).map((gc, idx) => (
                                                            <div key={gc.clipId?._id || idx} className="aig-group-card-wrapper">
                                                                <ClipCard
                                                                    clip={{
                                                                        ...(gc.clipId || {}),
                                                                        isSaved: false,
                                                                        videoUrl: gc.clipId?.videoUrl || gc.clipId?.livestreamId?.url || ''
                                                                    }}
                                                                    onSaveToggle={() => fetchHistory()}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style jsx>{`
                .section-title {
                    font-size: 18px;
                    font-weight: 700;
                    margin-bottom: 16px;
                    color: var(--text-primary);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .group-num-badge {
                    font-size: 10px;
                    font-weight: 800;
                    background: var(--accent);
                    color: #000;
                    padding: 2px 6px;
                    border-radius: 4px;
                    letter-spacing: 0.5px;
                }

                .group-done-icon {
                    width: 48px;
                    height: 48px;
                    min-width: 48px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(34, 197, 94, 0.1);
                    border-radius: 50%;
                }

                .aig-group-accordion {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    transition: all 0.2s ease;
                }

                .aig-group-expanded {
                    border-color: var(--accent);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                }

                .aig-group-header {
                    padding: 16px 20px;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    cursor: pointer;
                    user-select: none;
                }

                .aig-group-header:hover {
                    background: var(--bg-hover);
                }

                .aig-group-header-left {
                    display: flex;
                    align-items: flex-start;
                    gap: 16px;
                    flex: 1;
                }

                .aig-group-chevron {
                    margin-top: 4px;
                    color: var(--text-muted);
                    transition: transform 0.25s ease;
                }

                .aig-group-info h3 {
                    margin: 0 0 4px 0;
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--text-primary);
                }

                .aig-group-info p {
                    margin: 0;
                    font-size: 13px;
                    color: var(--text-secondary);
                    line-height: 1.4;
                }

                .aig-group-header-right {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .aig-group-badge {
                    font-size: 11px;
                    font-weight: 700;
                    background: var(--bg-active);
                    color: var(--text-secondary);
                    padding: 4px 12px;
                    border-radius: 12px;
                    white-space: nowrap;
                }

                .aig-group-body {
                    padding: 0 20px 24px;
                    border-top: 1px solid var(--border);
                    background: var(--bg-secondary);
                }

                .aig-group-cards-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
                    gap: 20px;
                    padding-top: 24px;
                }

                .aig-group-card-wrapper {
                    position: relative;
                    background: var(--bg-primary);
                    border-radius: 12px;
                    border: 1px solid var(--border);
                    overflow: hidden;
                }
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
