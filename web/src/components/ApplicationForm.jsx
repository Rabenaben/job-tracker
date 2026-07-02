/**
 * Shared application form component used by AddApplicationModal and EditApplicationModal
 * Reduces ~80% duplicate code between the two modals
 */

export default function ApplicationForm({ form, onChange, error, submitting, isEditing = false }) {
    const inputClassName = "w-full bg-[#0a0a0a] border border-zinc-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 placeholder:text-zinc-600 transition-all";
    const labelClassName = "text-sm font-medium text-zinc-400";
    const fieldClassName = "space-y-2";

    return (
        <div className="space-y-4">
            {/* Error Toast */}
            {error && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm">{error}</span>
                </div>
            )}

            {/* Company & Role Row */}
            <div className="grid grid-cols-2 gap-4">
                <div className={fieldClassName}>
                    <label className={labelClassName}>Company</label>
                    <input
                        name="company"
                        placeholder="e.g. Google"
                        value={form.company}
                        onChange={onChange}
                        required
                        className={inputClassName}
                    />
                </div>
                <div className={fieldClassName}>
                    <label className={labelClassName}>Role</label>
                    <input
                        name="role"
                        placeholder="e.g. Frontend Dev"
                        value={form.role}
                        onChange={onChange}
                        required
                        className={inputClassName}
                    />
                </div>
            </div>

            {/* Job URL */}
            <div className={fieldClassName}>
                <label className={labelClassName}>Job URL</label>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-4 h-4 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                    </div>
                    <input
                        name="job_url"
                        placeholder="https://..."
                        value={form.job_url}
                        onChange={onChange}
                        className={`${inputClassName} pl-11`}
                    />
                </div>
            </div>

            {/* Salary & Date Row */}
            <div className="grid grid-cols-2 gap-4">
                <div className={fieldClassName}>
                    <label className={labelClassName}>Salary Range</label>
                    <input
                        name="salary_range"
                        placeholder="e.g. $80k - $120k"
                        value={form.salary_range}
                        onChange={onChange}
                        className={inputClassName}
                    />
                </div>
                <div className={fieldClassName}>
                    <label className={labelClassName}>Applied Date</label>
                    <input
                        type="date"
                        name="applied_at"
                        value={form.applied_at}
                        onChange={onChange}
                        required
                        className={`${inputClassName} [color-scheme:dark]`}
                    />
                </div>
            </div>

            {/* Notes */}
            <div className={fieldClassName}>
                <label className={labelClassName}>Notes</label>
                <textarea
                    name="notes"
                    placeholder="Add any additional details..."
                    value={form.notes}
                    onChange={onChange}
                    rows={3}
                    className={`${inputClassName} resize-none`}
                />
            </div>
        </div>
    );
}