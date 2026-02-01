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

    const [searchQuery, setSearchQuery] = useState('');
    const [serverClips, setServerClips] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length > 2) {
                setIsSearching(true);
                try {
                    const token = localStorage.getItem('token');
                    const response = await axios.get(`${API_URL}/clips/search?q=${searchQuery.trim()}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setServerClips(response.data.clips || []);
                } catch (error) {
                    console.error('Search error:', error);
                }
                setIsSearching(false);
            } else {
                setServerClips([]);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Combine local saved clips (filtered) with server search results
    // Use a Map to deduplicate by ID, prioritizing local (saved) state if existent
    const combinedClips = (() => {
        const results = new Map();

        // 1. Add filtered local clips
        clips.forEach(clip => {
            if (!searchQuery || (clip.clipNumber || '').toLowerCase().includes(searchQuery.toLowerCase())) {
                results.set(clip._id, clip);
            }
        });

        // 2. Add server results (only if searching)
        if (searchQuery) {
            serverClips.forEach(clip => {
                if (!results.has(clip._id)) {
                    results.set(clip._id, clip);
                }
            });
        }

        return Array.from(results.values());
    })();

    // Group clips by livestreamId
    const groupedClips = combinedClips.reduce((acc, clip) => {
        // ... (existing reduce logic)
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
        const dateA = new Date(a.clips[0].createdAt || Date.now());
        const dateB = new Date(b.clips[0].createdAt || Date.now());
        return dateB - dateA;
    });

    const handleSaveFromSearch = (clipId) => {
        // If un-saving a clip that was only found via search (and not in 'clips'), 
        // we might want to keep it visible but mark as unsaved.
        // If saving a clip found via search, we add it to 'clips'.

        // Optimistic update: toggle logic
        // But since we have two sources (clips and serverClips), we just need to refresh or handle locally.
        // Simplest: re-fetch saved matched clips or just let the mutation happen.
        // The component re-renders. If it was in 'clips', handleSaveToggle removed it.
        // But if we are searching, we still want to see it.

        // We need to update the 'clips' state to reflect the change if we want it to persist/unpersist in the UI
        // WITHOUT making it disappear if it's the result of a search.

        setClips(prev => {
            const exists = prev.find(c => c._id === clipId);
            if (exists) {
                // Removing from saved
                return prev.filter(c => c._id !== clipId);
            } else {
                // Adding to saved (match from serverClips)
                const clip = serverClips.find(c => c._id === clipId);
                if (clip) return [...prev, { ...clip, isSaved: true }];
                return prev;
            }
        });

        // Also update serverClips state to reflect isSaved toggle so UI updates immediately
        setServerClips(prev => prev.map(c =>
            c._id === clipId ? { ...c, isSaved: !c.isSaved } : c
        ));
    };

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>Saved Clips</h1>
                    <p>Your collection of saved clips (and global search)</p>
                </div>
                <div style={{ marginTop: '16px', position: 'relative' }}>
                    <input
                        type="text"
                        placeholder="Search all clips by ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                    {isSearching && (
                        <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                            <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>
                        </div>
                    )}
                </div>
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
                                                    onSaveToggle={handleSaveFromSearch}
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

                .search-input {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border);
                    color: var(--text-primary);
                    padding: 8px 12px;
                    border-radius: 6px;
                    width: 100%;
                    max-width: 300px;
                    font-size: 14px;
                    outline: none;
                    transition: border-color 0.2s;
                }

                .search-input:focus {
                    border-color: var(--accent);
                }
            `}</style>
        </>
    );
}
