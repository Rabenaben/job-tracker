import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api',
});

let networkErrorCallback = null;

export const setNetworkErrorHandler = (callback) => {
    networkErrorCallback = callback;
};

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            // Redirect to login if not already there
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        // Network errors (no response, connection refused, etc.)
        if (!error.response && networkErrorCallback) {
            networkErrorCallback();
        }
        return Promise.reject(error);
    }
);

export default api;