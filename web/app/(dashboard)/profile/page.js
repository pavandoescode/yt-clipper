"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export default function ProfilePage() {
    const { user, logout } = useAuth();
    const router = useRouter();

    const [showPinChange, setShowPinChange] = useState(false);
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [pinError, setPinError] = useState('');
    const [pinSuccess, setPinSuccess] = useState('');
    const [pinLoading, setPinLoading] = useState(false);


    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    const handleChangePin = async (e) => {
        e.preventDefault();
        setPinError('');
        setPinSuccess('');

        if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
            setPinError('PIN must be exactly 4 digits');
            return;
        }

        setPinLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`${API_URL}/auth/change-pin`,
                { currentPin, newPin },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setPinSuccess('PIN changed! Redirecting to login...');
            setTimeout(() => {
                logout();
                router.push('/login');
            }, 1500);
        } catch (error) {
            setPinError(error.response?.data?.message || 'Failed to change PIN');
        } finally {
            setPinLoading(false);
        }
    };

    return (
        <>
            <div className="page-header">
                <h1>Profile</h1>
                <p className="page-subtitle">Manage your account settings</p>
            </div>

            <div className="profile-grid">
                {/* User Info Card */}
                <div className="card profile-card">
                    <div className="profile-user">
                        <div className="profile-avatar">U</div>
                        <div className="profile-info">
                            <h2>User</h2>
                            <p>{user?.email || 'admin@ytclipper.local'}</p>
                            <span className="badge badge-category">Administrator</span>
                        </div>
                    </div>
                </div>


                {/* Security Card */}
                <div className="card">
                    <h3 className="card-section-title">Security</h3>

                    <div
                        className="profile-option"
                        onClick={() => setShowPinChange(!showPinChange)}
                    >
                        <div className="profile-option-header">
                            <div className="profile-option-icon">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                                </svg>
                            </div>
                            <div className="profile-option-text">
                                <p className="profile-option-title">Change PIN</p>
                                <p className="profile-option-desc">Update your 4-digit PIN</p>
                            </div>
                            <span className="profile-option-arrow">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12" style={{ transform: showPinChange ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                                </svg>
                            </span>
                        </div>

                        {showPinChange && (
                            <form onSubmit={handleChangePin} onClick={e => e.stopPropagation()} className="pin-form">
                                {pinError && <div className="pin-error">{pinError}</div>}
                                {pinSuccess && <div className="pin-success">{pinSuccess}</div>}
                                <input
                                    type="password"
                                    placeholder="Current PIN"
                                    value={currentPin}
                                    onChange={e => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    maxLength={4}
                                    className="pin-input"
                                />
                                <input
                                    type="password"
                                    placeholder="New PIN"
                                    value={newPin}
                                    onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                    maxLength={4}
                                    className="pin-input"
                                />
                                <button type="submit" disabled={pinLoading} className="btn btn-primary pin-submit">
                                    {pinLoading ? 'Changing...' : 'Change PIN'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>

                {/* Logout Button */}
                <button className="btn logout-btn" onClick={handleLogout}>
                    Logout
                </button>
            </div>

            <style jsx>{`
                .profile-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                    max-width: 900px;
                }
                
                .profile-card, .logout-btn {
                    grid-column: 1 / -1;
                }
                
                @media (max-width: 800px) {
                    .profile-grid {
                        grid-template-columns: 1fr;
                    }
                }
                
                .profile-card {
                    padding: 24px;
                }
                
                .profile-user {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                }
                
                .profile-avatar {
                    width: 72px;
                    height: 72px;
                    border-radius: 50%;
                    background: var(--text-primary);
                    color: var(--bg-primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 28px;
                    font-weight: 600;
                    flex-shrink: 0;
                }
                
                .profile-info h2 {
                    margin: 0 0 4px;
                    font-size: 20px;
                    font-weight: 600;
                }
                
                .profile-info p {
                    margin: 0 0 10px;
                    color: var(--text-secondary);
                    font-size: 14px;
                }
                
                .card-section-title {
                    font-size: 11px;
                    color: var(--text-muted);
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin: 0 0 14px;
                    font-weight: 500;
                }
                
                .profile-option {
                    padding: 14px;
                    background: var(--bg-hover);
                    border-radius: 10px;
                    cursor: pointer;
                    transition: var(--transition);
                }
                
                .profile-option:hover {
                    background: var(--bg-secondary);
                }
                
                .profile-option-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .profile-option-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 8px;
                    background: var(--bg-primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .profile-option-text {
                    flex: 1;
                }
                
                .profile-option-title {
                    margin: 0;
                    font-weight: 500;
                    font-size: 14px;
                }
                
                .profile-option-desc {
                    margin: 2px 0 0;
                    font-size: 12px;
                    color: var(--text-secondary);
                }
                
                .profile-option-arrow {
                    color: var(--text-muted);
                }
                
                .pin-form {
                    margin-top: 14px;
                    padding-top: 14px;
                    border-top: 1px solid var(--border);
                }
                
                .pin-input {
                    width: 100%;
                    padding: 10px 12px;
                    margin-bottom: 10px;
                    background: var(--bg-primary);
                    border: 1px solid var(--border);
                    border-radius: 8px;
                    color: var(--text-primary);
                    font-size: 14px;
                    outline: none;
                    transition: var(--transition);
                }
                
                .pin-input:focus {
                    border-color: var(--accent);
                }
                
                .pin-input::placeholder {
                    color: var(--text-muted);
                }
                
                .pin-submit {
                    width: 100%;
                    margin-top: 4px;
                }
                
                .pin-error {
                    padding: 10px 12px;
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    border-radius: 8px;
                    color: #ef4444;
                    font-size: 13px;
                    margin-bottom: 12px;
                }
                
                .pin-success {
                    padding: 10px 12px;
                    background: rgba(34, 197, 94, 0.1);
                    border: 1px solid rgba(34, 197, 94, 0.2);
                    border-radius: 8px;
                    color: #22c55e;
                    font-size: 13px;
                    margin-bottom: 12px;
                }
                
                .logout-btn {
                    width: 100%;
                    justify-content: center;
                    background: transparent;
                    color: #ef4444;
                    border: 1px solid rgba(239, 68, 68, 0.3);
                }
                
                .logout-btn:hover {
                    background: rgba(239, 68, 68, 0.1);
                }
                
            `}</style>
        </>
    );
}
