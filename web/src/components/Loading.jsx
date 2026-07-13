export default function Loading({ message = 'Loading...' }) {
    return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-zinc-800 border-t-red-600 rounded-full animate-spin" />
                <p className="text-zinc-500">{message}</p>
            </div>
        </div>
    );
}