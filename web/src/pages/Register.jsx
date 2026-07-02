import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
    const { user, loading: authLoading, register } = useAuth();
    const navigate = useNavigate();

    // Redirect if already logged in
    useEffect(() => {
        if (!authLoading && user) {
            navigate('/');
        }
    }, [user, authLoading, navigate]);

    const [form, setForm] = useState({
        username: '',
        password: '',
        password_confirmation: '',
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [apiError, setApiError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        // Clear field error on change
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!form.username.trim()) {
            newErrors.username = 'Username is required';
        }

        if (form.password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
        }

        if (form.password !== form.password_confirmation) {
            newErrors.password_confirmation = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setApiError('');

        if (!validate()) return;

        setSubmitting(true);
        try {
            await register(form.username, form.password);
            navigate('/');
        } catch (err) {
            if (err.response?.status === 422) {
                // Laravel validation errors
                const serverErrors = err.response.data.errors;
                if (serverErrors) {
                    setErrors({
                        username: serverErrors.username?.[0] || '',
                        password: serverErrors.password?.[0] || '',
                    });
                } else {
                    setApiError(err.response.data.message || 'Registration failed');
                }
            } else {
                setApiError('Registration failed. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-900/30 mb-4">
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Create Account</h1>
                    <p className="text-zinc-500">Start tracking your job applications</p>
                </div>

                {/* Form Card */}
                <div className="bg-[#141414] border border-zinc-800 rounded-2xl p-6 shadow-xl">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* API Error */}
                        {apiError && (
                            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {apiError}
                            </div>
                        )}

                        {/* Username */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Username</label>
                            <input
                                type="text"
                                name="username"
                                value={form.username}
                                onChange={handleChange}
                                className={`w-full bg-[#0a0a0a] border ${errors.username ? 'border-red-500' : 'border-zinc-800'} text-white px-4 py-3 rounded-xl focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 placeholder:text-zinc-600 transition-all`}
                                placeholder="Choose a username"
                            />
                            {errors.username && (
                                <p className="text-sm text-red-400">{errors.username}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Password</label>
                            <input
                                type="password"
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                className={`w-full bg-[#0a0a0a] border ${errors.password ? 'border-red-500' : 'border-zinc-800'} text-white px-4 py-3 rounded-xl focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 placeholder:text-zinc-600 transition-all`}
                                placeholder="Create a password"
                            />
                            {errors.password && (
                                <p className="text-sm text-red-400">{errors.password}</p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Confirm Password</label>
                            <input
                                type="password"
                                name="password_confirmation"
                                value={form.password_confirmation}
                                onChange={handleChange}
                                className={`w-full bg-[#0a0a0a] border ${errors.password_confirmation ? 'border-red-500' : 'border-zinc-800'} text-white px-4 py-3 rounded-xl focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 placeholder:text-zinc-600 transition-all`}
                                placeholder="Confirm your password"
                            />
                            {errors.password_confirmation && (
                                <p className="text-sm text-red-400">{errors.password_confirmation}</p>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-lg shadow-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
                        >
                            {submitting ? (
                                <>
                                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Creating account...
                                </>
                            ) : (
                                'Create Account'
                            )}
                        </button>
                    </form>

                    {/* Login Link */}
                    <p className="text-center text-sm text-zinc-500 mt-6">
                        Already have an account?{' '}
                        <Link to="/login" className="text-red-400 hover:text-red-300 font-medium">
                            Log in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}