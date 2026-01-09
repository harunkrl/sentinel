import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Activity, Clock, Settings as SettingsIcon, Server, Cpu, HardDrive, Wifi, List, Trash2, LogOut, Star, Thermometer, Plus, X, Copy, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Helper: OS Icon logic
import { getOSIcon } from '../utils/osHelpers';

// Settings Modal
import SettingsModal from './SettingsModal';

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export default function Dashboard({ onSelectAgent, onLogout }) {
    const [agents, setAgents] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showAddAgent, setShowAddAgent] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [copied, setCopied] = useState(false);
    const [favorites, setFavorites] = useState(() => {
        const saved = localStorage.getItem('sentinel_favorites');
        return saved ? JSON.parse(saved) : [];
    });

    const toggleFavorite = (hostname, e) => {
        e.stopPropagation();
        setFavorites(prev => {
            const newFavs = prev.includes(hostname)
                ? prev.filter(h => h !== hostname)
                : [...prev, hostname];
            localStorage.setItem('sentinel_favorites', JSON.stringify(newFavs));
            return newFavs;
        });
    };

    const fetchAgents = async () => {
        try {
            const res = await axios.get(`${API_BASE}/agents`);
            setAgents(res.data || []);
        } catch (err) {
            console.error("Failed to fetch agents", err);
        }
    };

    const fetchAuditLogs = async () => {
        try {
            const res = await axios.get(`${API_BASE}/audit-logs`);
            setAuditLogs(res.data || []);
        } catch (err) {
            console.error("Failed to fetch logs", err);
        }
    };

    const handleClearHistory = async () => {
        setShowClearConfirm(false);
        try {
            await axios.delete(`${API_BASE}/audit-logs`);
            fetchAuditLogs();
        } catch (err) {
            console.error("Failed to clear history", err);
        }
    };

    const handleDeleteAgent = async (hostname) => {
        try {
            await axios.delete(`${API_BASE}/agent/${hostname}`);
            setDeleteConfirm(null);
            fetchAgents();
        } catch (err) {
            console.error("Failed to delete agent", err);
        }
    };

    const getInstallCommand = () => {
        const host = window.location.host; // includes port if present
        const hostname = window.location.hostname; // just the domain/IP
        // The script needs server IP and potentially port. 
        // Our install.sh expects: bash -s <SERVER_IP> [PORT]
        const port = window.location.port || '80';

        return `curl -sL http://${host}/downloads/install.sh | sudo bash -s ${hostname} ${port}`;
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(getInstallCommand());
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    useEffect(() => {
        fetchAgents();
        fetchAuditLogs();

        let eventSource;
        let reconnectTimeout;

        const connectSSE = () => {
            eventSource = new EventSource(`${API_BASE}/events`);

            eventSource.onmessage = (event) => {
                fetchAgents();
                fetchAuditLogs();
            };

            eventSource.onerror = (err) => {
                console.error("SSE Error, reconnecting in 3s...", err);
                eventSource.close();
                reconnectTimeout = setTimeout(connectSSE, 3000);
            };
        };

        connectSSE();

        // Also poll every 10s as fallback
        const pollInterval = setInterval(() => {
            fetchAgents();
            fetchAuditLogs();
        }, 10000);

        return () => {
            if (eventSource) eventSource.close();
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            clearInterval(pollInterval);
        };
    }, []);

    const getLoadColor = (load) => {
        if (load === undefined || load === null) return "text-gray-600";
        if (load < 1.0) return "text-green-400";
        if (load < 3.0) return "text-yellow-400";
        return "text-red-400";
    };

    // --- AGGREGATE STATS ---
    const totalAgents = agents.length;
    const onlineAgents = agents.filter(a => a.status === 'online');
    const offlineCount = totalAgents - onlineAgents.length;

    // Average CPU (Online only)
    const avgCpu = onlineAgents.length > 0
        ? onlineAgents.reduce((acc, a) => acc + (a.metrics?.cpu_percent || 0), 0) / onlineAgents.length
        : 0;

    // Average RAM (Online only)
    const avgRam = onlineAgents.length > 0
        ? onlineAgents.reduce((acc, a) => acc + (a.metrics?.ram_used_percent || 0), 0) / onlineAgents.length
        : 0;

    return (
        <div className="p-4 md:p-8 bg-bg-primary min-h-screen text-text-primary relative overflow-hidden transition-colors duration-300">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl" />
            </div>

            {/* SETTINGS MODAL */}
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

            {/* ADD AGENT MODAL */}
            {showAddAgent && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowAddAgent(false)}>
                    <div className="glass-panel p-6 rounded-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Plus className="w-5 h-5 text-green-400" />
                                Add New Agent
                            </h2>
                            <button onClick={() => setShowAddAgent(false)} className="text-gray-500 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-text-secondary text-sm mb-4">
                            Run this command on the target machine to install the Sentinel agent:
                        </p>

                        <div className="bg-black/40 p-4 rounded-xl border border-white/10 mb-4">
                            <code className="text-green-400 text-sm break-all">{getInstallCommand()}</code>
                        </div>

                        <button
                            onClick={copyToClipboard}
                            className={`w-full py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all ${copied
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-blue-600 hover:bg-blue-500 text-white'
                                }`}
                        >
                            {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy Command</>}
                        </button>

                        <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                            <p className="text-yellow-400 text-xs">
                                <strong>Note:</strong> Replace the hostname if accessing from a different network.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRM MODAL */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
                    <div className="glass-panel p-6 rounded-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
                        <h2 className="text-xl font-bold text-red-400 mb-4">Delete Agent?</h2>
                        <p className="text-text-secondary text-sm mb-6">
                            Remove <strong className="text-white">{deleteConfirm}</strong> from monitoring?
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 glass-button py-2 rounded-lg">Cancel</button>
                            <button onClick={() => handleDeleteAgent(deleteConfirm)} className="flex-1 bg-red-600 hover:bg-red-500 py-2 rounded-lg font-medium">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            <header className="mb-6 md:mb-10 glass-panel p-4 md:p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 relative z-10">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="p-3 bg-blue-500/20 rounded-xl shrink-0">
                        <Activity className="text-blue-400 w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Sentinel Dashboard</h1>
                        <p className="text-gray-500 text-xs md:text-sm">System Monitoring & Management</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                    {/* SEARCH AGENTS */}
                    <div className="relative w-full sm:flex-1 md:w-64">
                        <input
                            type="text"
                            placeholder="Search agents..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-black/30 border border-white/10 text-white text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-blue-500 placeholder-gray-500"
                        />
                        <Server className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">

                        {/* ADD AGENT BUTTON */}
                        <button
                            onClick={() => setShowAddAgent(true)}
                            className="glass-button px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-green-400 hover:bg-green-500/10 hover:border-green-500/30"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="hidden sm:inline">Add Agent</span>
                        </button>

                        {/* SETTINGS BUTTON */}
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="glass-button px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 text-text-secondary hover:text-text-primary"
                        >
                            <SettingsIcon className="w-5 h-5" />
                        </button>

                        {/* LOGOUT BUTTON */}
                        <button
                            onClick={onLogout}
                            className="glass-button px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 hover:bg-red-500/10 hover:border-red-500/30 text-text-secondary hover:text-red-400 whitespace-nowrap"
                        >
                            <LogOut className="w-5 h-5" /> Logout
                        </button>
                    </div>
                </div>
            </header>

            {/* STATS OVERVIEW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10 relative z-10">
                {/* TOTAL AGENTS */}
                <div className="glass-card p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group">
                    <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400 group-hover:bg-blue-500/30 transition-colors">
                        <Server className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-text-secondary text-xs font-bold uppercase tracking-wider">Total Agents</p>
                        <p className="text-2xl font-bold text-text-primary mt-0.5">{totalAgents}</p>
                    </div>
                </div>

                {/* ONLINE / OFFLINE */}
                <div className="glass-card p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group">
                    <div className="p-3 bg-green-500/20 rounded-xl text-green-400 group-hover:bg-green-500/30 transition-colors">
                        <Wifi className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-text-secondary text-xs font-bold uppercase tracking-wider">System Status</p>
                        <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-2xl font-bold text-text-primary">{onlineAgents.length} <span className="text-sm font-normal text-text-secondary">Online</span></span>
                            {offlineCount > 0 && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/20">{offlineCount} Off</span>}
                        </div>
                    </div>
                </div>

                {/* AVG CPU */}
                <div className="glass-card p-5 rounded-2xl flex items-center gap-4 group">
                    <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400 group-hover:bg-indigo-500/30 transition-colors">
                        <Cpu className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-text-secondary text-xs font-bold uppercase tracking-wider">Avg CPU Load</p>
                        <p className="text-2xl font-bold text-text-primary mt-0.5">{avgCpu.toFixed(1)}%</p>
                    </div>
                </div>

                {/* AVG RAM */}
                <div className="glass-card p-5 rounded-2xl flex items-center gap-4 relative overflow-hidden group">
                    <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400 group-hover:bg-purple-500/30 transition-colors">
                        <HardDrive className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-text-secondary text-xs font-bold uppercase tracking-wider">Avg RAM Usage</p>
                        <p className="text-2xl font-bold text-text-primary mt-0.5">{avgRam.toFixed(1)}%</p>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 relative z-10">
                {/* LEFT: AGENT GRID */}
                <div className="flex-1">
                    <h2 className="text-sm font-bold mb-4 flex items-center gap-2 text-text-secondary uppercase tracking-wider"><Server className="w-4 h-4" /> Managed Agents</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {agents
                            .filter(agent => agent.hostname.toLowerCase().includes(searchTerm.toLowerCase()) || agent.ip_address.includes(searchTerm))
                            .sort((a, b) => {
                                const aFav = favorites.includes(a.hostname);
                                const bFav = favorites.includes(b.hostname);
                                if (aFav && !bFav) return -1;
                                if (!aFav && bFav) return 1;
                                return 0;
                            })
                            .map((agent) => {
                                const isFavorite = favorites.includes(agent.hostname);
                                const isOnline = agent.status === 'online';
                                const { icon: OSIcon, color: iconColor } = getOSIcon(agent);
                                const isWindows = agent.os?.toLowerCase().includes('windows');
                                const loadLabel = isWindows ? "CPU Queue" : "Load (1m)";
                                const loadVal = agent.metrics?.load_1 || 0;
                                const loadTooltip = "System Load Average. On Linux: Average number of processes waiting for CPU (1 min). On Windows: Processor Queue Length.";

                                return (
                                    <div
                                        key={agent.hostname}
                                        onClick={() => onSelectAgent(agent)}
                                        className={`glass-card rounded-2xl p-6 hover:bg-bg-card-hover transition cursor-pointer hover:border-blue-500/50 group relative overflow-hidden shadow-lg ${isOnline ? '' : 'opacity-75 border-red-900/30'}`}
                                    >
                                        {/* DYNAMIC BACKGROUND LOGO */}
                                        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition duration-500 ${isOnline ? iconColor : 'text-text-secondary'}`}>
                                            <OSIcon className="w-24 h-24" />
                                        </div>

                                        <div className="flex items-center gap-4 mb-6 relative z-10">
                                            <div className={`p-3 rounded-full transition ${isOnline ? 'bg-gray-700/50 border border-gray-600' : 'bg-gray-800 border border-red-900/30'}`}>
                                                <OSIcon className={`w-6 h-6 ${isOnline ? iconColor : 'text-gray-500'}`} />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-lg leading-tight text-text-primary">{agent.hostname}</h3>
                                                <p className="text-text-secondary text-xs font-mono mt-0.5">{agent.ip_address}</p>
                                            </div>
                                            <button
                                                onClick={(e) => toggleFavorite(agent.hostname, e)}
                                                className={`p-2 rounded-lg transition-all ${isFavorite ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-500 hover:text-yellow-400 hover:bg-yellow-400/10'}`}
                                                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                                            >
                                                <Star className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                                            </button>
                                        </div>

                                        {/* METRICS GRID - ENHANCED */}
                                        <div className="space-y-4 relative z-10">
                                            {/* Row 1: CPU & RAM */}
                                            <div className="grid grid-cols-2 gap-3 text-text-secondary">
                                                {/* CPU */}
                                                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-gray-500 text-[10px] uppercase font-bold">CPU</span>
                                                        <Cpu className="w-3 h-3 text-gray-600" />
                                                    </div>
                                                    <span className={`font-mono text-lg ${isOnline ? 'text-text-primary' : 'text-text-secondary'}`}>
                                                        {isOnline ? `${agent.metrics?.cpu_percent?.toFixed(1) || 0}%` : '--'}
                                                    </span>
                                                </div>
                                                {/* RAM */}
                                                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-gray-500 text-[10px] uppercase font-bold">RAM</span>
                                                        <Server className="w-3 h-3 text-gray-600" />
                                                    </div>
                                                    <span className={`font-mono text-lg ${isOnline ? 'text-text-primary' : 'text-text-secondary'}`}>
                                                        {isOnline ? `${agent.metrics?.ram_used_percent?.toFixed(1) || 0}%` : '--'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Row 2: Disk & Temp */}
                                            <div className="grid grid-cols-2 gap-3 text-gray-300">
                                                {/* DISK */}
                                                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-gray-500 text-[10px] uppercase font-bold">Disk</span>
                                                        <HardDrive className="w-3 h-3 text-gray-600" />
                                                    </div>
                                                    <span className={`font-mono text-lg ${isOnline ? 'text-text-primary' : 'text-text-secondary'}`}>
                                                        {isOnline ? `${agent.metrics?.disk_used_percent?.toFixed(0) || 0}%` : '--'}
                                                    </span>
                                                </div>
                                                {/* CPU TEMP */}
                                                <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className="text-gray-500 text-[10px] uppercase font-bold">Temp</span>
                                                        <Thermometer className="w-3 h-3 text-gray-600" />
                                                    </div>
                                                    <span className={`font-mono text-lg ${isOnline && agent.metrics?.temperature_c > 70 ? 'text-red-400' : isOnline && agent.metrics?.temperature_c > 50 ? 'text-yellow-400' : 'text-text-primary'}`}>
                                                        {isOnline && agent.metrics?.temperature_c ? `${agent.metrics.temperature_c.toFixed(0)}°C` : '--'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Footer: Uptime, Load, Delete */}
                                            <div className="flex items-center justify-between pt-2 border-t border-border-color">
                                                <div className="flex items-center gap-3 text-xs text-text-secondary">
                                                    <div className="flex items-center gap-1" title="Uptime">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{isOnline && agent.boot_time ? formatDistanceToNow(new Date(agent.boot_time * 1000)) : '--'}</span>
                                                    </div>
                                                    <div className={`flex items-center gap-1 ${getLoadColor(loadVal)}`} title={loadTooltip}>
                                                        <Activity className="w-3 h-3" />
                                                        <span>{isOnline ? loadVal.toFixed(2) : '--'}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm(agent.hostname); }}
                                                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                                                    title="Delete agent"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="absolute top-4 right-4 animate-pulse">
                                            {isOnline ? (
                                                <span className="w-2.5 h-2.5 rounded-full bg-green-500 block shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
                                            ) : (
                                                <span className="w-2.5 h-2.5 rounded-full bg-red-500 block"></span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        {agents.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-12 text-text-secondary border border-dashed border-border-color rounded-2xl bg-bg-card">
                                <Activity className="w-12 h-12 mb-4 opacity-20" />
                                <p className="text-lg font-medium">No agents connected.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT: ACTIVITY FEED */}
                <div className="w-full lg:w-80 flex-shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold flex items-center gap-2 text-text-secondary uppercase tracking-wider"><List className="w-4 h-4" /> Activity Feed</h2>
                        <button
                            onClick={() => setShowClearConfirm(true)}
                            className="text-xs flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition"
                        >
                            <Trash2 className="w-3 h-3" /> Clear
                        </button>
                    </div>

                    <div className="glass-panel rounded-2xl p-4 min-h-[400px] max-h-[800px] overflow-y-auto custom-scrollbar">
                        {auditLogs.length === 0 ? (
                            <div className="text-center py-10 text-text-secondary text-sm">No recent activity.</div>
                        ) : (
                            <div className="space-y-4">
                                {auditLogs.map((log) => (
                                    <div key={log.ID} className="relative pl-4 border-l-2 border-border-color">
                                        <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-bg-primary"></div>
                                        <div className="flex justify-between items-start">
                                            <span className="text-xs font-mono text-text-secondary">{formatDistanceToNow(new Date(log.Timestamp * 1000), { addSuffix: true })}</span>
                                        </div>
                                        <p className="text-sm font-medium text-text-primary mt-0.5 capitalize">{log.Action.replace('_', ' ')}</p>
                                        <p className="text-xs text-text-secondary mt-0.5 font-mono">{log.Target}</p>
                                        {log.Details && <p className="text-xs text-text-secondary mt-1">{log.Details}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Clear History Confirmation Modal */}
            {showClearConfirm && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="glass-panel rounded-2xl p-6 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-500/20 rounded-lg">
                                <Trash2 className="w-5 h-5 text-red-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-text-primary">Clear Activity History</h3>
                        </div>
                        <p className="text-text-secondary text-sm mb-6">
                            Are you sure you want to clear all activity history? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowClearConfirm(false)}
                                className="glass-button px-4 py-2.5 rounded-xl transition text-sm font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleClearHistory}
                                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition text-sm font-medium"
                            >
                                Clear History
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}