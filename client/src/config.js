// Centralized API configuration
// In development, defaults to localhost. In production, uses VITE_API_URL env variable.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const API_BASE = `${API_URL}/api`;
