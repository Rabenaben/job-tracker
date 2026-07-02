import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import ApplicationCard from './ApplicationCard';

export default function Column({ status, applications, onCardClick, config, isDragging }) {
    const { setNodeRef, isOver } = useDroppable({ id: status });
    const count = applications.length;

    // Filter out the currently dragged item so it doesn't show in the column
    const visibleApplications = isDragging
        ? applications.filter((app) => app.id !== isDragging)
        : applications;

    return (
        <div
            ref={setNodeRef}
            className={`relative flex flex-col bg-[#0d0d0d] rounded-xl border transition-all duration-200 ${
                isOver
                    ? 'border-red-500/50 bg-red-500/5'
                    : 'border-zinc-800/50'
            }`}
            style={{ maxHeight: 'calc(100vh - 160px)', overflow: 'hidden' }}
        >
            {/* Column Header - stays at top, cards container scrolls below */}
            <div className="shrink-0 bg-[#0d0d0d] px-4 py-3 border-b border-zinc-800/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Status Icon */}
                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg border ${config?.color || 'bg-zinc-500/10 text-zinc-400'}`}>
                            {config?.icon || (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            )}
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-white capitalize">
                                {config?.label || status}
                            </h2>
                            <p className="text-xs text-zinc-500 -mt-0.5">{config?.label || status}</p>
                        </div>
                    </div>
                    {/* Count Badge */}
                    <div className={`flex items-center justify-center min-w-[28px] h-7 px-2 rounded-lg text-sm font-semibold ${
                        count > 0
                            ? 'bg-zinc-800 text-zinc-300'
                            : 'bg-zinc-900 text-zinc-600'
                    }`}>
                        {count}
                    </div>
                </div>
            </div>

            {/* Cards Container */}
            <div className="p-3 min-h-[200px] flex-1 overflow-y-auto custom-scrollbar">
                <SortableContext
                    items={visibleApplications.map((a) => a.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-2">
                        {visibleApplications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                                <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-3">
                                    <svg className="w-6 h-6 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                </div>
                                <p className="text-sm text-zinc-600">No applications</p>
                                <p className="text-xs text-zinc-700 mt-1">Drag cards here</p>
                            </div>
                        ) : (
                            visibleApplications.map((app) => (
                                <ApplicationCard
                                    key={app.id}
                                    application={app}
                                    onClick={onCardClick}
                                />
                            ))
                        )}
                    </div>
                </SortableContext>
            </div>

            {/* Drop Indicator */}
            {isOver && (
                <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 h-1 bg-red-500 rounded-full animate-pulse" />
            )}
        </div>
    );
}