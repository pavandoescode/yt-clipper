"use client";

import { createContext, useContext, useState, useCallback } from 'react';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';

const UIContext = createContext();

export function UIProvider({ children }) {
    const [toast, setToast] = useState({ isVisible: false, message: '', type: 'success' });
    const [modal, setModal] = useState({ 
        isOpen: false, 
        title: '', 
        message: '', 
        onConfirm: null, 
        type: 'danger' 
    });

    const showToast = useCallback((message, type = 'success') => {
        setToast({ isVisible: true, message, type });
    }, []);

    const hideToast = useCallback(() => {
        setToast(prev => ({ ...prev, isVisible: false }));
    }, []);

    const showConfirm = useCallback(({ title, message, onConfirm, type = 'danger' }) => {
        setModal({ isOpen: true, title, message, onConfirm, type });
    }, []);

    const closeConfirm = useCallback(() => {
        setModal(prev => ({ ...prev, isOpen: false }));
    }, []);

    const handleConfirm = useCallback(() => {
        if (modal.onConfirm) {
            modal.onConfirm();
        }
        closeConfirm();
    }, [modal.onConfirm, closeConfirm]);

    return (
        <UIContext.Provider value={{ showToast, showConfirm }}>
            {children}
            <Toast 
                isVisible={toast.isVisible} 
                message={toast.message} 
                type={toast.type} 
                onClose={hideToast} 
            />
            <Modal 
                isOpen={modal.isOpen}
                onClose={closeConfirm}
                onConfirm={handleConfirm}
                title={modal.title}
                message={modal.message}
                type={modal.type}
            />
        </UIContext.Provider>
    );
}

export const useUI = () => {
    const context = useContext(UIContext);
    if (!context) {
        throw new Error('useUI must be used within a UIProvider');
    }
    return context;
};
