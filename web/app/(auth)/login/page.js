"use client";

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
    const [pin, setPin] = useState(['', '', '', '']);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, user } = useAuth();
    const router = useRouter();
    const inputRefs = [useRef(), useRef(), useRef(), useRef()];

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            router.push('/');
        }
    }, [user, router]);

    const handleChange = (index, value) => {
        // Only allow numbers
        if (value && !/^\d$/.test(value)) return;

        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);

        // Auto-focus next input
        if (value && index < 3) {
            inputRefs[index + 1].current?.focus();
        }

        // Auto-submit when all 4 digits entered
        if (value && index === 3 && newPin.every(d => d !== '')) {
            handleSubmit(null, newPin.join(''));
        }
    };

    const handleKeyDown = (index, e) => {
        // Handle backspace
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            inputRefs[index - 1].current?.focus();
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').slice(0, 4);
        if (/^\d+$/.test(pastedData)) {
            const newPin = [...pin];
            pastedData.split('').forEach((char, i) => {
                if (i < 4) newPin[i] = char;
            });
            setPin(newPin);
            if (newPin.every(d => d !== '')) {
                handleSubmit(null, newPin.join(''));
            }
        }
    };

    const handleSubmit = async (e, pinValue) => {
        if (e) e.preventDefault();
        const fullPin = pinValue || pin.join('');
        if (fullPin.length !== 4) return;

        setError('');
        setLoading(true);

        const result = await login(fullPin);

        if (!result.success) {
            setError(result.message);
            setPin(['', '', '', '']);
            inputRefs[0].current?.focus();
            setLoading(false);
        } else {
            // Login successful
            router.push('/');
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="logo">
                    <svg viewBox="0 0 122.88 86.43" fill="currentColor">
                        <path d="M121.63,18.65s-1.2-8.47-4.9-12.19c-4.67-4.89-9.91-4.92-12.31-5.21C87.24,0,61.43,0,61.43,0h0s-25.8,0-43,1.25c-2.4.29-7.63.31-12.31,5.21C2.4,10.18,1.22,18.65,1.22,18.65A187.15,187.15,0,0,0,0,38.55v9.31a187.65,187.65,0,0,0,1.22,19.9S2.42,76.23,6.09,80c4.68,4.9,10.82,4.74,13.57,5.26,9.83.94,41.78,1.22,41.78,1.22s25.83,0,43-1.27c2.41-.29,7.64-.32,12.32-5.21,3.69-3.72,4.89-12.2,4.89-12.2a187.15,187.15,0,0,0,1.22-19.9V38.54a189.26,189.26,0,0,0-1.25-19.9Z" />
                        <polygon fill="#000000" points="48.71 59.16 48.71 24.63 81.9 41.95 48.71 59.16 48.71 59.16" />
                    </svg>
                    <span>YT Clipper</span>
                </div>

                <h1>Enter PIN</h1>
                <p className="subtitle">Enter your 4-digit PIN to continue</p>

                {error && (
                    <div style={{
                        backgroundColor: 'rgba(255, 68, 68, 0.1)',
                        border: '1px solid #ff4444',
                        borderRadius: '8px',
                        padding: '12px',
                        marginBottom: '20px',
                        color: '#ff4444',
                        fontSize: '14px'
                    }}>
                        {error}
                    </div>
                )}

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        justifyContent: 'center',
                        marginBottom: '24px'
                    }}>
                        {pin.map((digit, index) => (
                            <input
                                key={index}
                                ref={inputRefs[index]}
                                type="password"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={index === 0 ? handlePaste : undefined}
                                autoFocus={index === 0}
                                style={{
                                    width: '56px',
                                    height: '64px',
                                    textAlign: 'center',
                                    fontSize: '28px',
                                    fontWeight: '600',
                                    borderRadius: '12px',
                                    border: '2px solid var(--border)',
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                                onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                            />
                        ))}
                    </div>

                    <button type="submit" className="btn btn-primary" disabled={loading || pin.some(d => d === '')}>
                        {loading ? <span className="loading-spinner"></span> : 'Unlock'}
                    </button>
                </form>
            </div>
        </div>
    );
}
