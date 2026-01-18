import { useState } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import ClipCard from '../components/ClipCard';
import { useSidebar } from '../context/SidebarContext';

function Dashboard() {
    const { collapsed } = useSidebar();
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);

    const handleAnalyze = async (e) => {
        e.preventDefault();
        if (!url.trim()) return;

        setLoading(true);
        setError('');
        setResult(null);

        try {
            const response = await axios.post('http://localhost:5000/api/clips/analyze', { url });
            setResult(response.data);
        } catch (error) {
            setError(error.response?.data?.message || 'Failed to analyze video. Please try again.');
        }
        setLoading(false);
    };

    const handleClipSaveToggle = (clipId) => {
        setResult(prev => ({
            ...prev,
            clips: prev.clips.map(clip =>
                clip._id === clipId ? { ...clip, isSaved: !clip.isSaved } : clip
            )
        }));
    };

    return (
        <div className="app-container">
            <Sidebar />

            <main className={`main-content ${collapsed ? 'collapsed' : ''}`}>
                <div className="page-header">
                    <h1>Dashboard</h1>
                    <p>Paste a YouTube livestream URL to extract viral clips</p>
                </div>

                {/* URL Input Section */}
                <div className="url-input-section">
                    <h2>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--accent)' }}>
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        Analyze Livestream
                    </h2>
                    <form onSubmit={handleAnalyze}>
                        <div className="url-input-wrapper">
                            <input
                                type="url"
                                className="input"
                                placeholder="Paste YouTube livestream URL... (e.g., https://www.youtube.com/watch?v=...)"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                required
                            />
                            <button type="submit" className="btn btn-primary" disabled={loading}>
                                {loading ? (
                                    'Analyzing...'
                                ) : (
                                    <>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="11" cy="11" r="8" />
                                            <path d="M21 21l-4.35-4.35" />
                                        </svg>
                                        Analyze
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Error Message */}
                {error && (
                    <div style={{
                        backgroundColor: 'rgba(255, 68, 68, 0.1)',
                        border: '1px solid #ff4444',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '24px',
                        color: '#ff4444'
                    }}>
                        {error}
                    </div>
                )}

                {/* Loading State */}
                {loading && (
                    <div className="loading-card">
                        <div className="loading-spinner" style={{ width: '40px', height: '40px' }}></div>
                        <p>Analyzing video with AI... This may take a minute.</p>
                    </div>
                )}

                {/* Results */}
                {result && (
                    <>
                        {/* Individual Clips */}
                        <section>
                            <div className="section-header">
                                <h2>
                                    🎯 Individual Clips
                                    <span className="count">({result.clips.length})</span>
                                </h2>
                            </div>
                            <div className="grid grid-2">
                                {result.clips.map((clip) => (
                                    <ClipCard
                                        key={clip._id}
                                        clip={{ ...clip, videoUrl: url }}
                                        onSaveToggle={handleClipSaveToggle}
                                    />
                                ))}
                            </div>
                        </section>
                    </>
                )}

                {/* Empty State */}
                {!loading && !result && !error && (
                    <div className="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <h3>Ready to extract clips</h3>
                        <p>Paste a YouTube livestream URL above to get started</p>
                    </div>
                )}
            </main>
        </div>
    );
}

export default Dashboard;

