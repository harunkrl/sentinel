import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, Cpu, HardDrive, Disc, Layers, Clock, Box, HelpCircle, Power, RotateCw, RefreshCw, AlertTriangle, Trash2, X, Moon, Zap, Wifi, Network, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import ProcessManager from './ProcessManager';
import ServiceManager from './ServiceManager';
import MetricsChart from './MetricsChart';
import ContainerTable from './ContainerTable';
import Terminal from './Terminal';
import { getOSIcon } from '../utils/osHelpers';

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

import ConfirmationModal from './ConfirmationModal';

// --- API CONFIG ---


// --- SPEC ITEM COMPONENT ---
const SpecItem = ({ icon: Icon, label, value }) => {
    return (
        <div className="glass-card flex items-start gap-3 p-4 rounded-xl group">
            <div className={`p-2 bg-bg-secondary/50 rounded-lg mt-1 text-blue-400 group-hover:text-text-primary transition-colors`}><Icon className="w-5 h-5" /></div>
            <div className="min-w-0 flex-1">
                <p className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-1 group-hover:text-blue-400 transition-colors">{label}</p>
                <p className="text-sm font-medium text-text-primary truncate" title={value}>{value || "N/A"}</p>
            </div>
        </div>
    );
};

const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export default function AgentDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [agent, setAgent] = useState(null);
    const [activeTab, setActiveTab] = useState('metrics');
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', actionType: '', onConfirm: () => { } });
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [isUpdating, setIsUpdating] = useState(false);

    // Sub-component states
    const [containers, setContainers] = useState([]);
    const [containersLoading, setContainersLoading] = useState(false);
    const [logs, setLogs] = useState("");
    const [logsLoading, setLogsLoading] = useState(false);

    // Fetch Agent
    const fetchAgent = async () => {
        try {
            const res = await axios.get(`${API_BASE}/agents`);
            const found = res.data.find(a => a.hostname === id);
            setAgent(found);
        } catch (err) {
            console.error("Failed to fetch agent", err);
        }
    };

    // Sub-fetchers
    const fetchContainers = async () => {
        setContainersLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/agent/${id}/containers`);
            setContainers(Array.isArray(res.data) ? res.data : []);
        } catch (err) { console.error(err); }
        finally { setContainersLoading(false); }
    };

    const fetchLogs = async () => {
        setLogsLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/agent/${id}/logs`);
            if (res.data.status === 'success') setLogs(res.data.logs);
        } catch (err) { setLogs("Failed: " + err.message); }
        finally { setLogsLoading(false); }
    };

    // Docker Action
    const handleDockerAction = async (cid, action) => {
        try {
            await axios.post(`${API_BASE}/agent/${id}/docker`, { container_id: cid, action });
            setTimeout(fetchContainers, 2000);
        } catch (err) { alert("Action failed: " + err.message); }
    };

    useEffect(() => {
        fetchAgent();
        const interval = setInterval(fetchAgent, 5000); // Polling for detail view
        return () => clearInterval(interval);
    }, [id]);

    // Tab changes
    useEffect(() => {
        if (!agent) return;
        if (activeTab === 'containers' && agent.status === 'online') fetchContainers();
        if (activeTab === 'logs' && agent.status === 'online') fetchLogs();
    }, [activeTab, agent?.status]);


    if (!agent) return <div className="p-10 text-center text-gray-500 animate-pulse text-xl">Connecting to neural interface...</div>;

    const isOnline = agent.status === 'online';
    const isWindows = agent.os?.toLowerCase().includes('windows');
    const { icon: OSIcon, color: iconColor } = getOSIcon(agent);

    const triggerSystemAction = (action) => {
        const actionNames = {
            reboot: 'REBOOT SYSTEM',
            shutdown: 'SHUTDOWN SYSTEM',
            restart_agent: 'RESTART SENTINEL',
            suspend: 'SUSPEND SYSTEM'
        };
        const actionName = actionNames[action] || action.toUpperCase();

        setModalConfig({
            isOpen: true,
            title: `Confirm ${actionName}`,
            message: `Are you sure you want to ${actionName} on ${agent.hostname}?\n\nThis action cannot be undone.`,
            actionType: action,
            onConfirm: async () => {
                try {
                    await axios.post(`${API_BASE}/agent/${agent.hostname}/action`, { action });
                } catch (err) { alert("Failed: " + err.message); }
            }
        });
    };

    const triggerWake = async () => {
        try {
            await axios.post(`${API_BASE}/agent/${agent.hostname}/wake`);
            alert("✨ Magic Packet Sent!");
        } catch (err) { alert("Wake failed: " + err.message); }
    };

    const handleDeleteDevice = () => {
        setModalConfig({
            isOpen: true,
            title: "Delete Device",
            message: `Are you sure you want to remove ${agent.hostname} from monitoring?\n\nThis will delete all local data for this device.`,
            actionType: 'delete',
            onConfirm: async () => {
                try {
                    await axios.delete(`${API_BASE}/agent/${agent.hostname}`);
                    navigate('/');
                } catch (err) { alert("Delete failed: " + err.message); }
            }
        });
    };

    const triggerUpdateAgent = () => {
        setModalConfig({
            isOpen: true,
            title: "Update Agent Software",
            message: `Update Agent Software on ${agent.hostname}?\n\nThe agent will download and install the latest version, then restart automatically.`,
            actionType: 'update',
            onConfirm: async () => {
                try {
                    await axios.post(`${API_BASE}/agent/${agent.hostname}/update`);
                    setIsUpdating(true);
                    setToast({ show: true, message: 'Update started! Waiting for agent to restart...', type: 'success' });
                    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);

                    // Start polling: Wait for Offline -> Then Wait for Online
                    let attempts = 0;
                    const maxAttempts = 100; // 100 * 3s = 5 minutes timeout
                    let hasGoneOffline = false;

                    const pollInterval = setInterval(async () => {
                        attempts++;
                        try {
                            const res = await axios.get(`${API_BASE}/agents`);
                            const found = res.data.find(a => a.hostname === agent.hostname);

                            // Phase 1: Wait for agent to go offline
                            if (!hasGoneOffline) {
                                if (!found || found.status !== 'online') {
                                    hasGoneOffline = true;
                                    setToast({ show: true, message: 'Agent restarting...', type: 'success' });
                                }
                            }
                            // Phase 2: Wait for agent to come back online
                            else {
                                if (found && found.status === 'online') {
                                    clearInterval(pollInterval);
                                    setIsUpdating(false);
                                    setToast({ show: true, message: 'Agent updated successfully!', type: 'success' });
                                    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 5000);
                                    fetchAgent(); // Refresh agent data
                                }
                            }
                        } catch (err) {
                            // Ignore fetch errors during update
                        }

                        if (attempts >= maxAttempts) {
                            clearInterval(pollInterval);
                            setIsUpdating(false);
                            // If it never went offline, maybe nothing happened?
                            // If it went offline but never came back, it's a timeout.
                            const msg = hasGoneOffline
                                ? 'Update timeout - agent did not recover in time'
                                : 'Update timeout - agent did not restart';

                            setToast({ show: true, message: msg, type: 'error' });
                            setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 5000);
                        }
                    }, 3000);
                } catch (err) {
                    setToast({ show: true, message: 'Failed to send update command: ' + err.message, type: 'error' });
                    setTimeout(() => setToast({ show: false, message: '', type: 'error' }), 5000);
                }
            }
        });
    };

    return (
        <div className="p-4 md:p-8 min-h-screen relative">
            <ConfirmationModal isOpen={modalConfig.isOpen} onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} {...modalConfig} />
            <button onClick={() => navigate('/')} className="mb-6 flex items-center gap-2 text-text-secondary hover:text-text-primary transition group">
                <div className="glass-button p-2 rounded-lg"><ArrowLeft className="w-5 h-5" /></div>
                <span className="font-medium">Dashboard</span>
            </button>

            {/* HEADER */}
            <header className="mb-8 glass-panel p-4 md:p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                <div className="absolute top-0 right-0 p-10 opacity-10 pointer-events-none transform translate-x-1/4 -translate-y-1/4 overflow-hidden">
                    <OSIcon className="w-64 h-64 text-white" />
                </div>

                <div className="flex items-center gap-4 md:gap-6 relative z-10 w-full md:w-auto">
                    <div className={`p-3 md:p-5 rounded-2xl shadow-2xl border-2 shrink-0 ${isOnline ? 'bg-bg-secondary border-green-500/30' : 'bg-bg-secondary border-red-500/30'}`}>
                        <OSIcon className={`w-8 h-8 md:w-10 md:h-10 ${isOnline ? iconColor : 'text-text-secondary'}`} />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-2xl md:text-4xl font-bold text-text-primary tracking-tight truncate">{agent.hostname}</h1>
                        <div className="flex flex-wrap items-center gap-2 md:gap-3 mt-2">
                            <span className="px-3 py-1 rounded-full text-xs font-bold glass-button text-text-secondary whitespace-nowrap">
                                {agent.platform ? `${agent.platform} ${agent.platform_version}` : `${agent.os} / ${agent.arch}`}
                            </span>
                            <span className="text-text-secondary text-sm font-mono truncate">{agent.ip_address}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-3 relative z-10 w-full md:w-auto">
                    <div className="flex flex-wrap gap-2 w-full md:w-auto">
                        {(isOnline || isUpdating) && (
                            <button
                                onClick={triggerUpdateAgent}
                                disabled={isUpdating}
                                className={`glass-button flex-1 md:flex-none px-4 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-lg relative overflow-hidden group transition-all ${isUpdating
                                    ? 'text-yellow-400 shadow-yellow-500/10 cursor-wait'
                                    : 'text-blue-300 shadow-blue-500/10 hover:shadow-blue-500/20'
                                    }`}
                            >
                                {isUpdating ? (
                                    <>
                                        <span className="absolute inset-0 bg-yellow-400/20 animate-pulse"></span>
                                        <RefreshCw className="w-3 h-3 relative z-10 animate-spin" />
                                        <span className="relative z-10">UPDATING...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="absolute inset-0 bg-blue-400/20 group-hover:bg-blue-400/30 animate-pulse transition-all duration-1000"></span>
                                        <RefreshCw className="w-3 h-3 relative z-10" />
                                        <span className="relative z-10">UPDATE AGENT</span>
                                    </>
                                )}
                            </button>
                        )}
                        {isOnline ? (
                            <div className="flex-1 md:flex-none justify-center px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-sm font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(34,197,94,0.15)]"><Activity className="w-4 h-4" /> SYSTEM ONLINE</div>
                        ) : (
                            <div className="flex-1 md:flex-none justify-center px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm font-bold flex items-center gap-2 animate-pulse"><Wifi className="w-4 h-4" /> DISCONNECTED</div>
                        )}
                    </div>

                    {isOnline && agent.metrics && (
                        <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-3 text-xs bg-bg-secondary/50 px-3 py-1.5 rounded-lg border border-border-color text-text-secondary group/tooltip relative shadow-sm">
                            <span className="font-bold text-text-primary flex items-center gap-1 cursor-help">
                                {isWindows ? "QUEUE" : "LOAD"}
                                <HelpCircle className="w-3 h-3 text-text-secondary" />
                            </span>

                            <div className="flex items-center gap-1">
                                <span className={agent.metrics.load_1 >= 1 ? 'text-yellow-400' : 'text-green-400'}>{(agent.metrics.load_1 ?? 0).toFixed(2)}</span>
                                <span className="w-px h-3 bg-white/10 mx-1"></span>
                                <span>{(agent.metrics.load_5 ?? 0).toFixed(2)}</span>
                                <span className="w-px h-3 bg-white/10 mx-1"></span>
                                <span>{(agent.metrics.load_15 ?? 0).toFixed(2)}</span>
                            </div>

                            {/* Tooltip Popup */}
                            <div className="absolute top-full right-0 mt-2 w-64 glass-panel p-3 rounded text-[11px] text-text-secondary opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition z-50 leading-relaxed text-left">
                                <b className="text-text-primary block mb-1">System Load Average</b>
                                {isWindows
                                    ? "Processor Queue Length: Number of threads waiting for CPU time."
                                    : "Average number of running/waiting processes over 1, 5, and 15 minutes."}
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* SPECS GRID */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4 mb-8 relative z-0">
                <SpecItem icon={Cpu} label="CPU" value={agent.cpu_model} />
                <SpecItem icon={HardDrive} label="RAM" value={formatBytes(agent.total_memory)} />
                <SpecItem icon={Disc} label="DISK" value={formatBytes(agent.total_disk)} />
                <SpecItem icon={Layers} label="KERNEL" value={agent.kernel_version} />
                <SpecItem icon={Box} label="VIRTUAL" value={agent.virtualization || 'Physical'} />
                <SpecItem icon={Network} label="MAC" value={agent.mac_address || 'N/A'} />
                <SpecItem icon={Clock} label="UPTIME" value={isOnline && agent.boot_time ? formatDistanceToNow(new Date(agent.boot_time * 1000)) : '--'} />
            </div>

            {/* TABS */}
            <div className="flex gap-1 bg-bg-secondary/40 p-1 rounded-xl w-full md:w-fit mb-8 border border-border-color backdrop-blur-md overflow-x-auto custom-scrollbar">
                {['metrics', 'processes', 'services', 'logs', 'containers'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 md:px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 capitalize whitespace-nowrap flex-shrink-0 ${activeTab === tab ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-text-secondary hover:text-text-primary hover:bg-white/5'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* TAB CONTENT */}
            <div className="min-h-[400px]">
                {activeTab === 'metrics' && (
                    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
                        {/* CPU & RAM */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <MetricsChart agentId={agent.hostname} type="cpu" status={agent.status} />
                            <MetricsChart agentId={agent.hostname} type="ram" status={agent.status} />
                        </div>

                        {/* NETWORK */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <MetricsChart agentId={agent.hostname} type="net_down" status={agent.status} />
                            <MetricsChart agentId={agent.hostname} type="net_up" status={agent.status} />
                        </div>

                        {/* DISK I/O */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <MetricsChart agentId={agent.hostname} type="disk_read" status={agent.status} />
                            <MetricsChart agentId={agent.hostname} type="disk_write" status={agent.status} />
                        </div>

                        {/* TEMPERATURE */}
                        <div className="grid grid-cols-1">
                            <MetricsChart agentId={agent.hostname} type="temp" status={agent.status} />
                        </div>
                    </div>
                )}

                {activeTab === 'processes' && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500"><ProcessManager agentId={agent.hostname} isOnline={isOnline} /></div>}

                {activeTab === 'services' && <div className="animate-in fade-in slide-in-from-bottom-4 duration-500"><ServiceManager agentId={agent.hostname} isOnline={isOnline} /></div>}

                {activeTab === 'logs' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <Terminal logs={logs} loading={logsLoading} isOnline={isOnline} onRefresh={fetchLogs} />
                    </div>
                )}

                {activeTab === 'containers' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <ContainerTable containers={containers} loading={containersLoading} isOnline={isOnline} onRefresh={fetchContainers} onAction={handleDockerAction} />
                    </div>
                )}
            </div>

            {/* POWER MANAGEMENT ZONE */}
            <div className="mt-16 border border-red-500/10 rounded-2xl overflow-hidden glass-panel">
                <div className="bg-red-500/5 p-4 border-b border-red-500/10 flex items-center gap-3">
                    <div className="p-2 bg-red-500/10 rounded-lg"><Zap className="text-red-400 w-5 h-5" /></div>
                    <h3 className="text-red-200 font-bold text-lg">Power Management</h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* WAKE */}
                    <div className="flex flex-col gap-3 p-4 rounded-xl hover:bg-white/5 transition border border-transparent hover:border-white/5">
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-gray-200">Wake-on-LAN</h4>
                            <Wifi className="w-5 h-5 text-green-400" />
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">Send a magic packet to wake the device from sleep. Requires LAN connection.</p>
                        <button onClick={triggerWake} className="mt-auto glass-button bg-green-500/10 hover:bg-green-500/20 border-green-500/20 text-green-400 w-full py-2.5 rounded-lg font-bold text-sm tracking-wide">WAKE DEVICE</button>
                    </div>

                    {/* SUSPEND */}
                    <div className="flex flex-col gap-3 p-4 rounded-xl hover:bg-white/5 transition border border-transparent hover:border-white/5">
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-gray-200">Suspend</h4>
                            <Moon className="w-5 h-5 text-blue-300" />
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">Put the device into low-power sleep mode. Tasks will be paused.</p>
                        <button onClick={() => triggerSystemAction('suspend')} disabled={!isOnline} className="mt-auto glass-button bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20 text-blue-300 w-full py-2.5 rounded-lg font-bold text-sm tracking-wide disabled:opacity-50">SLEEP</button>
                    </div>

                    {/* REBOOT */}
                    <div className="flex flex-col gap-3 p-4 rounded-xl hover:bg-white/5 transition border border-transparent hover:border-white/5">
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-gray-200">Reboot</h4>
                            <RotateCw className="w-5 h-5 text-orange-400" />
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">Restart the machine immediately. Unsaved data will be lost.</p>
                        <button onClick={() => triggerSystemAction('reboot')} disabled={!isOnline} className="mt-auto glass-button bg-orange-500/10 hover:bg-orange-500/20 border-orange-500/20 text-orange-400 w-full py-2.5 rounded-lg font-bold text-sm tracking-wide disabled:opacity-50">REBOOT</button>
                    </div>

                    {/* SHUTDOWN */}
                    <div className="flex flex-col gap-3 p-4 rounded-xl hover:bg-white/5 transition border border-transparent hover:border-white/5">
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-gray-200">Shutdown</h4>
                            <Power className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">Power off completely. Physical access required to turn back on.</p>
                        <button onClick={() => triggerSystemAction('shutdown')} disabled={!isOnline} className="mt-auto glass-button bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400 w-full py-2.5 rounded-lg font-bold text-sm tracking-wide disabled:opacity-50">SHUTDOWN</button>
                    </div>

                    {/* DELETE DEVICE */}
                    <div className="flex flex-col gap-3 p-4 rounded-xl hover:bg-white/5 transition border border-transparent hover:border-red-500/20 col-span-full lg:col-span-1">
                        <div className="flex justify-between items-start">
                            <h4 className="font-bold text-gray-200">Remove Device</h4>
                            <Trash2 className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">Permanently remove this device from monitoring. Cannot be undone.</p>
                        <button onClick={handleDeleteDevice} className="mt-auto glass-button bg-red-500/20 hover:bg-red-500/30 border-red-500/30 text-red-400 w-full py-2.5 rounded-lg font-bold text-sm tracking-wide">DELETE DEVICE</button>
                    </div>
                </div>
            </div>

            {/* Toast Notification */}
            {toast.show && (
                <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border backdrop-blur-sm animate-in slide-in-from-bottom-4 ${toast.type === 'success'
                    ? 'bg-green-500/20 border-green-500/30 text-green-400'
                    : 'bg-red-500/20 border-red-500/30 text-red-400'
                    }`}>
                    {toast.type === 'success' ? (
                        <CheckCircle className="w-5 h-5" />
                    ) : (
                        <XCircle className="w-5 h-5" />
                    )}
                    <span className="text-sm font-medium">{toast.message}</span>
                    <button onClick={() => setToast({ ...toast, show: false })} className="ml-2 hover:opacity-70 transition">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}