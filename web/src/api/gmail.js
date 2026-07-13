import api from '../api/axios';

export const gmailApi = {
    // Check Gmail connection status
    getStatus: () => api.get('/auth/google/status'),

    // Initiate OAuth flow (redirects to Google)
    initiate: () => api.get('/auth/google'),

    // Disconnect Gmail
    disconnect: () => api.delete('/auth/google/disconnect'),

    // Update sync frequency
    updateSyncFrequency: (frequency) =>
        api.patch('/auth/google/sync-frequency', { frequency }),

    // Trigger Gmail sync
    sync: () => api.post('/applications/sync/gmail'),
};