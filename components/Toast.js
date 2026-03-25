"use client";

import { useEffect } from 'react';

export default function Toast({ message, type = 'success', isVisible, onClose, duration = 4000 }) {
    useEffect(() => {
        if (isVisible) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    if (!isVisible) return null;

    return (
        <div className={`toast-container ${type}`}>
            <div className="toast-icon">
                {type === 'success' ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                )}
            </div>
            <div className="toast-message">
                {message.split('\n').map((line, i) => (
                    <div key={i}>{line}</div>
                ))}
            </div>
            <button className="toast-close" onClick={onClose}>&times;</button>

            <style jsx>{`
                .toast-container {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    min-width: 300px;
                    max-width: 450px;
                    background: #1a1a1a;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 12px;
                    padding: 16px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
                    z-index: 2000;
                    animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }

                .toast-icon {
                    flex-shrink: 0;
                    width: 32px;
                    height: 32px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                }

                .toast-container.success .toast-icon {
                    background: rgba(34, 197, 94, 0.2);
                    color: #22c55e;
                }

                .toast-container.error .toast-icon {
                    background: rgba(239, 68, 68, 0.2);
                    color: #ef4444;
                }

                .toast-message {
                    flex: 1;
                    font-size: 14px;
                    font-weight: 500;
                    color: var(--text-primary);
                    line-height: 1.4;
                }

                .toast-close {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    font-size: 20px;
                    cursor: pointer;
                    padding: 4px;
                    transition: color 0.2s;
                }

                .toast-close:hover {
                    color: var(--text-primary);
                }
            `}</style>
        </div>
    );
}
