import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            fetchUser();
        } else {
            setLoading(false);
        }
    }, [token]);

    const fetchUser = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/auth/me`);
            setUser(response.data.user);
        } catch (error) {
            console.error('Auth error:', error);
            logout();
        } finally {
            setLoading(false);
        }
    };

    const login = async (pin) => {
        try {
            const response = await axios.post(`${API_URL}/api/auth/login`, { pin });
            const { token: newToken, user: userData } = response.data;

            localStorage.setItem('token', newToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
            setToken(newToken);
            setUser(userData);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Invalid PIN'
            };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
