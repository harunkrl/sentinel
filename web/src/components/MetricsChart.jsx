import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import { Cpu, HardDrive, Thermometer, Activity, Upload, Download } from 'lucide-react';
import { format } from 'date-fns';

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

// status prop added
// Helper to format values dynamically
const formatValue = (val, type) => {
    if (val === 0) return '0';

    // Disk: Base is MB/s. Convert to appropriate unit.
    if (type === 'disk_read' || type === 'disk_write') {
        if (val < 0.001) return '0 B/s'; // < 1KB/s
        if (val < 1) return `${(val * 1024).toFixed(1)} KB/s`;
        return `${val.toFixed(1)} MB/s`;
    }

    // Network: Base is KB/s.
    if (type === 'net_down' || type === 'net_up') {
        if (val < 1) return `${(val * 1024).toFixed(0)} B/s`;
        if (val > 1024) return `${(val / 1024).toFixed(1)} MB/s`;
        return `${val.toFixed(1)} KB/s`;
    }

    return val.toFixed(1);
};

export default function MetricsChart({ agentId, type, status }) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [duration, setDuration] = useState('1h');
    const [stats, setStats] = useState(null);

    const config = {
        cpu: { color: '#3b82f6', title: 'CPU Usage', icon: Cpu, unit: '%' },
        ram: { color: '#8b5cf6', title: 'RAM Usage', icon: HardDrive, unit: '%' },
        temp: { color: '#f97316', title: 'CPU Temperature', icon: Thermometer, unit: '°C' },
        net_down: { color: '#10b981', title: 'Download', icon: Download, unit: '' },
        net_up: { color: '#0ea5e9', title: 'Upload', icon: Upload, unit: '' },
        disk_read: { color: '#8b5cf6', title: 'Disk Read', icon: Download, unit: '' },
        disk_write: { color: '#f43f5e', title: 'Disk Write', icon: Upload, unit: '' }
    };

    const { color, title, icon: Icon, unit } = config[type] || config.cpu;

    const timeRanges = [
        { label: '1M', value: '1m' },
        { label: '1H', value: '1h' },
        { label: '6H', value: '6h' },
        { label: '12H', value: '12h' },
        { label: '24H', value: '24h' },
    ];

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await axios.get(`${API_BASE}/agent/${agentId}/history?duration=${duration}`);
                const formatted = res.data
                    .map(d => {
                        let val = 0;
                        if (type === 'cpu') val = d.cpu_usage;
                        else if (type === 'ram') val = d.ram_usage;
                        else if (type === 'temp') val = d.temperature;
                        else if (type === 'net_down') val = (d.net_recv || 0) / 1024; // To KB/s
                        else if (type === 'net_up') val = (d.net_sent || 0) / 1024;   // To KB/s
                        else if (type === 'disk_read') val = d.disk_read_mbps;        // Already MB/s
                        else if (type === 'disk_write') val = d.disk_write_mbps;      // Already MB/s
                        return {
                            time: d.time,
                            value: val,
                            formattedTime: format(new Date(d.time), duration === '24h' || duration === '12h' ? 'HH:mm' : 'HH:mm:ss')
                        };
                    })
                    .filter(d => d.value !== undefined && d.value !== null);

                setData(formatted);
                setLoading(false);
            } catch (err) {
                console.error("Failed to fetch history", err);
                setLoading(false);
            }
        };

        fetchHistory();
        const interval = setInterval(fetchHistory, 5000);
        return () => clearInterval(interval);
    }, [agentId, type, duration]);

    // Fetch stats for CPU, RAM, Temp, Disk
    useEffect(() => {
        const fetchStats = async () => {
            // Only fetch for relevant types
            if (!['cpu', 'ram', 'temp'].includes(type)) return;

            try {
                const res = await axios.get(`${API_BASE}/agent/${agentId}/stats?range=${duration}`);
                setStats(res.data);
            } catch (err) {
                console.error('Failed to fetch stats', err);
            }
        };
        fetchStats();
        // Also refresh stats when history refreshes
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, [agentId, duration, type]);

    const currentValue = data.length > 0 ? data[data.length - 1].value : 0;
    const isOnline = status === 'online';

    return (
        <div className={`bg-gray-800 p-5 rounded-xl border shadow-lg flex flex-col h-80 transition-all ${isOnline ? 'border-gray-700' : 'border-red-900/30 opacity-80'}`}>
            <div className="flex flex-wrap justify-between items-start mb-4 gap-4">
                <div>
                    <div className="flex items-center gap-2 text-gray-400 text-sm font-medium mb-1">
                        <Icon className="w-4 h-4" style={{ color: color }} />
                        {title}
                    </div>

                    <div className="text-3xl font-bold text-white flex items-baseline gap-1">
                        {loading ? (
                            <span className="text-lg text-gray-500">Loading...</span>
                        ) : !isOnline ? (
                            <span className="text-red-400 text-xl font-mono">Offline</span>
                        ) : (
                            <>
                                {formatValue(currentValue, type)}
                                {unit && <span className="text-sm text-gray-500 font-normal ml-1">{unit}</span>}
                            </>
                        )}
                    </div>
                </div>

                <div className="flex bg-gray-900 rounded-lg p-1 border border-gray-700 overflow-x-auto max-w-full">
                    {timeRanges.map((range) => (
                        <button
                            key={range.value}
                            onClick={() => setDuration(range.value)}
                            className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${duration === range.value
                                ? 'bg-gray-700 text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
                                }`}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Badges */}
            {stats && ['cpu', 'ram', 'temp'].includes(type) && (
                <div className="flex gap-4 mb-3 text-xs">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-700/50 rounded-lg">
                        <span className="text-gray-500">Avg</span>
                        <span className="text-white font-medium">
                            {(type === 'cpu' ? stats.cpu?.avg : type === 'ram' ? stats.ram?.avg : stats.temperature?.avg)?.toFixed(1) || '0'}{unit}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 rounded-lg">
                        <span className="text-green-400">Min</span>
                        <span className="text-white font-medium">
                            {(type === 'cpu' ? stats.cpu?.min : type === 'ram' ? stats.ram?.min : stats.temperature?.min)?.toFixed(1) || '0'}{unit}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 rounded-lg">
                        <span className="text-red-400">Max</span>
                        <span className="text-white font-medium">
                            {(type === 'cpu' ? stats.cpu?.max : type === 'ram' ? stats.ram?.max : stats.temperature?.max)?.toFixed(1) || '0'}{unit}
                        </span>
                    </div>
                </div>
            )}

            <div className="flex-1 w-full min-h-0">
                {loading && data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500 animate-pulse">Loading...</div>
                ) : data.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                        <Activity className="w-8 h-8 opacity-20" />
                        <span className="text-sm">No data</span>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                <linearGradient id={`color${type}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                            <XAxis
                                dataKey="formattedTime"
                                stroke="#6b7280"
                                fontSize={10}
                                tickMargin={10}
                                minTickGap={30}
                            />
                            <YAxis
                                stroke="#6b7280"
                                fontSize={10}
                                domain={['auto', 'auto']}
                                width={40}
                                tickFormatter={(val) => {
                                    if (type === 'disk_read' || type === 'disk_write' || type === 'net_down' || type === 'net_up') {
                                        // Simplified axis labels
                                        if (val === 0) return '0';
                                        return val < 1 ? val.toFixed(1) : val.toFixed(0);
                                    }
                                    return val.toFixed(0);
                                }}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#f3f4f6', borderRadius: '0.5rem' }}
                                itemStyle={{ color: color }}
                                formatter={(value) => [formatValue(value, type) + (unit ? unit : ''), title]}
                                labelStyle={{ color: '#9ca3af' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={isOnline ? color : '#6b7280'}
                                strokeWidth={2}
                                fillOpacity={1}
                                fill={`url(#color${type})`}
                                animationDuration={300}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}