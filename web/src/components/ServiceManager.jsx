import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Settings, Play, Square, RotateCcw, RefreshCw, Activity } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

export default function ServiceManager({ agentId, isOnline }) {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [selectedService, setSelectedService] = useState(null);
    const [modalAction, setModalAction] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const fetchServices = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/agent/${agentId}/services`);
            setServices(res.data || []);
        } catch (err) {
            console.error("Failed to fetch services", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOnline) {
            fetchServices();
        }
    }, [agentId, isOnline]);

    const handleActionClick = (serviceName, action) => {
        setSelectedService(serviceName);
        setModalAction(action);
        setShowModal(true);
    };

    const confirmAction = async () => {
        if (!selectedService || !modalAction) return;

        setActionLoading(selectedService);
        setShowModal(false);

        try {
            await axios.post(`/api/agent/${agentId}/service/action`, {
                service_name: selectedService,
                action: modalAction
            });
            // Re-fetch after a delay to allow state change
            setTimeout(fetchServices, 2000);
        } catch (err) {
            console.error(`Failed to ${modalAction} service`, err);
            alert(`Failed to ${modalAction} service`);
        } finally {
            setActionLoading(null);
            setSelectedService(null);
        }
    };

    return (
        <div className="glass-panel rounded-xl overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 border-b border-border-color flex flex-col md:flex-row justify-between items-center gap-4 bg-bg-secondary/40">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-text-primary">
                        <Settings className="w-5 h-5 text-purple-400" /> System Services
                    </h3>

                    <div className="relative flex-1 md:w-64">
                        <input
                            type="text"
                            placeholder="Search services..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-bg-primary border border-border-color rounded-lg py-1.5 px-3 pl-9 text-sm text-text-primary focus:outline-none focus:border-blue-500 transition shadow-sm"
                        />
                        <RefreshCw className="absolute left-3 top-2 w-4 h-4 text-gray-500" />
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-xs text-text-secondary hidden md:inline-block">
                        {/* Simple count if needed, or leave blank to match containers */}
                        ({services.filter(svc => svc.name.toLowerCase().includes(searchTerm.toLowerCase())).length}/{services.length})
                    </span>
                    <button
                        onClick={fetchServices}
                        disabled={loading || !isOnline}
                        className="glass-button px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 text-text-secondary hover:text-text-primary disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto bg-gray-950/30">
                <table className="w-full text-left text-sm text-text-secondary">
                    <thead className="bg-bg-secondary/50 text-text-secondary font-medium uppercase text-xs sticky top-0 backdrop-blur-md z-10">
                        <tr>
                            <th className="px-6 py-3">Service Name</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Description</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color">
                        {services.length === 0 ? (
                            <tr><td colSpan="4" className="px-6 py-8 text-center text-text-secondary">{loading ? "Loading services..." : "No services found."}</td></tr>
                        ) : (
                            services
                                .filter(svc => svc.name.toLowerCase().includes(searchTerm.toLowerCase()) || (svc.description && svc.description.toLowerCase().includes(searchTerm.toLowerCase())))
                                .map((svc) => {
                                    const isRunning = svc.active_state === 'active' && svc.sub_state === 'running';
                                    const isFailed = svc.active_state === 'failed';
                                    const isLoading = actionLoading === svc.name;

                                    return (
                                        <tr key={svc.name} className="hover:bg-white/5 transition group">
                                            <td className="px-6 py-3 font-medium text-text-primary flex items-center gap-3">
                                                <Activity className={`w-4 h-4 ${isRunning ? 'text-green-400' : isFailed ? 'text-red-400' : 'text-gray-500'}`} />
                                                {svc.name}
                                            </td>
                                            <td className="px-6 py-3 whitespace-nowrap">
                                                <span className={`px-2 py-1 rounded text-xs font-bold border ${isRunning
                                                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                    : isFailed
                                                        ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                        : 'bg-gray-500/10 text-text-secondary border-gray-500/20'
                                                    }`}>
                                                    {svc.active_state} ({svc.sub_state})
                                                </span>
                                            </td>
                                            <td className="px-6 py-3 text-xs text-text-secondary truncate max-w-xs" title={svc.description}>
                                                {svc.description}
                                            </td>
                                            <td className="px-6 py-3 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {isLoading ? (
                                                    <RefreshCw className="w-4 h-4 animate-spin text-text-secondary" />
                                                ) : (
                                                    <>
                                                        {isRunning ? (
                                                            <>
                                                                <button onClick={() => handleActionClick(svc.name, 'restart')} className="p-1.5 bg-blue-500/10 text-blue-400 rounded hover:bg-blue-500/20 border border-blue-500/20 transition" title="Restart"><RotateCcw className="w-4 h-4" /></button>
                                                                <button onClick={() => handleActionClick(svc.name, 'stop')} className="p-1.5 bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 border border-red-500/20 transition" title="Stop"><Square className="w-4 h-4" /></button>
                                                            </>
                                                        ) : (
                                                            <button onClick={() => handleActionClick(svc.name, 'start')} className="p-1.5 bg-green-500/10 text-green-400 rounded hover:bg-green-500/20 border border-green-500/20 transition" title="Start"><Play className="w-4 h-4" /></button>
                                                        )}
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                        )}
                    </tbody>
                </table>
            </div>

            <ConfirmationModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onConfirm={confirmAction}
                title={`${modalAction === 'start' ? 'Start' : modalAction === 'stop' ? 'Stop' : 'Restart'} Service?`}
                message={`Are you sure you want to ${modalAction} the service "${selectedService}"? This might affect system stability.`}
                confirmText={modalAction.toUpperCase()}
                isDanger={modalAction === 'stop'}
            />
        </div>
    );
}
