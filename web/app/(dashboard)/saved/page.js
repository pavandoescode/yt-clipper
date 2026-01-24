"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import ClipCard from '@/components/ClipCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function SavedClipsPage() {
    const [loading, setLoading] = useState(true);
    const [clips, setClips] = useState([]);
    const [expandedGroups, setExpandedGroups] = useState({});
    const [linkCopiedId, setLinkCopiedId] = useState(null);

    useEffect(() => {
        fetchSavedClips();
    }, []);

    const fetchSavedClips = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/clips/saved`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClips(response.data.clips || response.data || []);
        } catch (error) {
            console.error('Fetch saved clips error:', error);
        }
        setLoading(false);
    };

    const handleSaveToggle = (clipId) => {
        setClips(prevClips => prevClips.filter(c => c._id !== clipId));
    };

    const toggleGroup = (groupId) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupId]: !prev[groupId]
        }));
    };

    const handleCopyLink = async (e, url, groupId) => {
        e.stopPropagation();
        if (!url) return;

        try {
            await navigator.clipboard.writeText(url);
            setLinkCopiedId(groupId);
            setTimeout(() => setLinkCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy link:', err);
        }
    };

    // Group clips by livestreamId
    const groupedClips = clips.reduce((acc, clip) => {
        // Handle cases where livestreamId might be missing or populated incorrectly
        const ls = clip.livestreamId || { _id: 'unknown', videoTitle: 'Unknown Source', title: 'Unknown Source', url: '' };
        const id = ls._id || 'unknown';
        const title = ls.videoTitle || ls.title || 'Unknown Source';
        const url = ls.url || '';

        if (!acc[id]) {
            acc[id] = {
                id,
                title,
                url,
                clips: []
            };
        }
        acc[id].clips.push(clip);
        return acc;
    }, {});

    // Sort groups by most recent clip
    const sortedGroups = Object.values(groupedClips).sort((a, b) => {
        const dateA = new Date(a.clips[0].createdAt);
        const dateB = new Date(b.clips[0].createdAt);
        return dateB - dateA;
    });

    return (
        <>
            <div className="page-header">
                <h1>Saved Clips</h1>
                <p>Your collection of saved clips</p>
            </div>

            {loading ? (
                <div className="loading-card" style={{ padding: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="loading-spinner"></div>
                    <p style={{ marginTop: '20px', color: 'var(--text-secondary)' }}>Loading saved clips...</p>
                </div>
            ) : clips.length === 0 ? (
                <div className="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <h3>No Saved Clips</h3>
                    <p>Clips you save will appear here.</p>
                </div>
            ) : (
                <div className="groups-container">
                    {sortedGroups.map((group) => {
                        const isExpanded = expandedGroups[group.id];
                        const isCopied = linkCopiedId === group.id;

                        return (
                            <div key={group.id} className="clip-group">
                                <div
                                    className="group-header"
                                    onClick={() => toggleGroup(group.id)}
                                >
                                    <div className="group-title">
                                        <svg
                                            width="20"
                                            height="20"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            style={{
                                                transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                                                transition: 'transform 0.2s',
                                                color: 'var(--text-muted)'
                                            }}
                                        >
                                            <polyline points="6 9 12 15 18 9"></polyline>
                                        </svg>
                                        <h3>{group.title}</h3>
                                        <span className="count-badge">{group.clips.length}</span>
                                    </div>
                                    <div className="group-actions">
                                        {group.url && (
                                            <button
                                                className="btn-icon"
                                                onClick={(e) => handleCopyLink(e, group.url, group.id)}
                                                title="Copy Video Link"
                                            >
                                                {isCopied ? (
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                                                        <polyline points="20 6 9 17 4 12"></polyline>
                                                    </svg>
                                                ) : (
                                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                                    </svg>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="group-body">
                                        <div className="clips-grid">
                                            {group.clips.map((clip) => (
                                                <ClipCard
                                                    key={clip._id}
                                                    clip={{
                                                        ...clip,
                                                        isSaved: true,
                                                        videoUrl: clip.videoUrl || group.url
                                                    }}
                                                    onSaveToggle={handleSaveToggle}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            <style jsx>{`
                .groups-container {
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .clip-group {
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    background: var(--bg-secondary);
                    overflow: hidden;
                }

                .group-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 16px 20px;
                    background: var(--bg-elevated);
                    cursor: pointer;
                    user-select: none;
                    border-bottom: 1px solid transparent;
                    transition: var(--transition);
                }

                .clip-group:not(:has(.group-body)) .group-header {
                    border-bottom-color: transparent;
                }
                
                .clip-group:has(.group-body) .group-header {
                    border-bottom-color: var(--border);
                }

                .group-header:hover {
                    background: var(--bg-hover);
                }

                .group-title {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .group-title h3 {
                    font-size: 16px;
                    font-weight: 600;
                    color: var(--text-primary);
                    margin: 0;
                }

                .count-badge {
                    background: var(--bg-active);
                    color: var(--text-secondary);
                    font-size: 12px;
                    font-weight: 600;
                    padding: 2px 8px;
                    border-radius: 12px;
                }

                .group-body {
                    padding: 24px;
                    background: var(--bg-primary); 
                    /* Use primary bg for content to contrast with header */
                }

                .clips-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
                    gap: 24px;
                }

                .btn-icon {
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 6px;
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: var(--transition);
                }

                .btn-icon:hover {
                    background: var(--bg-active);
                    color: var(--text-primary);
                }
            `}</style>
        </>
    );
}
