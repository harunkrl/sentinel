import React, { useRef, useEffect } from 'react';
import { FileText, RefreshCw } from 'lucide-react';

export default function Terminal({ title = "System Logs", logs, loading, isOnline, onRefresh }) {
    const terminalRef = useRef(null);
    const [searchTerm, setSearchTerm] = React.useState("");
    const [filteredLogs, setFilteredLogs] = React.useState(logs);

    useEffect(() => {
        if (!logs) {
            setFilteredLogs("");
            return;
        }
        if (!searchTerm) {
            setFilteredLogs(logs);
        } else {
            const lines = logs.split('\n');
            const filtered = lines.filter(line => line.toLowerCase().includes(searchTerm.toLowerCase()));
            setFilteredLogs(filtered.join('\n'));
        }
    }, [logs, searchTerm]);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [filteredLogs]);

    return (
        <div className="glass-panel rounded-xl overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-border-color flex flex-col md:flex-row justify-between items-center gap-4 bg-bg-secondary/40">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-text-primary">
                        <FileText className="w-5 h-5 text-blue-400" /> {title}
                    </h3>
                    <div className="relative flex-1 md:w-64">
                        <input
                            type="text"
                            placeholder="Filter logs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-bg-primary border border-border-color rounded-lg py-1.5 px-3 text-sm text-text-primary focus:outline-none focus:border-blue-500 transition shadow-sm"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-xs text-text-secondary hidden md:inline-block">
                        {filteredLogs ? filteredLogs.split('\n').length : 0} lines
                    </span>
                    <button
                        onClick={onRefresh}
                        disabled={loading || !isOnline}
                        className="glass-button px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 text-text-secondary hover:text-text-primary disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                </div>
            </div>
            <div className="flex-1 bg-gray-950 p-4 overflow-auto font-mono text-xs text-green-400 leading-relaxed scrollbar-thin scrollbar-thumb-gray-800" ref={terminalRef}>
                {loading && !logs && <p className="text-gray-500 animate-pulse">Initializing connection...</p>}
                {!isOnline && <p className="text-red-500">Target offline. Stream unavailable.</p>}
                {filteredLogs ? <pre className="whitespace-pre-wrap">{filteredLogs}</pre> : (!loading && <p className="text-gray-600">No logs found matching filter.</p>)}
            </div>
        </div>
    );
}
