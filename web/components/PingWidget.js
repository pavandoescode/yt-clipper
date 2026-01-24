"use client";

import { useState, useEffect } from 'react';

export default function PingWidget() {
    const [pingMs, setPingMs] = useState(null);

    // Measure ping to google.com
    useEffect(() => {
        const measurePing = async () => {
            try {
                const start = performance.now();
                await fetch('https://www.google.com/favicon.ico', {
                    mode: 'no-cors',
                    cache: 'no-store'
                });
                const end = performance.now();
                setPingMs(Math.round(end - start));
            } catch (error) {
                setPingMs(null);
            }
        };

        measurePing();
        const interval = setInterval(measurePing, 10000); // Update every 10 seconds

        return () => clearInterval(interval);
    }, []);

    return (
        <a
            href="https://google.com"
            target="_blank"
            rel="noopener noreferrer"
            title="Ping to Google"
            style={{
                position: 'fixed',
                top: '12px',
                right: '12px',
                zIndex: 9999,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: '#1a1a1a',
                border: '1px solid #333',
                cursor: 'pointer',
                textDecoration: 'none'
            }}
        >
            <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#666',
                animation: 'ping 2s infinite'
            }} />
            <span style={{
                fontSize: '12px',
                color: '#888',
                fontWeight: '400'
            }}>
                {pingMs !== null ? `${pingMs}ms` : '...'}
            </span>
            <style jsx>{`
                @keyframes ping {
                    0% { box-shadow: 0 0 0 0 rgba(102, 102, 102, 0.5); }
                    70% { box-shadow: 0 0 0 4px rgba(102, 102, 102, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(102, 102, 102, 0); }
                }
            `}</style>
        </a>
    );
}
