import { useState, useEffect } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import ClipCard from '../components/ClipCard';
import { useSidebar } from '../context/SidebarContext';

function SavedClips() {
    const { collapsed } = useSidebar();
    const [loading, setLoading] = useState(true);
    const [clips, setClips] = useState([]);

    useEffect(() => {
        fetchSaved();
    }, []);

    const fetchSaved = async () => {
        try {
            const token = localStorage.getItem('token');
            console.log('Fetching saved clips with token:', !!token);
            const response = await axios.get('http://localhost:5000/api/clips/saved', {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Saved clips response:', response.data);
            // Sort by savedAt date descending (newest first)
            const clipsData = response.data.clips || [];
            const sortedClips = [...clipsData].sort((a, b) =>
                new Date(b.savedAt || b.updatedAt || 0) - new Date(a.savedAt || a.updatedAt || 0)
            );
            console.log('Setting clips:', sortedClips.length);
            setClips(sortedClips);
        } catch (error) {
            console.error('Fetch error:', error.response?.data || error.message);
        }
        setLoading(false);
    };

    const handleClipSaveToggle = (clipId) => {
        setClips(prev => prev.filter(clip => clip._id !== clipId));
    };

    return (
        <div className="app-container">
            <Sidebar />

            <main className={`main-content ${collapsed ? 'collapsed' : ''}`}>
                <div className="page-header">
                    <h1>Saved Clips</h1>
                    <p>Your collection of clips ready for editing</p>
                </div>

                {loading ? (
                    <div className="loading-card">
                        <div className="loading-spinner"></div>
                        <p>Loading saved clips...</p>
                    </div>
                ) : (
                    <>
                        {clips.length === 0 ? (
                            <div className="empty-state">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                                <h3>No saved clips yet</h3>
                                <p>Start analyzing videos and save clips you want to edit later</p>
                            </div>
                        ) : (
                            <section>
                                <div className="section-header">
                                    <h2>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" style={{ marginRight: '8px', verticalAlign: 'middle' }}>
                                            <circle cx="12" cy="12" r="10" />
                                            <circle cx="12" cy="12" r="6" />
                                            <circle cx="12" cy="12" r="2" />
                                        </svg>
                                        Individual Clips
                                        <span className="count">({clips.length})</span>
                                    </h2>
                                </div>
                                <div className="grid grid-2">
                                    {clips.map((clip) => (
                                        <ClipCard
                                            key={clip._id}
                                            clip={{ ...clip, videoUrl: clip.livestreamId?.url }}
                                            onSaveToggle={handleClipSaveToggle}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

export default SavedClips;
