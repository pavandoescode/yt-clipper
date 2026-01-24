"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';
import ClipCard from '@/components/ClipCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function LivestreamDetailsPage() {
    const params = useParams(); // params might be a Promise in newer Next.js versions, but in 14 it's hook
    // Unwrap params just in case (safe pattern for future)
    const id = params?.id;

    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [livestream, setLivestream] = useState(null);
    const [clips, setClips] = useState([]);
    const [error, setError] = useState('');
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (id) fetchLivestreamClips();
    }, [id]);

    const fetchLivestreamClips = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${API_URL}/clips/livestream/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLivestream(response.data.livestream);
            setClips(response.data.clips);
        } catch (error) {
            setError('Failed to load livestream clips');
            console.error('Fetch error:', error);
        }
        setLoading(false);
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/clips/livestream/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            router.push('/history');
        } catch (error) {
            console.error('Delete error:', error);
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

    return (
        <>
            <div className="page-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <Link href="/history" style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: 'var(--text-secondary)',
                        fontSize: '14px'
                    }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
                        </svg>
                        Back to History
                    </Link>
                    <button
                        className="btn btn-ghost"
                        onClick={handleDelete}
                        disabled={deleting}
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
                <h1>Livestream Clips</h1>
                {livestream && (
                    <p style={{ marginTop: '8px' }}>
                        <a
                            href={livestream.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--accent)' }}
                        >
                            {livestream.url}
                        </a>
                        <span style={{ color: 'var(--text-muted)', marginLeft: '16px' }}>
                            Analyzed {formatDate(livestream.createdAt)}
                        </span>
                    </p>
                )}
            </div>

            {loading ? (
                <div className="loading-card">
                    <div className="loading-spinner"></div>
                    <p>Loading clips...</p>
                </div>
            ) : error ? (
                <div className="error-message">{error}</div>
            ) : clips.length === 0 ? (
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
                                clip={{ ...clip, videoUrl: livestream?.url }}
                                onSaveToggle={handleClipSaveToggle}
                            />
                        ))}
                    </div>
                </section>
            )}
        </>
    );
}
