"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import ClipCard from '@/components/ClipCard';
import { useUI } from '@/context/UIContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function AIGroupingPage() {
    const [loading, setLoading] = useState(true);
    const [clips, setClips] = useState([]);
    const [groups, setGroups] = useState([]); // Kept for filtering
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClips, setSelectedClips] = useState(new Set());
    const [expandedClips, setExpandedClips] = useState(new Set());
    const [copiedId, setCopiedId] = useState(null);
    const [groupingLoading, setGroupingLoading] = useState(false);

    const { showToast, showConfirm } = useUI();


    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            await Promise.all([fetchSavedClips(), fetchGroups()]);
            setLoading(false);
        };
        loadInitialData();
    }, []);

    const fetchSavedClips = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/clips/saved`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClips(response.data.clips || response.data || []);
        } catch (error) {
            console.error('Fetch saved clips error:', error);
        }
    };

    const fetchGroups = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/clips/group`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGroups(response.data.groups || []);
        } catch (error) {
            console.error('Fetch groups error:', error);
        }
    };

    const handleSaveToggle = (clipId) => {
        setClips(prevClips => prevClips.filter(c => c._id !== clipId));
        setSelectedClips(prev => { const next = new Set(prev); next.delete(clipId); return next; });
    };

    const toggleSelect = (e, clipId) => {
        e.stopPropagation();
        setSelectedClips(prev => {
            const next = new Set(prev);
            if (next.has(clipId)) next.delete(clipId);
            else next.add(clipId);
            return next;
        });
    };

    const toggleExpand = (clipId) => {
        setExpandedClips(prev => {
            const next = new Set(prev);
            if (next.has(clipId)) next.delete(clipId);
            else next.add(clipId);
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

    const getDuration = (start, end) => {
        const secs = Math.abs(timestampToSeconds(end) - timestampToSeconds(start));
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    const handleCopyId = (e, clipNumber) => {
        e.stopPropagation();
        navigator.clipboard.writeText(clipNumber).then(() => {
            setCopiedId(clipNumber);
            setTimeout(() => setCopiedId(null), 1500);
        });
    };

    const formatTotalDuration = (clips) => {
        const totalSeconds = clips.reduce((acc, c) => {
            const start = timestampToSeconds(c.clipId?.timestampStart || c.timestampStart);
            const end = timestampToSeconds(c.clipId?.timestampEnd || c.timestampEnd);
            return acc + Math.abs(end - start);
        }, 0);
        
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        
        if (h > 0) return `${h}h ${m}m ${s}s`;
        if (m > 0) return `${m}m ${s}s`;
        return `${s}s`;
    };

    const handleCreateGroups = async () => {
        if (selectedClips.size < 2) return;
        setGroupingLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API_URL}/clips/group`, {
                clipIds: [...selectedClips]
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Refresh both
            await Promise.all([fetchSavedClips(), fetchGroups()]);
            setSelectedClips(new Set());
            
            const { groups: newGroups, groupedClipsCount, ungroupedCount } = res.data;
            const groupWord = newGroups.length === 1 ? 'group' : 'groups';
            const clipWord = groupedClipsCount === 1 ? 'clip' : 'clips';
            const alertMsg = `${newGroups.length} ${groupWord} made using ${groupedClipsCount} ${clipWord}${ungroupedCount > 0 ? ` and ${ungroupedCount} are not` : ''}`;
            
            showToast(alertMsg, 'success');
            // Redirect to managed groups page
            setTimeout(() => window.location.href = '/grouped-clips', 1500);
        } catch (error) {
            console.error('Create groups error:', error);
            showToast('Failed to create groups: ' + (error.response?.data?.message || error.message), 'error');
        }
        setGroupingLoading(false);
    };


    const groupedClipIds = new Set(groups.flatMap(g => g.clips.map(c => c.clipId?._id || c.clipId)));

    // Filter clips based on search query and if they are already grouped
    const filteredClips = clips.filter(clip => {
        if (groupedClipIds.has(clip._id)) return false;
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            (clip.title || '').toLowerCase().includes(q) ||
            (clip.clipNumber || '').toLowerCase().includes(q) ||
            (clip.summary || '').toLowerCase().includes(q) ||
            (clip.category || '').toLowerCase().includes(q) ||
            (clip.keyLine || '').toLowerCase().includes(q) ||
            (clip.customTitle || '').toLowerCase().includes(q) ||
            (clip.suggestedTitles || []).some(t => t.toLowerCase().includes(q)) ||
            (clip.livestreamId?.videoTitle || '').toLowerCase().includes(q)
        );
    });

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>AI Grouping</h1>
                    <p>All saved clips ({filteredClips.length}{searchQuery ? ` matching "${searchQuery}"` : ''}) {selectedClips.size > 0 && <span style={{ color: 'var(--accent)', fontWeight: 600 }}>• {selectedClips.size} selected</span>}</p>
                </div>
                <div style={{ marginTop: '16px', position: 'relative' }}>
                    <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'var(--text-muted)',
                            pointerEvents: 'none'
                        }}
                    >
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search clips by title, category, summary, key line..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="aig-search-input"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '18px',
                                lineHeight: '1',
                                padding: '4px'
                            }}
                            title="Clear search"
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="loading-card" style={{ padding: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div className="loading-spinner"></div>
                    <p style={{ marginTop: '20px', color: 'var(--text-secondary)' }}>Loading clips...</p>
                </div>
            ) : clips.length === 0 ? (
                <div className="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    <h3>No Saved Clips</h3>
                    <p>Save clips from your analyzed livestreams to see them here.</p>
                </div>
            ) : filteredClips.length === 0 ? (
                <div className="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <h3>No clips match "{searchQuery}"</h3>
                    <p>Try a different search term</p>
                </div>
            ) : (
                <div className="aig-list">
                    {filteredClips.map((clip) => {
                        const isSelected = selectedClips.has(clip._id);
                        const isExpanded = expandedClips.has(clip._id);
                        return (
                            <div key={clip._id} className={`aig-list-item ${isSelected ? 'aig-selected' : ''} ${isExpanded ? 'aig-expanded' : ''}`}>
                                <div className="aig-list-header" onClick={() => toggleExpand(clip._id)}>
                                    <div className="aig-list-left">
                                        <svg
                                            width="16" height="16" viewBox="0 0 24 24"
                                            fill="none" stroke="currentColor" strokeWidth="2"
                                            className="aig-chevron"
                                            style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                                        >
                                            <polyline points="6 9 12 15 18 9"></polyline>
                                        </svg>
                                        <div className="aig-check" onClick={(e) => toggleSelect(e, clip._id)}>
                                            {isSelected ? (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="#22c55e" stroke="white" strokeWidth="2.5">
                                                    <circle cx="12" cy="12" r="11" />
                                                    <polyline points="8 12 11 15 16 9" fill="none" />
                                                </svg>
                                            ) : (
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                                                    <circle cx="12" cy="12" r="11" />
                                                </svg>
                                            )}
                                        </div>
                                        <span
                                            className={`aig-clip-num ${copiedId === clip.clipNumber ? 'aig-copied' : ''}`}
                                            onClick={(e) => handleCopyId(e, clip.clipNumber)}
                                            title="Click to copy ID"
                                        >
                                            {copiedId === clip.clipNumber ? 'Copied!' : `#${clip.clipNumber}`}
                                        </span>
                                        <span className="aig-clip-title">{clip.title}</span>
                                    </div>
                                    <div className="aig-list-right">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            {clip.category && <span className="aig-badge">{clip.category}</span>}
                                            <span className="aig-timestamp">{getDuration(clip.timestampStart, clip.timestampEnd)}</span>
                                            <a
                                                href={`${clip.videoUrl || clip.livestreamId?.url || ''}${ (clip.videoUrl || clip.livestreamId?.url)?.includes('?') ? '&' : '?'}t=${timestampToSeconds(clip.timestampStart)}s`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="aig-open-link"
                                                title="Open in YouTube"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                                    <polyline points="15 3 21 3 21 9" />
                                                    <line x1="10" y1="14" x2="21" y2="3" />
                                                </svg>
                                            </a>
                                        </div>
                                    </div>
                                </div>
                                {isExpanded && (
                                    <div className="aig-list-body">
                                        {clip.summary && (
                                            <p className="aig-summary">{clip.summary}</p>
                                        )}
                                        {clip.keyLine && (
                                            <div className="aig-keyline">"{clip.keyLine}"</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}


            {selectedClips.size > 0 && (
                <button 
                    className={`aig-create-group-btn ${groupingLoading ? 'loading' : ''}`} 
                    onClick={handleCreateGroups}
                    disabled={groupingLoading || selectedClips.size < 2}
                    title={selectedClips.size < 2 ? "Select at least 2 clips to group" : ""}
                >
                    {groupingLoading ? 'Grouping with AI...' : `Create Group (${selectedClips.size})`}
                </button>
            )}

            <style jsx>{`
                .aig-search-input {
                    background: var(--bg-secondary);
                    border: 1px solid var(--border);
                    color: var(--text-primary);
                    padding: 10px 36px 10px 40px;
                    border-radius: 8px;
                    width: 100%;
                    max-width: 500px;
                    font-size: 14px;
                    outline: none;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }

                .aig-search-input:focus {
                    border-color: var(--accent);
                    box-shadow: 0 0 0 3px rgba(var(--accent-rgb, 99, 102, 241), 0.1);
                }

                .aig-search-input::placeholder {
                    color: var(--text-muted);
                }

                .aig-list {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                }

                .aig-list-item {
                    border: 1px solid var(--border);
                    border-radius: 10px;
                    background: var(--bg-secondary);
                    overflow: hidden;
                    transition: all 0.2s ease;
                }

                .aig-list-item.aig-selected {
                    border-color: #22c55e;
                }

                .aig-list-item.aig-expanded {
                    border-color: var(--border-accent, var(--border));
                }

                .aig-list-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 12px 16px;
                    cursor: pointer;
                    user-select: none;
                    transition: background 0.15s ease;
                }

                .aig-list-header:hover {
                    background: var(--bg-hover);
                }

                .aig-list-left {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex: 1;
                    min-width: 0;
                }

                .aig-list-right {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    flex-shrink: 0;
                }

                .aig-chevron {
                    flex-shrink: 0;
                    color: var(--text-muted);
                    transition: transform 0.2s ease;
                }

                .aig-check {
                    flex-shrink: 0;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    transition: transform 0.15s ease;
                }

                .aig-check:hover {
                    transform: scale(1.15);
                }

                .aig-clip-num {
                    font-size: 13px;
                    font-weight: 600;
                    color: var(--text-muted);
                    flex-shrink: 0;
                    cursor: pointer;
                    padding: 2px 6px;
                    border-radius: 4px;
                    transition: all 0.15s ease;
                }

                .aig-timestamp {
                    font-size: 11px;
                    color: var(--text-muted);
                    font-weight: 700;
                    background: var(--bg-active);
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-family: monospace;
                    white-space: nowrap;
                }

                .aig-open-link {
                    color: var(--text-muted);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 4px;
                    border-radius: 4px;
                    transition: all 0.2s;
                }

                .aig-open-link:hover {
                    color: var(--accent);
                    background: rgba(99, 102, 241, 0.1);
                }
                
                .aig-clip-num:hover {
                    background: var(--bg-active);
                    color: var(--text-primary);
                }

                .aig-clip-num.aig-copied {
                    color: #22c55e;
                }

                .aig-clip-title {
                    font-size: 14px;
                    font-weight: 500;
                    color: var(--text-primary);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }

                .aig-badge {
                    font-size: 11px;
                    font-weight: 600;
                    padding: 3px 10px;
                    border-radius: 12px;
                    background: var(--bg-active);
                    color: var(--text-secondary);
                    white-space: nowrap;
                }

                .aig-timestamp {
                    font-size: 12px;
                    color: var(--text-muted);
                    white-space: nowrap;
                    font-variant-numeric: tabular-nums;
                }

                .aig-list-body {
                    padding: 12px 16px 14px;
                    border-top: 1px solid var(--border);
                }

                .aig-summary {
                    font-size: 13px;
                    color: var(--text-secondary);
                    line-height: 1.5;
                    margin: 0;
                }

                .aig-keyline {
                    font-size: 13px;
                    color: var(--accent);
                    font-style: italic;
                    margin-top: 8px;
                    padding-left: 12px;
                    border-left: 2px solid var(--accent);
                }

                .aig-create-group-btn {
                    position: fixed;
                    bottom: 32px;
                    right: 32px;
                    padding: 14px 28px;
                    font-size: 15px;
                    font-weight: 600;
                    color: #000;
                    background: var(--accent, #6366f1);
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
                    box-shadow: 0 4px 20px rgba(99, 102, 241, 0.4);
                    z-index: 100;
                    animation: aig-slide-up 0.25s ease-out;
                    transition: transform 0.15s ease, box-shadow 0.15s ease, opacity 0.2s;
                }

                .aig-create-group-btn:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 28px rgba(99, 102, 241, 0.55);
                }

                .aig-create-group-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .aig-create-group-btn.loading {
                    background: var(--bg-active);
                    color: var(--text-secondary);
                }

                @keyframes aig-slide-up {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* Groups Section Styles */
                .aig-groups-section {
                    margin-top: 40px;
                    padding-bottom: 80px;
                }

                .aig-section-title {
                    font-size: 20px;
                    font-weight: 700;
                    margin-bottom: 20px;
                    color: var(--text-primary);
                    padding-top: 20px;
                    border-top: 1px solid var(--border);
                }

                .aig-groups-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
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

                .aig-group-menu-container {
                    position: relative;
                }

                .aig-group-menu-btn {
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    padding: 8px;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s;
                }

                .aig-group-menu-btn:hover {
                    background: var(--bg-active);
                    color: var(--text-primary);
                }

                .aig-group-menu {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    margin-top: 8px;
                    background: #1a1a1a;
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                    z-index: 50;
                    min-width: 160px;
                    overflow: hidden;
                    animation: aig-fade-in-up 0.2s ease-out;
                }

                @keyframes aig-fade-in-up {
                    from { opacity: 0; transform: translateY(4px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .aig-group-menu-item {
                    width: 100%;
                    padding: 10px 16px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--text-secondary);
                    background: transparent;
                    border: none;
                    cursor: pointer;
                    transition: background 0.2s;
                    text-align: left;
                }

                .aig-group-menu-item:hover {
                    background: rgba(255, 255, 255, 0.05);
                }

                .aig-group-menu-item.delete {
                    color: #ef4444;
                }

                .aig-group-menu-item.delete:hover {
                    background: rgba(239, 68, 68, 0.1);
                }

                .aig-group-body {
                    padding: 0 20px 24px;
                    border-top: 1px solid var(--border);
                    background: var(--bg-secondary);
                }

                .aig-group-cards-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 20px;
                    padding-top: 24px;
                }

                .aig-group-card-wrapper {
                    position: relative;
                }

                .aig-card-order-badge {
                    position: absolute;
                    top: -10px;
                    left: -10px;
                    width: 28px;
                    height: 28px;
                    background: var(--accent);
                    color: #000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 50%;
                    font-size: 12px;
                    font-weight: 800;
                    z-index: 20;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
                }
            `}</style>
        </>
    );
}
