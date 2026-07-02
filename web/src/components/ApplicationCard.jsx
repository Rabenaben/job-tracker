import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function ApplicationCard({ application, onClick }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: application.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    // Format date
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
    };

    // Get company initial for avatar (safely handles null/undefined/empty)
    const getInitial = (company) => {
        if (!company || typeof company !== 'string' || company.trim() === '') {
            return '?';
        }
        return company.charAt(0).toUpperCase();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (!isDragging) onClick(application);
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            role="button"
            tabIndex={0}
            onClick={() => !isDragging && onClick(application)}
            onKeyDown={handleKeyDown}
            aria-label={`View details for ${application.company} - ${application.role}`}
            className={`group bg-[#141414] rounded-xl p-4 border border-zinc-800/50 cursor-grab active:cursor-grabbing transition-all duration-200 hover:border-zinc-700 hover:bg-[#1a1a1a] focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-[#0a0a0a] ${
                isDragging ? 'ring-2 ring-red-500/50 shadow-2xl shadow-red-900/20' : ''
            }`}
        >
            <div className="flex items-start gap-3">
                {/* Company Avatar */}
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center text-white font-semibold text-sm ring-1 ring-white/10">
                    {getInitial(application.company)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Company Name */}
                    <h3 className="font-semibold text-white truncate mb-0.5">
                        {application.company}
                    </h3>

                    {/* Role */}
                    <p className="text-sm text-zinc-400 truncate">
                        {application.role}
                    </p>

                    {/* Meta Row */}
                    <div className="flex items-center justify-between mt-3 gap-2">
                        {/* Date */}
                        <div className="flex items-center gap-1 text-xs text-zinc-500">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span>{formatDate(application.applied_at)}</span>
                        </div>

                        {/* Job URL Link */}
                        {application.job_url && (
                            <a
                                href={application.job_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center justify-center w-7 h-7 rounded-lg bg-zinc-800/50 text-zinc-500 hover:text-white hover:bg-zinc-700 transition-colors"
                                title="View job posting"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                            </a>
                        )}
                    </div>

                    {/* Salary Range (if present) */}
                    {application.salary_range && (
                        <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 text-green-400 text-xs font-medium">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {application.salary_range}
                        </div>
                    )}
                </div>
            </div>

            {/* Drag Handle Indicator (visible on hover) */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                <svg className="w-5 h-5 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
            </div>
        </div>
    );
}