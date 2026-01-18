// API Configuration
// In production, API calls go to same origin (since frontend is served by backend)
// In development, API calls go to localhost:5000

const isProduction = import.meta.env.PROD;

export const API_URL = isProduction
    ? '' // Same origin in production
    : 'http://localhost:5000';

export const getApiUrl = (endpoint) => `${API_URL}${endpoint}`;
