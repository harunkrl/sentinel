import React, { useState } from 'react';
import { Box, RefreshCw, RotateCcw, Square, Play, Search } from 'lucide-react';

export default function ContainerTable({ containers, loading, isOnline, onRefresh, onAction }) {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredContainers = containers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.image.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.state.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="glass-panel rounded-xl overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-border-color flex flex-col md:flex-row justify-between items-center gap-4 bg-bg-secondary/40">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-text-primary">
                        <Box className="w-5 h-5 text-blue-400" /> Docker Containers
                    </h3>

                    <div className="relative flex-1 md:w-64">
                        <input
                            type="text"
                            placeholder="Search containers..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-bg-primary border border-border-color rounded-lg py-1.5 px-3 pl-9 text-sm text-text-primary focus:outline-none focus:border-blue-500 transition shadow-sm"
                        />
                        <Search className="absolute left-3 top-2 w-4 h-4 text-gray-500" />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-xs text-text-secondary hidden md:inline-block">
                        ({filteredContainers.length}/{containers.length})
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

            <div className="overflow-x-auto flex-1 bg-gray-950/30">
                <table className="w-full text-left text-sm text-text-secondary">
                    <thead className="bg-bg-secondary/50 text-text-secondary font-medium uppercase text-xs sticky top-0 backdrop-blur-md z-10">
                        <tr>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">Image</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color">
                        {loading && containers.length === 0 ? (
                            <tr><td colSpan="4" className="px-6 py-8 text-center text-text-secondary animate-pulse">Scanning Docker daemon...</td></tr>
                        ) : filteredContainers.length === 0 ? (
                            <tr><td colSpan="4" className="px-6 py-8 text-center text-text-secondary">
                                {containers.length === 0 ? "No containers found." : "No containers match your search."}
                            </td></tr>
                        ) : (
                            filteredContainers.map((c) => {
                                const isRunning = c.state === 'running';
                                return (
                                    <tr key={c.id} className="hover:bg-white/5 transition group">
                                        <td className="px-6 py-3 font-medium text-text-primary flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${isRunning ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'}`}></div>
                                            {c.name}
                                        </td>
                                        <td className="px-6 py-3 font-mono text-xs text-text-secondary">{c.image}</td>
                                        <td className="px-6 py-3 whitespace-nowrap">
                                            <span className={`px-2 py-1 rounded text-xs font-bold border ${isRunning ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {isRunning ? (
                                                <>
                                                    <button onClick={() => onAction(c.id, 'restart')} className="p-2 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20 border border-blue-500/20 transition" title="Restart"><RotateCcw className="w-4 h-4" /></button>
                                                    <button onClick={() => onAction(c.id, 'stop')} className="p-2 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 border border-red-500/20 transition" title="Stop"><Square className="w-4 h-4" /></button>
                                                </>
                                            ) : (
                                                <button onClick={() => onAction(c.id, 'start')} className="p-2 bg-green-500/10 text-green-400 rounded hover:bg-green-500/20 border border-green-500/20 transition" title="Start"><Play className="w-4 h-4" /></button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
