"use client";

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

function ClipCard({ clip, onSaveToggle }) {
    const [saving, setSaving] = useState(false);
    const [textSaving, setTextSaving] = useState(false);
    const [customTitle, setCustomTitle] = useState(clip.customTitle || '');
    const [thumbnailText, setThumbnailText] = useState(clip.thumbnailText || '');
    const [isLastOpened, setIsLastOpened] = useState(false);
    const saveTimeoutRef = useRef(null);

    // Auto-save text fields with debounce
    const autoSaveText = async () => {
        setTextSaving(true);
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/clips/${clip._id}/update-text`, {
                customTitle,
                thumbnailText
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Auto-save error:', error);
        }
        setTextSaving(false);
    };

    // Debounced save - triggers 800ms after user stops typing (only if clip is already saved)
    const handleTextChange = (setter, value) => {
        setter(value);
        // Only auto-save if clip is already saved
        if (!clip.isSaved) {
            return;
        }
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
        setTextSaving(true);
        saveTimeoutRef.current = setTimeout(() => {
            autoSaveText();
        }, 800);
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    // Check if this clip was last opened and listen for changes
    useEffect(() => {
        const checkLastOpened = () => {
            if (typeof window === 'undefined') return;
            const lastOpenedId = localStorage.getItem('lastOpenedClipId');
            setIsLastOpened(lastOpenedId === clip._id);
        };

        checkLastOpened();

        // Listen for custom event when another clip is opened
        if (typeof window !== 'undefined') {
            window.addEventListener('clipOpened', checkLastOpened);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('clipOpened', checkLastOpened);
            }
        };
    }, [clip._id]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/clips/${clip._id}/save`, {
                customTitle,
                thumbnailText
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onSaveToggle(clip._id);
            // Notify sidebar to update saved count
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('clipSaved'));
            }
        } catch (error) {
            console.error('Save error:', error);
        }
        setSaving(false);
    };

    // Convert timestamp to seconds for YouTube URL
    const timestampToSeconds = (ts) => {
        if (!ts) return 0;
        const parts = ts.split(':').map(Number);
        if (parts.length === 3) {
            // HH:MM:SS format
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) {
            // MM:SS format
            return parts[0] * 60 + parts[1];
        }
        return parts[0] || 0;
    };

    // Format timestamp for display
    const formatTimestamp = (ts) => {
        if (!ts) return '';
        if (ts.startsWith('00:') && ts.length === 8) {
            return ts.substring(3);
        }
        return ts;
    };

    const handleOpenClick = () => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('lastOpenedClipId', clip._id);
        }
        setIsLastOpened(true);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('clipOpened'));
        }
    };

    const [idCopied, setIdCopied] = useState(false);

    const handleIdCopy = async () => {
        try {
            await navigator.clipboard.writeText(clip.clipNumber);
            setIdCopied(true);
            setTimeout(() => setIdCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy ID:', err);
        }
    };

    return (
        <div className="clip-card">
            <div className="clip-card-header">
                <div className="clip-header-left">
                    <span
                        className="clip-number"
                        onClick={handleIdCopy}
                        title="Click to copy ID"
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        {idCopied ? (
                            <span style={{ color: '#22c55e' }}>Copied!</span>
                        ) : (
                            <>Clip #{clip.clipNumber}</>
                        )}
                    </span>
                </div>
                <div className="clip-header-right">
                    <span className="clip-timestamp">
                        {formatTimestamp(clip.timestampStart)} - {formatTimestamp(clip.timestampEnd)}
                    </span>
                    <a
                        href={`${clip.videoUrl || ''}${clip.videoUrl?.includes('?') ? '&' : '?'}t=${timestampToSeconds(clip.timestampStart)}s`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost btn-open"
                        title={isLastOpened ? "Last Opened" : "Open in YouTube"}
                        onClick={handleOpenClick}
                        style={isLastOpened ? {
                            border: '1.5px solid #22c55e',
                            color: '#22c55e'
                        } : {}}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                        </svg>
                        Open
                    </a>
                </div>
            </div>

            <div className="clip-card-body">
                <h3 className="clip-title">{clip.title}</h3>

                <div className="clip-meta">
                    <span className="badge badge-category">{clip.category}</span>
                    {clip.suggestedLengthSeconds > 0 && (
                        <span className="badge badge-category">
                            {Math.floor(clip.suggestedLengthSeconds / 60)}:{String(clip.suggestedLengthSeconds % 60).padStart(2, '0')}s
                        </span>
                    )}
                </div>

                <p className="clip-summary">{clip.summary}</p>

                {clip.keyLine && (
                    <div className="clip-keyline">
                        "{clip.keyLine}"
                    </div>
                )}

                {clip.suggestedTitles && clip.suggestedTitles.length > 0 && (
                    <div className="clip-titles">
                        <strong>Suggested Titles:</strong>
                        <ul>
                            {clip.suggestedTitles.map((title, i) => (
                                <li key={i}>
                                    "{title}"
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

            </div>

            <div className="clip-card-footer">
                <div className="clip-inputs">
                    <div className="input-group" style={{ position: 'relative' }}>
                        <input
                            id={`title-${clip._id}`}
                            type="text"
                            placeholder="Enter clip title..."
                            value={customTitle}
                            onChange={(e) => handleTextChange(setCustomTitle, e.target.value)}
                            className="clip-input"
                        />
                        {textSaving && (
                            <div className="input-saving-indicator">
                                <div className="loading-spinner" style={{ width: '14px', height: '14px' }}></div>
                            </div>
                        )}
                    </div>
                    <div className="input-group" style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Thumbnail Text..."
                            value={thumbnailText}
                            onChange={(e) => handleTextChange(setThumbnailText, e.target.value.toUpperCase())}
                            className="clip-input"
                            style={{ textTransform: 'uppercase' }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                        className={`btn ${clip.isSaved ? 'saved' : ''}`}
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            background: clip.isSaved ? 'var(--bg-elevated)' : 'transparent',
                            border: '1px solid var(--border)',
                            color: clip.isSaved ? 'var(--accent)' : 'var(--text-muted)',
                            opacity: clip.isSaved ? 1 : 0.7
                        }}
                    >
                        {saving ? (
                            <span className="loading-spinner" style={{ width: '12px', height: '12px' }}></span>
                        ) : (
                            <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill={clip.isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                                </svg>
                                {clip.isSaved ? 'Saved' : 'Save'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div >
    );
}

export default ClipCard;
