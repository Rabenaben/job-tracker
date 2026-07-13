import { useEffect, useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, DragOverlay, rectIntersection } from '@dnd-kit/core';
import ApplicationCard from '../components/ApplicationCard';
import api, { setNetworkErrorHandler } from '../api/axios';
import Column from '../components/Column';
import AddApplicationModal from '../components/AddApplicationModal';
import EditApplicationModal from '../components/EditApplicationModal';
import UserMenu from '../components/UserMenu';
import Loading from '../components/Loading';

const STATUSES = ['applied', 'interviewing', 'offer', 'rejected', 'ghosted'];

// Custom collision detection - prioritizes column drop zones over individual cards
const columnFirstCollisionDetection = (args) => {
    // First, check for column intersections (drop zones)
    const columnCollisions = rectIntersection(args);

    // If there's an intersection with a column (one of our statuses), use that
    for (const collision of columnCollisions) {
        if (STATUSES.includes(collision.id)) {
            return [collision];
        }
    }

    // If no column collision, check for card collisions (for reordering within a column)
    // This enables sorting cards within the same column
    return columnCollisions;
};

// Status styling configuration
const STATUS_CONFIG = {
    applied: {
        label: 'Applied',
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
        ),
        color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    },
    interviewing: {
        label: 'Interviewing',
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
        color: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    },
    offer: {
        label: 'Offer',
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
        ),
        color: 'bg-green-500/10 text-green-400 border-green-500/30',
    },
    rejected: {
        label: 'Rejected',
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        color: 'bg-red-500/10 text-red-400 border-red-500/30',
    },
    ghosted: {
        label: 'Ghosted',
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
        ),
        color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/30',
    },
};

export default function Board() {
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedApp, setSelectedApp] = useState(null);
    const [activeId, setActiveId] = useState(null);
    const [toast, setToast] = useState(null);

    // Track the active application for DragOverlay
    const activeApplication = activeId
        ? applications.find((a) => a.id === activeId)
        : null;

    useEffect(() => {
        // Set up network error handler
        const handleNetworkError = () => {
            showToast('Connection lost. Please check your network.', 'error');
        };
        const unsubscribe = setNetworkErrorHandler(handleNetworkError);

        // Fetch applications
        api.get('/applications')
            .then((res) => setApplications(res.data))
            .catch((err) => {
                if (!err.response) {
                    showToast('Failed to connect to server.', 'error');
                }
            })
            .finally(() => setLoading(false));

        return unsubscribe;
    }, []);

    const handleDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const handleDragEnd = async (event) => {
        setActiveId(null);
        const { active, over } = event;
        if (!over) return;

        const appId = active.id;
        const newStatus = over.id;

        if (!STATUSES.includes(newStatus)) return;

        const app = applications.find((a) => a.id === appId);
        if (!app || app.status === newStatus) return;

        const previousStatus = app.status;
        setApplications((prev) =>
            prev.map((a) => (a.id === appId ? { ...a, status: newStatus } : a))
        );

        try {
            await api.patch(`/applications/${appId}/status`, { status: newStatus });
        } catch (err) {
            setApplications((prev) =>
                prev.map((a) => (a.id === appId ? { ...a, status: previousStatus } : a))
            );
            showToast('Failed to update status. Please try again.');
        }
    };

    const handleCreated = (newApp) => {
        setApplications((prev) => [newApp, ...prev]);
    };

    const handleUpdated = (updatedApp) => {
        setApplications((prev) =>
            prev.map((a) => (a.id === updatedApp.id ? updatedApp : a))
        );
    };

    const handleDeleted = (deletedId) => {
        setApplications((prev) => prev.filter((a) => a.id !== deletedId));
    };

    // Toast helper for user feedback
    const showToast = (message, type = 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    if (loading) {
        return <Loading message="Loading your applications..." />;
    }

    // Calculate stats
    const totalApps = applications.length;
    const appliedCount = applications.filter((a) => a.status === 'applied').length;
    const interviewCount = applications.filter((a) => a.status === 'interviewing').length;
    const offerCount = applications.filter((a) => a.status === 'offer').length;

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-zinc-800/50">
                <div className="max-w-[1800px] mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        {/* Left: Brand */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-700 shadow-lg shadow-red-900/30">
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Job Tracker</h1>
                                <p className="text-sm text-zinc-500">Track your career journey</p>
                            </div>
                        </div>

                        {/* Center: Stats */}
                        <div className="hidden md:flex items-center gap-6">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold text-white">{totalApps}</span>
                                <span className="text-sm text-zinc-500">Total</span>
                            </div>
                            <div className="w-px h-8 bg-zinc-800" />
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold text-blue-400">{appliedCount}</span>
                                <span className="text-sm text-zinc-500">Applied</span>
                            </div>
                            <div className="w-px h-8 bg-zinc-800" />
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold text-purple-400">{interviewCount}</span>
                                <span className="text-sm text-zinc-500">Interviewing</span>
                            </div>
                            <div className="w-px h-8 bg-zinc-800" />
                            <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold text-green-400">{offerCount}</span>
                                <span className="text-sm text-zinc-500">Offers</span>
                            </div>
                        </div>

                        {/* Right: Add Button + User Menu */}
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setModalOpen(true)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 shadow-lg shadow-red-900/30 transition-all duration-200"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                                <span className="hidden sm:inline">Add Application</span>
                            </button>
                            <UserMenu />
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Stats */}
            <div className="md:hidden px-6 py-4 border-b border-zinc-800/50 grid grid-cols-2 gap-4">
                <div className="bg-[#141414] rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-white">{totalApps}</p>
                    <p className="text-xs text-zinc-500">Total Applications</p>
                </div>
                <div className="bg-[#141414] rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-400">{offerCount}</p>
                    <p className="text-xs text-zinc-500">Offers</p>
                </div>
            </div>

            {/* Main Board */}
            <main className="max-w-[1800px] mx-auto p-6">
                <DndContext sensors={sensors} collisionDetection={columnFirstCollisionDetection} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                        {STATUSES.map((status) => (
                            <Column
                                key={status}
                                status={status}
                                applications={applications.filter((a) => a.status === status)}
                                onCardClick={setSelectedApp}
                                config={STATUS_CONFIG[status]}
                                isDragging={activeId}
                            />
                        ))}
                    </div>
                    <DragOverlay>
                        {activeApplication ? (
                            <div className="opacity-90 rotate-3 scale-105">
                                <ApplicationCard
                                    application={activeApplication}
                                    onClick={() => {}}
                                />
                            </div>
                        ) : null}
                    </DragOverlay>
                </DndContext>
            </main>

            {/* Modals */}
            <AddApplicationModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onCreated={handleCreated}
            />

            <EditApplicationModal
                application={selectedApp}
                onClose={() => setSelectedApp(null)}
                onUpdated={handleUpdated}
                onDeleted={handleDeleted}
            />

            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg ${
                        toast.type === 'error'
                            ? 'bg-red-600/90 text-white backdrop-blur-sm'
                            : 'bg-green-600/90 text-white backdrop-blur-sm'
                    }`}>
                        {toast.type === 'error' ? (
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        )}
                        <span className="font-medium">{toast.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
}