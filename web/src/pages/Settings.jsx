import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { gmailApi } from '../api/gmail';

export default function Settings() {
    const { user, logout } = useAuth();
    const [gmailStatus, setGmailStatus] = useState(null);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [syncResult, setSyncResult] = useState(null);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    // Check if redirected from OAuth with success
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('gmail') === 'connected') {
            setShowSuccessToast(true);
            // Clear the URL param
            window.history.replaceState({}, '', '/settings');
            // Refresh status
            fetchGmailStatus();
        }
    }, []);

    // Show success toast
    useEffect(() => {
        if (showSuccessToast) {
            const timer = setTimeout(() => setShowSuccessToast(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [showSuccessToast]);

    useEffect(() => {
        fetchGmailStatus();
    }, []);

    const fetchGmailStatus = async () => {
        try {
            const res = await gmailApi.getStatus();
            setGmailStatus(res.data);
        } catch (err) {
            console.error('Failed to fetch Gmail status:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleConnectGmail = async () => {
        try {
            const res = await gmailApi.initiate();
            // Redirect browser to Google OAuth URL
            // This is a full page navigation, not XMLHttpRequest, so no CORS issues
            window.location.href = res.data.oauth_url;
        } catch (err) {
            console.error('Failed to initiate Gmail connection:', err);
        }
    };

    const handleDisconnectGmail = async () => {
        if (!confirm('Disconnect Gmail? Your stored emails will remain but won\'t sync automatically.')) {
            return;
        }
        try {
            await gmailApi.disconnect();
            await fetchGmailStatus();
        } catch (err) {
            console.error('Failed to disconnect Gmail:', err);
        }
    };

    const handleSyncNow = async () => {
        setSyncing(true);
        setSyncResult(null);
        try {
            const res = await gmailApi.sync();
            setSyncResult(res.data.summary);
        } catch (err) {
            setSyncResult({ error: err.response?.data?.error || 'Sync failed' });
        } finally {
            setSyncing(false);
        }
    };

    const handleFrequencyChange = async (frequency) => {
        try {
            await gmailApi.updateSyncFrequency(frequency);
            await fetchGmailStatus();
        } catch (err) {
            console.error('Failed to update sync frequency:', err);
        }
    };

    const formatDate = (isoString) => {
        if (!isoString) return 'Never';
        return new Date(isoString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="max-w-2xl mx-auto p-6">
            {/* Toast notification */}
            {showSuccessToast && (
                <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-in z-50">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Gmail connected successfully!
                </div>
            )}

            {/* Header with back button */}
            <div className="flex items-center gap-4 mb-6">
                <Link
                    to="/"
                    className="flex items-center justify-center w-10 h-10 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
                    title="Back to Board"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </Link>
                <h1 className="text-2xl font-bold text-white">Settings</h1>
            </div>

            {/* Account Section */}
            <div className="bg-[#1a1a1a] rounded-xl border border-zinc-800 p-6 mb-6">
                <h2 className="text-lg font-semibold text-white mb-4">Account</h2>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-zinc-400 text-sm">Username</p>
                        <p className="text-white font-medium">{user?.username}</p>
                    </div>
                    <button
                        onClick={logout}
                        className="px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors text-sm"
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* Gmail Integration Section */}
            <div className="bg-[#1a1a1a] rounded-xl border border-zinc-800 p-6 mb-6">
                <div className="flex items-start gap-3 mb-4">
                    <img
                        src="https://www.gstatic.com/firebasejs/staging-prod/apps/platform/web/images/gmail_64dp.png"
                        alt="Gmail"
                        className="w-10 h-10 rounded-lg"
                        onError={(e) => e.target.style.display = 'none'}
                    />
                    <div>
                        <h2 className="text-lg font-semibold text-white">Gmail Integration</h2>
                        <p className="text-zinc-400 text-sm">Import job applications automatically from your inbox</p>
                    </div>
                </div>

                {loading ? (
                    <div className="animate-pulse space-y-3">
                        <div className="h-10 bg-zinc-800 rounded-lg w-full"></div>
                        <div className="h-6 bg-zinc-800 rounded w-1/2"></div>
                    </div>
                ) : gmailStatus?.connected ? (
                    <div className="space-y-4">
                        {/* Connected status */}
                        <div className="flex items-center gap-2 text-green-400">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium">Connected</span>
                            <span className="text-zinc-500 text-sm">
                                Since {formatDate(gmailStatus.connected_at)}
                            </span>
                        </div>

                        {/* Sync controls */}
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={handleSyncNow}
                                disabled={syncing}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                            >
                                {syncing ? (
                                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                    </svg>
                                ) : (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                )}
                                {syncing ? 'Syncing...' : 'Sync Now'}
                            </button>

                            <button
                                onClick={handleDisconnectGmail}
                                className="px-4 py-3 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors text-sm"
                            >
                                Disconnect
                            </button>
                        </div>

                        {/* Sync result */}
                        {syncResult && (
                            <div className={`p-3 rounded-lg text-sm ${syncResult.error ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                                {syncResult.error ? (
                                    <p>{syncResult.error}</p>
                                ) : (
                                    <p>Synced! New: {syncResult.new}, Duplicates: {syncResult.duplicates}, Errors: {syncResult.errors}</p>
                                )}
                            </div>
                        )}

                        {/* Auto-sync settings */}
                        <div className="border-t border-zinc-800 pt-4">
                            <p className="text-zinc-400 text-sm mb-2">Auto-sync frequency</p>
                            <div className="flex gap-2">
                                {['disabled', 'daily', 'weekly'].map((freq) => (
                                    <button
                                        key={freq}
                                        onClick={() => handleFrequencyChange(freq)}
                                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                                            gmailStatus.sync_frequency === freq
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                        }`}
                                    >
                                        {freq.charAt(0).toUpperCase() + freq.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <p className="text-zinc-400 text-sm">
                            Connect your Gmail to automatically import job application emails from LinkedIn, Indeed, and other job boards.
                        </p>
                        <button
                            onClick={handleConnectGmail}
                            className="flex items-center gap-2 px-6 py-3 bg-white text-zinc-900 font-medium rounded-lg hover:bg-zinc-200 transition-colors"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                            </svg>
                            Connect Google Account
                        </button>
                    </div>
                )}
            </div>

            {/* About section */}
            <div className="bg-[#1a1a1a] rounded-xl border border-zinc-800 p-6">
                <h2 className="text-lg font-semibold text-white mb-2">About</h2>
                <p className="text-zinc-400 text-sm">Job Tracker with Gmail Integration</p>
                <p className="text-zinc-500 text-xs mt-1">Version 1.0.0</p>
            </div>
        </div>
    );
}