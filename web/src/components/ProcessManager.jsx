import React, { useState } from 'react';
import axios from 'axios';
import { RefreshCw, Trash2, AlertCircle, Search } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export default function ProcessManager({ agentId, isOnline }) {
    const [processes, setProcesses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    const pollCommandResult = async (commandId) => {
        const maxRetries = 10;
        let retries = 0;

        const check = async () => {
            if (retries >= maxRetries) {
                setError("Timeout waiting for agent response.");
                setLoading(false);
                return;
            }
            retries++;
            try {
                const res = await axios.get(`${API_BASE}/command/${commandId}`);

                if (res.status === 200) {
                    const success = res.data.success !== undefined ? res.data.success : res.data.Success;
                    const errorMsg = res.data.error_message || res.data.errorMessage || res.data.ErrorMessage;

                    if (success) {
                        const pList = res.data.process_list || res.data.processList || res.data.ProcessList;
                        const rawList = pList?.processes || pList?.Processes || [];

                        const normalized = rawList.map(p => ({
                            pid: p.pid || p.Pid,
                            name: p.name || p.Name,
                            cpu_percent: p.cpu_percent || p.cpuPercent || p.CpuPercent || 0,
                            memory_percent: p.memory_percent || p.memoryPercent || p.MemoryPercent || 0
                        }));

                        normalized.sort((a, b) => b.cpu_percent - a.cpu_percent);
                        setProcesses(normalized);
                        setLoading(false);
                    } else {
                        setError(errorMsg || "Command failed");
                        setLoading(false);
                    }
                }
            } catch (err) {
                if (err.response && err.response.status === 404) {
                    setTimeout(check, 1000);
                } else {
                    setError("Failed to poll results");
                    setLoading(false);
                }
            }
        };
        setTimeout(check, 1000);
    };

    const fetchProcesses = async () => {
        if (!isOnline) {
            setError("Agent is offline.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await axios.post(`${API_BASE}/agent/${agentId}/processes`);
            const cmdId = res.data.command_id;
            pollCommandResult(cmdId);
        } catch (err) {
            setError("Failed to initiate command.");
            setLoading(false);
        }
    };

    const killProcess = async (pid) => {
        if (!window.confirm(`Are you sure you want to kill PID ${pid}?`)) return;

        try {
            await axios.post(`${API_BASE}/agent/${agentId}/kill`, { pid: Number(pid) });
            setTimeout(fetchProcesses, 2000);
        } catch (err) {
            alert("Failed to send kill command");
        }
    };

    const filteredProcesses = processes.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(p.pid).includes(searchTerm)
    );

    return (
        <div className="glass-panel rounded-xl overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-border-color flex flex-col md:flex-row justify-between items-center gap-4 bg-bg-secondary/40">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-text-primary">
                        Running Processes
                        {loading && <RefreshCw className="w-4 h-4 animate-spin text-blue-500" />}
                    </h3>

                    <div className="relative flex-1 md:w-64">
                        <input
                            type="text"
                            placeholder="Search processes..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-bg-primary border border-border-color rounded-lg py-1.5 px-3 pl-9 text-sm text-text-primary focus:outline-none focus:border-blue-500 transition shadow-sm"
                        />
                        <Search className="absolute left-3 top-2 w-4 h-4 text-gray-500" />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-xs text-text-secondary hidden md:inline-block">
                        ({filteredProcesses.length}/{processes.length})
                    </span>
                    <button
                        onClick={fetchProcesses}
                        disabled={loading || !isOnline}
                        className="glass-button px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 text-text-secondary hover:text-text-primary disabled:opacity-50"
                    >
                        <RefreshCw className="w-4 h-4" /> <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-500/10 text-red-400 flex items-center gap-2 text-sm border-b border-border-color">
                    <AlertCircle className="w-4 h-4" /> {error}
                </div>
            )}

            <div className="overflow-x-auto flex-1 bg-gray-950/30">
                <table className="w-full text-left text-sm text-text-secondary">
                    <thead className="bg-bg-secondary/50 text-text-secondary font-medium uppercase text-xs sticky top-0 backdrop-blur-md z-10">
                        <tr>
                            <th className="px-6 py-3">PID</th>
                            <th className="px-6 py-3">Name</th>
                            <th className="px-6 py-3">CPU %</th>
                            <th className="px-6 py-3">Mem %</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color">
                        {filteredProcesses.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-text-secondary">
                                    {loading ? "Fetching process list..." : processes.length === 0 ? "No processes loaded. Click Refresh." : "No processes match your search."}
                                </td>
                            </tr>
                        ) : (
                            filteredProcesses.map((proc) => (
                                <tr key={proc.pid} className="hover:bg-white/5 transition group">
                                    <td className="px-6 py-3 font-mono text-text-secondary">{proc.pid}</td>
                                    <td className="px-6 py-3 font-medium text-text-primary">{proc.name}</td>
                                    <td className="px-6 py-3">{proc.cpu_percent?.toFixed(1) || 0}%</td>
                                    <td className="px-6 py-3">{proc.memory_percent?.toFixed(1) || 0}%</td>
                                    <td className="px-6 py-3 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => killProcess(proc.pid)}
                                            className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-2 rounded-lg transition"
                                            title="Kill Process"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
