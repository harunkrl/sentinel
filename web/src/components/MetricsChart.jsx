import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot } from 'recharts';
import axios from 'axios';
import { Cpu, HardDrive, Thermometer, Activity, Upload, Download } from 'lucide-react';
import { format } from 'date-fns';

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

// Helper to format values dynamically
const formatValue = (val, type) => {
    if (val === 0) return '0';

    // Disk: Base is MB/s. Convert to appropriate unit.
    if (type === 'disk_read' || type === 'disk_write') {
        if (val < 0.001) return '0 B/s';
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
        { label: '1H', value: '1h' },
        { label: '6H', value: '6h' },
        { label: '24H', value: '24h' },
        { label: '7D', value: '7d' },
        { label: '30D', value: '30d' },
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
                        else if (type === 'net_down') val = (d.net_recv || 0) / 1024;
                        else if (type === 'net_up') val = (d.net_sent || 0) / 1024;
                        else if (type === 'disk_read') val = d.disk_read_mbps;
                        else if (type === 'disk_write') val = d.disk_write_mbps;
                        return {
                            time: d.time,
                            value: val,
                            formattedTime: format(
                                new Date(d.time),
                                duration === '7d' || duration === '30d' ? 'MM/dd HH:mm' :
                                    duration === '24h' ? 'HH:mm' : 'HH:mm:ss'
                            )
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
        // Adjust polling based on duration - longer durations need less frequent updates
        const pollInterval = duration === '7d' || duration === '30d' ? 60000 : 10000;
        const interval = setInterval(fetchHistory, pollInterval);
        return () => clearInterval(interval);
    }, [agentId, type, duration]);

    // Fetch stats for CPU, RAM, Temp (stats only available for these types)
    useEffect(() => {
        const fetchStats = async () => {
            // Stats API only supports cpu, ram, temp
            if (!['cpu', 'ram', 'temp'].includes(type)) return;
            try {
                const res = await axios.get(`${API_BASE}/agent/${agentId}/stats?range=${duration}`);
                setStats(res.data);
            } catch (err) {
                console.error('Failed to fetch stats', err);
            }
        };
        fetchStats();
        const interval = setInterval(fetchStats, 5000);
        return () => clearInterval(interval);
    }, [agentId, duration, type]);

    const currentValue = data.length > 0 ? data[data.length - 1].value : 0;
    const isOnline = status === 'online';

    // Custom animated dot for current value
    const CurrentValueDot = (props) => {
        const { cx, cy } = props;
        if (!cx || !cy) return null;
        return (
            <g>
                {/* Outer glow */}
                <circle cx={cx} cy={cy} r="12" fill={color} opacity="0.2">
                    <animate attributeName="r" values="8;14;8" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
                </circle>
                {/* Inner dot */}
                <circle cx={cx} cy={cy} r="5" fill={color} stroke="white" strokeWidth="2" />
            </g>
        );
    };

    return (
        <div className={`bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-sm p-5 rounded-2xl border shadow-2xl flex flex-col h-80 transition-all ${isOnline ? 'border-white/10 hover:border-white/20' : 'border-red-900/30 opacity-80'}`}>
            {/* Header */}
            <div className="flex flex-wrap justify-between items-start mb-4 gap-4">
                <div>
                    <div className="flex items-center gap-2 text-sm font-medium mb-1" style={{ color: color }}>
                        <div className="p-1.5 rounded-lg" style={{ backgroundColor: `${color}20` }}>
                            <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-gray-300">{title}</span>
                    </div>

                    <div className="text-3xl font-bold text-white flex items-baseline gap-1">
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: color }} />
                                <span className="text-lg text-gray-500">Loading...</span>
                            </div>
                        ) : !isOnline ? (
                            <span className="text-red-400 text-xl font-mono">Offline</span>
                        ) : (
                            <>
                                <span style={{ textShadow: `0 0 20px ${color}40` }}>{formatValue(currentValue, type)}</span>
                                {unit && <span className="text-sm text-gray-500 font-normal ml-1">{unit}</span>}
                            </>
                        )}
                    </div>
                </div>

                {/* Time Range Selector */}
                <div className="flex bg-black/40 backdrop-blur-sm rounded-xl p-1 border border-white/10 overflow-x-auto max-w-full">
                    {timeRanges.map((range) => (
                        <button
                            key={range.value}
                            onClick={() => setDuration(range.value)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap ${duration === range.value
                                ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25'
                                : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                }`}
                        >
                            {range.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Badges */}
            {stats && ['cpu', 'ram', 'temp'].includes(type) && (
                <div className="flex gap-3 mb-3 text-xs">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-gray-700/50 to-gray-800/50 rounded-lg border border-white/5">
                        <span className="text-gray-500">Avg</span>
                        <span className="text-white font-semibold">
                            {(type === 'cpu' ? stats.cpu?.avg : type === 'ram' ? stats.ram?.avg : stats.temperature?.avg)?.toFixed(1) || '0'}{unit}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-green-500/10 to-green-600/5 rounded-lg border border-green-500/20">
                        <span className="text-green-400">Min</span>
                        <span className="text-white font-semibold">
                            {(type === 'cpu' ? stats.cpu?.min : type === 'ram' ? stats.ram?.min : stats.temperature?.min)?.toFixed(1) || '0'}{unit}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-red-500/10 to-red-600/5 rounded-lg border border-red-500/20">
                        <span className="text-red-400">Max</span>
                        <span className="text-white font-semibold">
                            {(type === 'cpu' ? stats.cpu?.max : type === 'ram' ? stats.ram?.max : stats.temperature?.max)?.toFixed(1) || '0'}{unit}
                        </span>
                    </div>
                </div>
            )}

            {/* Chart Area */}
            <div className="flex-1 w-full min-h-0">
                {loading && data.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: color }} />
                    </div>
                ) : data.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                        <Activity className="w-8 h-8 opacity-20" />
                        <span className="text-sm">No data available</span>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                            <defs>
                                {/* Enhanced gradient */}
                                <linearGradient id={`gradient${type}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                                    <stop offset="50%" stopColor={color} stopOpacity={0.15} />
                                    <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                                </linearGradient>
                                {/* Glow filter */}
                                <filter id={`glow${type}`} x="-50%" y="-50%" width="200%" height="200%">
                                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                                    <feMerge>
                                        <feMergeNode in="coloredBlur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="1 6"
                                stroke="#1f2937"
                                horizontal={true}
                                vertical={false}
                            />
                            <XAxis
                                dataKey="formattedTime"
                                stroke="#4b5563"
                                fontSize={10}
                                tickMargin={10}
                                minTickGap={30}
                                axisLine={{ stroke: '#374151' }}
                                tickLine={{ stroke: '#374151' }}
                            />
                            <YAxis
                                stroke="#4b5563"
                                fontSize={10}
                                domain={['auto', 'auto']}
                                width={40}
                                axisLine={{ stroke: '#374151' }}
                                tickLine={{ stroke: '#374151' }}
                                tickFormatter={(val) => {
                                    if (type === 'disk_read' || type === 'disk_write' || type === 'net_down' || type === 'net_up') {
                                        if (val === 0) return '0';
                                        return val < 1 ? val.toFixed(1) : val.toFixed(0);
                                    }
                                    return val.toFixed(0);
                                }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                                    borderColor: color,
                                    borderWidth: '2px',
                                    borderRadius: '12px',
                                    boxShadow: `0 0 20px ${color}40`,
                                    color: '#f3f4f6'
                                }}
                                itemStyle={{ color: color }}
                                formatter={(value) => [formatValue(value, type) + (unit ? unit : ''), title]}
                                labelStyle={{ color: '#9ca3af' }}
                                cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: '4 4', strokeOpacity: 0.5 }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={isOnline ? color : '#6b7280'}
                                strokeWidth={2.5}
                                strokeLinecap="round"
                                fillOpacity={1}
                                fill={`url(#gradient${type})`}
                                filter={isOnline ? `url(#glow${type})` : undefined}
                                animationDuration={300}
                                dot={false}
                                activeDot={<CurrentValueDot />}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}