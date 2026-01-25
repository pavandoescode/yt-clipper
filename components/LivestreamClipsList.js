"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import ClipCard from '@/components/ClipCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function LivestreamClipsList({ initialLivestream, initialClips, livestreamId }) {
    const router = useRouter();
    const [clips, setClips] = useState(initialClips || []);
    const [deleting, setDeleting] = useState(false);
    const [markingDone, setMarkingDone] = useState(false);

    const handleMarkDone = async () => {
        setMarkingDone(true);
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/channel/stream/${livestreamId}/done`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            router.push('/');
            router.refresh();
        } catch (error) {
            console.error('Mark done error:', error);
            alert('Failed to mark as done');
            setMarkingDone(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this livestream and all its clips?')) return;

        setDeleting(true);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/clips/livestream/${livestreamId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            router.push('/history');
            router.refresh();
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete livestream');
            setDeleting(false);
        }
    };

    const handleClipSaveToggle = (clipId) => {
        setClips(prev => prev.map(clip =>
            clip._id === clipId ? { ...clip, isSaved: !clip.isSaved } : clip
        ));
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

    if (!initialLivestream) {
        return (
            <div className="error-message">Livestream not found</div>
        )
    }

    return (
        <>
            <div className="page-header">
                <div className="detail-header-actions">
                    <Link href="/history" className="back-link">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                        </svg>
                        Back to History
                    </Link>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            className="btn btn-primary"
                            onClick={handleMarkDone}
                            disabled={markingDone || deleting}
                        >
                            {markingDone ? (
                                <div className="loading-spinner" style={{ width: '16px', height: '16px', borderTopColor: '#000000' }}></div>
                            ) : (
                                <>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                    Mark Done
                                </>
                            )}
                        </button>
                        <button
                            className="btn btn-ghost"
                            onClick={handleDelete}
                            disabled={deleting || markingDone}
                            style={{ color: 'var(--danger)' }}
                        >
                            {deleting ? (
                                <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>
                            ) : (
                                <>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        <line x1="10" y1="11" x2="10" y2="17"></line>
                                        <line x1="14" y1="11" x2="14" y2="17"></line>
                                    </svg>
                                    Delete
                                </>
                            )}
                        </button>
                    </div>
                </div>
                <h1>{initialLivestream ? (initialLivestream.videoTitle || initialLivestream.title) : 'Livestream Clips'}</h1>
                {initialLivestream && (
                    <p style={{ marginTop: '8px' }}>
                        <a
                            href={initialLivestream.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--accent)' }}
                        >
                            {initialLivestream.url}
                        </a>
                        <span style={{ color: 'var(--text-muted)', marginLeft: '16px' }}>
                            Analyzed {formatDate(initialLivestream.createdAt)}
                        </span>
                    </p>
                )}
            </div >

            {
                clips.length === 0 ? (
                    <div className="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                            <line x1="7" y1="2" x2="7" y2="22"></line>
                            <line x1="17" y1="2" x2="17" y2="22"></line>
                            <line x1="2" y1="12" x2="22" y2="12"></line>
                            <line x1="2" y1="7" x2="7" y2="7"></line>
                            <line x1="2" y1="17" x2="7" y2="17"></line>
                            <line x1="17" y1="17" x2="22" y2="17"></line>
                            <line x1="17" y1="7" x2="22" y2="7"></line>
                        </svg>
                        <h3>No clips found</h3>
                        <p>This livestream analysis may have failed or no clips were extracted</p>
                    </div>
                ) : (
                    <section>
                        <div className="section-header">
                            <h2>
                                🎯 Extracted Clips
                                <span className="count">({clips.length})</span>
                            </h2>
                        </div>
                        <div className="grid grid-2">
                            {clips.map((clip) => (
                                <ClipCard
                                    key={clip._id}
                                    clip={{ ...clip, videoUrl: initialLivestream?.url }}
                                    onSaveToggle={handleClipSaveToggle}
                                />
                            ))}
                        </div>
                    </section>
                )
            }
        </>
    );
}
