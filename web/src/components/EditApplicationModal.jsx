import { useState, useEffect } from 'react';
import api from '../api/axios';
import ApplicationForm from './ApplicationForm';

export default function EditApplicationModal({ application, onClose, onUpdated, onDeleted }) {
    const [form, setForm] = useState(null);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        if (application) {
            const initialForm = {
                company: application.company,
                role: application.role,
                job_url: application.job_url || '',
                salary_range: application.salary_range || '',
                notes: application.notes || '',
                applied_at: application.applied_at,
            };
            setForm(initialForm);
            setIsDirty(false);
        }
    }, [application]);

    // Track if form has been modified
    useEffect(() => {
        if (form && application) {
            setIsDirty(
                form.company !== application.company ||
                form.role !== application.role ||
                (form.job_url || '') !== (application.job_url || '') ||
                (form.salary_range || '') !== (application.salary_range || '') ||
                (form.notes || '') !== (application.notes || '') ||
                form.applied_at !== application.applied_at
            );
        }
    }, [form, application]);

    if (!application || !form) return null;

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleClose = () => {
        if (isDirty && !confirm('You have unsaved changes. Are you sure you want to close?')) {
            return;
        }
        onClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);
        try {
            const res = await api.patch(`/applications/${application.id}`, form);
            onUpdated(res.data);
            onClose();
        } catch (err) {
            setError('Failed to update application.');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete application for ${application.company}?`)) return;
        setDeleting(true);
        try {
            await api.delete(`/applications/${application.id}`);
            onDeleted(application.id);
            onClose();
        } catch (err) {
            setError('Failed to delete application.');
            console.error(err);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md bg-[#141414] border border-zinc-800 rounded-2xl shadow-2xl shadow-red-900/10 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-zinc-600 to-zinc-700">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Edit Application</h2>
                            <p className="text-sm text-zinc-500">Update job details</p>
                        </div>
                    </div>
                    <button
                        onClick={handleClose}
                        className="flex items-center justify-center w-8 h-8 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <ApplicationForm
                        form={form}
                        onChange={handleChange}
                        error={error}
                        submitting={submitting}
                        isEditing={true}
                    />

                    {/* Actions */}
                    <div className="flex items-center justify-between gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleting}
                            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-red-500/30 text-red-500 font-medium hover:bg-red-500/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {deleting ? (
                                <>
                                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                    Delete
                                </>
                            )}
                        </button>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-4 py-3 rounded-xl border border-zinc-800 text-zinc-400 font-medium hover:bg-zinc-800 hover:text-white transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-lg shadow-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                {submitting ? (
                                    <>
                                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}