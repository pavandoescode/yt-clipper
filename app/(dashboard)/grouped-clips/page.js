"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';
import ClipCard from '@/components/ClipCard';
import { useUI } from '@/context/UIContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function GroupedClipsPage() {
    const [loading, setLoading] = useState(true);
    const [groups, setGroups] = useState([]);
    const [expandedGroups, setExpandedGroups] = useState(new Set());
    const [activeMenu, setActiveMenu] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const { showToast, showConfirm } = useUI();

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (!e.target.closest('.aig-group-menu-container')) {
                setActiveMenu(null);
            }
        };
        window.addEventListener('mousedown', handleClickOutside);
        return () => window.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        fetchGroups();
    }, []);

    const fetchGroups = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/clips/group`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGroups(response.data.groups || []);
        } catch (error) {
            console.error('Fetch groups error:', error);
            showToast('Failed to load groups', 'error');
        } finally {
            setLoading(false);
        }
    };

    const toggleGroupExpand = (groupId) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(groupId)) next.delete(groupId);
            else next.add(groupId);
            return next;
        });
    };

    const confirmDeleteGroup = (groupId) => {
        showConfirm({
            title: "Delete Group?",
            message: "Are you sure you want to delete this group? The clips will be returned to the main list for regrouping.",
            onConfirm: () => handleDeleteGroup(groupId),
            type: "danger"
        });
    };

    const handleDeleteGroup = async (groupId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/clips/group/${groupId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setGroups(prev => prev.filter(g => g._id !== groupId));
            setActiveMenu(null);
            showToast('Group deleted successfully', 'success');
        } catch (error) {
            console.error('Delete group error:', error);
            showToast('Failed to delete group', 'error');
        }
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

    const filteredGroups = groups.filter(group => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        
        // Match group ID or name
        const matchesGroup = (group.groupNumber || '').toLowerCase().includes(q) ||
                             (group.name || '').toLowerCase().includes(q) ||
                             (group.description || '').toLowerCase().includes(q);
        
        // Match any clip ID or title within the group
        const matchesClip = group.clips.some(gc => 
            (gc.clipId?.clipNumber || '').toLowerCase().includes(q) ||
            (gc.clipId?.title || '').toLowerCase().includes(q) ||
            (gc.clipId?.customTitle || '').toLowerCase().includes(q)
        );
        
        return matchesGroup || matchesClip;
    });

    return (
        <>
            <div className="page-header">
                <div>
                    <h1>Grouped Clips</h1>
                    <p>Manage and review your AI-generated topic groups ({filteredGroups.length} groups total)</p>
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
                        placeholder="Search by Group ID, Clip ID, Title, or Topic..."
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
                    <p style={{ marginTop: '20px', color: 'var(--text-secondary)' }}>Loading groups...</p>
                </div>
            ) : groups.length === 0 ? (
                <div className="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <h3>No Groups Found</h3>
                    <p>Go to "AI Grouping" to create your first topic group.</p>
                </div>
            ) : filteredGroups.length === 0 ? (
                <div className="empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <h3>No groups match "{searchQuery}"</h3>
                    <p>Try searching by Group ID (GP-...) or Clip ID</p>
                </div>
            ) : (
                <div className="aig-groups-list">
                    {filteredGroups.map((group) => {
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
                                            <h3>{group.name}</h3>
                                            {group.description && <p>{group.description}</p>}
                                        </div>
                                    </div>
                                    <div className="aig-group-header-right">
                                        <div className="aig-group-badge">
                                            {group.clips.length} Clips • {formatTotalDuration(group.clips)}
                                        </div>
                                        <div className="aig-group-menu-container">
                                            <button 
                                                className="aig-group-menu-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveMenu(activeMenu === group._id ? null : group._id);
                                                }}
                                            >
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="1"></circle>
                                                    <circle cx="12" cy="5" r="1"></circle>
                                                    <circle cx="12" cy="19" r="1"></circle>
                                                </svg>
                                            </button>
                                            {activeMenu === group._id && (
                                                <div className="aig-group-menu">
                                                    <button 
                                                        className="aig-group-menu-item"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const links = group.clips.map(gc => {
                                                                const clip = gc.clipId;
                                                                const url = clip?.videoUrl || clip?.livestreamId?.url || '';
                                                                const start = timestampToSeconds(clip?.timestampStart);
                                                                return `${url}${url.includes('?') ? '&' : '?'}t=${start}s`;
                                                            }).join('\n');
                                                            navigator.clipboard.writeText(links).then(() => {
                                                                showToast('All clip links copied!', 'success');
                                                                setActiveMenu(null);
                                                            });
                                                        }}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                                        </svg>
                                                        Copy Links
                                                    </button>
                                                    <button 
                                                        className="aig-group-menu-item"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigator.clipboard.writeText(group.groupNumber).then(() => {
                                                                showToast(`Group ID ${group.groupNumber} copied!`, 'success');
                                                                setActiveMenu(null);
                                                            });
                                                        }}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                                            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                                                        </svg>
                                                        Copy ID
                                                    </button>
                                                    <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0' }}></div>
                                                    <button 
                                                        className="aig-group-menu-item delete"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            confirmDeleteGroup(group._id);
                                                        }}
                                                    >
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                            <polyline points="3 6 5 6 21 6"></polyline>
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                            <line x1="10" y1="11" x2="10" y2="17"></line>
                                                            <line x1="14" y1="11" x2="14" y2="17"></line>
                                                        </svg>
                                                        Delete Group
                                                    </button>
                                                </div>
                                            )}
                                        </div>
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
                                                            isSaved: true,
                                                            videoUrl: gc.clipId?.videoUrl || gc.clipId?.livestreamId?.url || ''
                                                        }}
                                                        onSaveToggle={() => fetchGroups()}
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

                .aig-group-id-badge {
                    font-size: 10px;
                    font-weight: 800;
                    background: var(--accent);
                    color: #000;
                    padding: 2px 6px;
                    border-radius: 4px;
                    letter-spacing: 0.5px;
                }

                .aig-groups-list {
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                    padding-bottom: 40px;
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
                    background: var(--bg-secondary);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    padding: 4px;
                    box-shadow: var(--shadow-lg);
                    z-index: 10;
                    min-width: 140px;
                    margin-top: 4px;
                    animation: aig-fade-in 0.15s ease-out;
                }

                @keyframes aig-fade-in {
                    from { opacity: 0; transform: translateY(-8px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .aig-group-menu-item {
                    width: 100%;
                    text-align: left;
                    padding: 8px 12px;
                    background: transparent;
                    border: none;
                    border-radius: 6px;
                    font-size: 13px;
                    font-weight: 500;
                    color: var(--text-primary);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.15s;
                }

                .aig-group-menu-item:hover {
                    background: var(--bg-hover);
                }

                .aig-group-menu-item.delete {
                    color: #ef4444;
                }

                .aig-group-menu-item.delete:hover {
                    background: rgba(239, 68, 68, 0.1);
                }

                .aig-group-body {
                    padding: 0 20px 20px;
                    border-top: 1px solid var(--border);
                }

                .aig-group-cards-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
                    gap: 16px;
                    margin-top: 20px;
                }

                .aig-group-card-wrapper {
                    background: var(--bg-primary);
                    border-radius: 10px;
                    border: 1px solid var(--border);
                    overflow: hidden;
                    position: relative;
                }
            `}</style>
        </>
    );
}
