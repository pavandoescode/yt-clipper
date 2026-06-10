"use client";

export default function Modal({ isOpen, onClose, onConfirm, title, message, type = 'danger' }) {
    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="modal-close" onClick={onClose}>&times;</button>
                </div>
                <div className="modal-body">
                    <p>{message}</p>
                </div>
                <div className="modal-footer">
                    <button className="btn-cancel" onClick={onClose}>Cancel</button>
                    <button 
                        className={`btn-confirm ${type}`} 
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {type === 'danger' ? 'Delete' : 'Confirm'}
                    </button>
                </div>
            </div>

            <style jsx>{`
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.7);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                    animation: fadeIn 0.2s ease-out;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .modal-content {
                    background: #1a1a1a;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 16px;
                    width: 90%;
                    max-width: 400px;
                    padding: 24px;
                    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }

                @keyframes slideUp {
                    from { transform: translateY(20px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .modal-header h2 {
                    margin: 0;
                    font-size: 18px;
                    font-weight: 700;
                    color: var(--text-primary);
                }

                .modal-close {
                    background: none;
                    border: none;
                    color: var(--text-muted);
                    font-size: 24px;
                    cursor: pointer;
                    line-height: 1;
                    padding: 4px;
                }

                .modal-body p {
                    margin: 0;
                    font-size: 14px;
                    color: var(--text-secondary);
                    line-height: 1.6;
                }

                .modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 12px;
                    margin-top: 24px;
                }

                .btn-cancel {
                    background: transparent;
                    border: 1px solid var(--border);
                    color: var(--text-primary);
                    padding: 8px 16px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-cancel:hover {
                    background: rgba(255, 255, 255, 0.05);
                }

                .btn-confirm {
                    border: none;
                    padding: 8px 20px;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .btn-confirm.danger {
                    background: #ef4444;
                    color: white;
                }

                .btn-confirm.danger:hover {
                    background: #dc2626;
                }

                .btn-confirm.success {
                    background: #22c55e;
                    color: white;
                }
            `}</style>
        </div>
    );
}
