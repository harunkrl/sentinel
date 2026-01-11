import {
    Download,
    Github,
    Activity,
    Server,
    Wifi,
    Cpu,
    HardDrive,
    Terminal,
    Monitor,
    List,
    RefreshCw,
    Container,
    Clock,
    Settings,
    Trash2,
    LogOut,
    Star,
    Thermometer,
    Plus,
    ArrowLeft,
    HelpCircle,
    Box,
    Layers,
    Disc,
    Network,
    Zap,
    Moon,
    RotateCw,
    Power,
    CheckCircle,
    XCircle,
    X,
    LayoutDashboard,
    Bell,
    ShieldCheck,
    ArrowRight,
    Check,
    Lock,
    Eye,
    Code,
    Gauge
} from "lucide-react";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import TerminalTyper from "../components/TerminalTyper";
import AgentCard from "../components/AgentCard";
import { getOSIcon } from "../utils/osHelpers";

export default function Home() {

    const ubuntuAgent = { os: 'ubuntu', hostname: 'ubuntu-server' };
    const windowsAgent = { os: 'windows', hostname: 'win-server-02' };

    const { icon: UbuntuIcon, color: ubuntuColor } = getOSIcon(ubuntuAgent);
    const { icon: WindowsIcon, color: windowsColor } = getOSIcon(windowsAgent);

    const terminalLines = [
        {
            prefix: "➜ ",
            text: "./compile_and_run.sh --prod",
            className: "text-white",
            wrapperClassName: "flex gap-2 mb-4 text-gray-300"
        },
        { text: "🚀 Sentinel Server Setup", className: "text-blue-400 font-bold" },
        { text: "Mode: prod | Version: 5163d6e", className: "text-gray-500" },
        { text: "------------------------------------------------", className: "text-gray-500" },
        { text: "⚙  Generating gRPC Code...", className: "text-yellow-400" },
        { text: "   ✅ Proto files generated successfully.", className: "text-green-400" },
        { text: "🔨 Compiling Agents for Multi-Architecture...", className: "text-blue-300" },
        { text: "   - Building Linux AMD64...", className: "text-gray-400" },
        { text: "   - Building Linux ARM64...", className: "text-gray-400" },
        { text: "   - Building Windows AMD64...", className: "text-gray-400" },
        { text: "📦 Starting Backend Services (prod mode)...", className: "text-purple-400" },
        { text: " => [core builder 5/6] COPY . .", className: "text-gray-500 text-xs" },
        { text: " => [core builder 6/6] RUN go build -o core ./cmd/core", className: "text-gray-500 text-xs" },
        { text: " ✔ Image sentinel-core Built", className: "text-green-400" },
        { text: " ✔ Image sentinel-web  Built", className: "text-green-400" },
        { text: "🎉 System Ready! (prod mode)", className: "text-yellow-400 font-bold mt-2" },
        { text: "Dashboard: http://<SERVER_IP>:80", className: "text-blue-400 underline" }
    ];

    const features = [
        { icon: Gauge, title: "Real-time Metrics", desc: "CPU, RAM, Disk, Network, Temperature streamed via gRPC", color: "blue" },
        { icon: Container, title: "Docker Control", desc: "Start, stop, restart containers from dashboard", color: "green" },
        { icon: Terminal, title: "Process Manager", desc: "View and kill processes remotely", color: "red" },
        { icon: Bell, title: "Smart Alerts", desc: "Push notifications via Ntfy when thresholds exceeded", color: "yellow" },
        { icon: RefreshCw, title: "Auto Updates", desc: "One-click agent updates across your fleet", color: "purple" },
        { icon: Lock, title: "100% Private", desc: "Self-hosted. Your data never leaves your servers", color: "emerald" }
    ];

    return (
        <div className="relative flex flex-col min-h-screen">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0 grid-bg"></div>
            <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-transparent via-background-dark/80 to-background-dark"></div>

            <Header />

            <main className="flex-grow z-10 w-full pt-16 sm:pt-18">
                {/* Hero Section */}
                <div className="relative pt-12 pb-12 sm:pt-16 sm:pb-24 overflow-hidden">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="lg:grid lg:grid-cols-12 lg:gap-16 items-center">
                            <div className="lg:col-span-6 text-left mb-12 lg:mb-0">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-6">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                    </span>
                                    v2.3 — Free & Open Source
                                </div>
                                <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold tracking-tight text-white leading-[1.1] mb-6">
                                    Your Servers. Your Data. <br />
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-300">Total Control.</span>
                                </h1>
                                <p className="text-base sm:text-lg text-gray-400 mb-8 max-w-xl font-body leading-relaxed">
                                    Lightweight Go agent for real-time infrastructure monitoring.
                                    gRPC streaming, Docker management, and secure remote control — 100% self-hosted.
                                </p>
                                <div className="flex flex-wrap gap-3 sm:gap-4">
                                    <Link href="/docs" className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white text-sm sm:text-base font-bold h-11 sm:h-12 px-5 sm:px-6 rounded-lg transition-all shadow-[0_0_20px_-5px_#0da6f2]">
                                        Get Started <ArrowRight className="w-4 h-4" />
                                    </Link>
                                    <a href="https://github.com/harunkrl/sentinel" target="_blank" className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm sm:text-base font-bold h-11 sm:h-12 px-5 sm:px-6 rounded-lg backdrop-blur-sm transition-all">
                                        <Github className="w-5 h-5" /> Star on GitHub
                                    </a>
                                </div>
                            </div>
                            <div className="lg:col-span-6 relative">
                                <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full opacity-30"></div>
                                <div className="relative rounded-xl overflow-hidden glass-panel code-glow border border-white/10 h-[600px] flex flex-col">
                                    <div className="flex items-center gap-2 px-4 py-3 bg-white/5 border-b border-white/5 shrink-0">
                                        <div className="flex gap-1.5">
                                            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                                            <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                                            <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                                        </div>
                                        <div className="text-xs text-gray-500 font-mono ml-2">bash — Server Setup</div>
                                    </div>
                                    <div className="p-4 sm:p-6 font-mono text-sm leading-relaxed overflow-hidden text-gray-300 flex-1">
                                        <TerminalTyper lines={terminalLines} speed={12} startDelay={500} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Platform Support */}
                <div className="py-12 sm:py-16 border-t border-white/5">
                    <p className="text-center text-xs sm:text-sm font-mono text-gray-500 mb-6 uppercase tracking-widest">Deploy anywhere</p>
                    <div className="flex flex-wrap justify-center gap-3 sm:gap-6 px-4">
                        {[
                            { icon: Terminal, label: "Linux", hoverColor: "group-hover:text-primary" },
                            { icon: Monitor, label: "Windows", hoverColor: "group-hover:text-blue-400" },
                            { icon: Cpu, label: "Raspberry Pi", hoverColor: "group-hover:text-red-400" },
                            { icon: Container, label: "Docker", hoverColor: "group-hover:text-green-400" }
                        ].map(({ icon: Icon, label, hoverColor }) => (
                            <div key={label} className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors group">
                                <Icon className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-500 ${hoverColor} transition-colors`} />
                                <span className="font-bold text-sm sm:text-base text-gray-300 group-hover:text-white transition-colors">{label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Features Grid - 3x2 balanced layout */}
                <div className="py-16 sm:py-24 bg-surface-dark/30 border-y border-white/5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12 sm:mb-16">
                            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Everything You Need</h2>
                            <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base">
                                Built for developers who want powerful monitoring without the complexity.
                            </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                            {features.map(({ icon: Icon, title, desc, color }) => (
                                <div key={title} className="glass-panel p-6 sm:p-8 rounded-xl border border-white/10 hover:bg-glass-hover transition-colors group">
                                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-${color}-500/20 text-${color}-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </div>
                                    <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{title}</h3>
                                    <p className="text-gray-400 text-sm">{desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Architecture Section with Animated Lines */}
                <div className="py-16 sm:py-20 bg-background-dark relative">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12 sm:mb-16">
                            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">High-Performance Architecture</h2>
                            <p className="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base">
                                Modern stack for maximum throughput and minimal resource footprint.
                            </p>
                        </div>
                        <div className="relative">
                            {/* Animated connection line */}
                            <div className="hidden md:block absolute top-1/2 left-0 w-full h-1 -translate-y-1/2 z-0 overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-transparent via-primary/50 to-transparent animate-pulse"></div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 relative z-10">
                                {[
                                    { icon: Cpu, title: "Agents", desc: "Lightweight collectors", tech: "Go", techColor: "cyan" },
                                    { icon: Network, title: "Transport", desc: "Bidirectional streaming", tech: "gRPC", techColor: "purple" },
                                    { icon: Server, title: "Core Server", desc: "Aggregation & Alerts", tech: "InfluxDB", techColor: "pink" },
                                    { icon: LayoutDashboard, title: "Dashboard", desc: "Real-time UI", tech: "React", techColor: "blue" }
                                ].map(({ icon: Icon, title, desc, tech, techColor }, i) => (
                                    <div key={title} className="group">
                                        <div className="p-6 rounded-xl border border-white/5 bg-background-dark/40 backdrop-blur-md hover:border-primary/50 transition-all duration-300 h-full flex flex-col items-center text-center group-hover:bg-background-dark/60">
                                            <div className={`w-12 h-12 rounded-lg bg-${techColor === 'cyan' ? 'blue' : techColor}-500/20 text-${techColor === 'cyan' ? 'blue' : techColor}-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
                                            <p className="text-sm text-gray-500 mb-4">{desc}</p>
                                            <div className={`mt-auto px-3 py-1 bg-white/5 rounded-full text-xs font-mono text-${techColor}-400 border border-${techColor}-500/30`}>{tech}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Preview - Simplified */}
                <div className="py-16 sm:py-20 bg-surface-dark/50 border-y border-white/5">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="mb-12 text-center">
                            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Real-time Command Center</h2>
                            <p className="text-gray-400 text-sm sm:text-base">Monitor your entire infrastructure at a glance. Live updates via Server-Sent Events.</p>
                        </div>

                        <div className="glass-panel rounded-2xl p-4 sm:p-6 border border-white/10 shadow-2xl relative overflow-hidden bg-[#0a0a0a]">
                            {/* Header */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
                                <div className="flex items-center gap-3 sm:gap-4">
                                    <div className="p-2.5 sm:p-3 bg-blue-500/10 rounded-xl shrink-0 border border-blue-500/20 relative">
                                        <div className="absolute inset-0 bg-blue-500/20 blur-md rounded-full opacity-50"></div>
                                        <img src="/logo.svg" alt="Sentinel Logo" className="w-6 h-6 sm:w-8 sm:h-8 relative" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Sentinel Dashboard</h3>
                                        <p className="text-gray-500 text-xs sm:text-sm">System Monitoring & Management</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                                    <div className="p-2 sm:p-2.5 rounded-xl border border-white/10 bg-white/5 text-green-400 opacity-50"><Plus className="w-4 h-4 sm:w-5 sm:h-5" /></div>
                                    <div className="p-2 sm:p-2.5 rounded-xl border border-white/10 bg-white/5 text-gray-400 opacity-50"><Settings className="w-4 h-4 sm:w-5 sm:h-5" /></div>
                                </div>
                            </div>

                            {/* Stats Overview */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
                                {[
                                    { icon: Server, label: "Agents", value: "12", color: "blue" },
                                    { icon: Wifi, label: "Online", value: "12", color: "green" },
                                    { icon: Cpu, label: "Avg CPU", value: "24.5%", color: "indigo" },
                                    { icon: HardDrive, label: "Avg RAM", value: "42.1%", color: "purple" }
                                ].map(({ icon: Icon, label, value, color }) => (
                                    <div key={label} className="glass-card p-3 sm:p-5 rounded-xl sm:rounded-2xl flex items-center gap-3 sm:gap-4 border border-white/5 bg-white/5">
                                        <div className={`p-2 sm:p-3 bg-${color}-500/20 rounded-lg sm:rounded-xl text-${color}-400`}>
                                            <Icon className="w-4 h-4 sm:w-6 sm:h-6" />
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider">{label}</p>
                                            <p className="text-lg sm:text-2xl font-bold text-white mt-0.5">{value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Agent Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                                <AgentCard
                                    agent={{ ...ubuntuAgent, ip: '10.0.0.15' }}
                                    metrics={{ cpu: '45.2%', ram: '62.1%', disk: '78%', temp: '42°C' }}
                                    uptime="12d 4h"
                                    load="0.45"
                                />
                                <AgentCard
                                    agent={{ ...windowsAgent, ip: '10.0.0.16' }}
                                    metrics={{ cpu: '12.4%', ram: '34.8%', disk: '45%', temp: '--' }}
                                    uptime="5d 12h"
                                    load="1.2"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Agent Detail Section */}
                <div className="py-16 sm:py-24 bg-background-dark relative">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-start">
                            <div className="lg:w-1/3 lg:sticky lg:top-24">
                                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">Deep Insights & Control</h2>
                                <p className="text-gray-400 mb-8">
                                    Drill down into any agent for detailed metrics, process management, and remote actions.
                                </p>
                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="bg-blue-500/10 p-3 rounded-lg text-blue-400 h-fit">
                                            <Zap className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold">Live Metrics</h4>
                                            <p className="text-sm text-gray-500">CPU, RAM, Disk I/O with historical charts</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="bg-purple-500/10 p-3 rounded-lg text-purple-400 h-fit">
                                            <RefreshCw className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold">Remote Updates</h4>
                                            <p className="text-sm text-gray-500">One-click agent upgrades</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="bg-red-500/10 p-3 rounded-lg text-red-400 h-fit">
                                            <Power className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold">Power Control</h4>
                                            <p className="text-sm text-gray-500">Reboot or shutdown remotely</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:w-2/3 w-full">
                                <div className="glass-panel border border-white/10 rounded-2xl overflow-hidden shadow-2xl bg-[#0a0a0a]">
                                    {/* Agent Header */}
                                    <div className="p-4 sm:p-6 border-b border-white/5">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 sm:p-4 rounded-2xl bg-[#0a0f18] border-2 border-green-500/30">
                                                    <UbuntuIcon className={`w-8 h-8 ${ubuntuColor}`} />
                                                </div>
                                                <div>
                                                    <h3 className="text-2xl sm:text-3xl font-bold text-white">ubuntu-server</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="px-2 py-0.5 rounded-full text-xs bg-white/5 border border-white/10 text-gray-400">Ubuntu 22.04</span>
                                                        <span className="text-gray-500 text-sm font-mono">10.0.0.15</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <div className="bg-blue-500/10 text-blue-300 border border-blue-500/20 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
                                                    <RefreshCw className="w-3 h-3" /> UPDATE
                                                </div>
                                                <div className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded-lg text-xs font-bold flex items-center gap-1.5">
                                                    <Activity className="w-3 h-3" /> ONLINE
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 sm:p-6 bg-black/20">
                                        {/* Specs Grid */}
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                                            {[
                                                { icon: Cpu, label: "CPU", value: "AMD EPYC", color: "blue" },
                                                { icon: HardDrive, label: "RAM", value: "64 GB", color: "purple" },
                                                { icon: Disc, label: "Disk", value: "512 GB", color: "orange" },
                                                { icon: Clock, label: "Uptime", value: "12 days", color: "green" }
                                            ].map(({ icon: Icon, label, value, color }) => (
                                                <div key={label} className="glass-card flex items-start gap-3 p-3 sm:p-4 rounded-xl border border-white/5">
                                                    <div className={`p-2 bg-white/5 rounded-lg text-${color}-400`}><Icon className="w-4 h-4 sm:w-5 sm:h-5" /></div>
                                                    <div>
                                                        <p className="text-[10px] sm:text-xs text-gray-500 uppercase font-bold">{label}</p>
                                                        <p className="text-xs sm:text-sm font-medium text-white">{value}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Tabs */}
                                        <div className="flex gap-1 bg-white/5 p-1 rounded-xl w-fit mb-6 border border-white/5 overflow-x-auto">
                                            <button className="px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-medium bg-blue-600 text-white">Metrics</button>
                                            <button className="px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-500">Processes</button>
                                            <button className="px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-500">Containers</button>
                                        </div>

                                        {/* Charts */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6">
                                            <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4 h-48 relative overflow-hidden">
                                                <div className="flex justify-between mb-2">
                                                    <span className="text-xs font-bold text-gray-400 flex gap-2"><Cpu className="w-3 h-3 text-blue-400" /> CPU Usage</span>
                                                    <span className="text-lg font-bold text-white">45.2%</span>
                                                </div>
                                                <div className="absolute bottom-0 left-0 right-0 top-10" style={{ backgroundImage: 'linear-gradient(to top, rgba(59, 130, 246, 0.2), transparent)' }}>
                                                    <svg viewBox="0 0 100 40" className="w-full h-full" preserveAspectRatio="none">
                                                        <path d="M0,35 Q10,32 20,35 T40,30 T60,20 T80,25 T100,15" fill="none" stroke="#3b82f6" strokeWidth="0.5" />
                                                    </svg>
                                                </div>
                                            </div>
                                            <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-4 h-48 relative overflow-hidden">
                                                <div className="flex justify-between mb-2">
                                                    <span className="text-xs font-bold text-gray-400 flex gap-2"><Thermometer className="w-3 h-3 text-red-500" /> CPU Temp</span>
                                                    <span className="text-lg font-bold text-white">42°C</span>
                                                </div>
                                                <div className="absolute bottom-0 left-0 right-0 top-10" style={{ backgroundImage: 'linear-gradient(to top, rgba(239, 68, 68, 0.2), transparent)' }}>
                                                    <svg viewBox="0 0 100 40" className="w-full h-full" preserveAspectRatio="none">
                                                        <path d="M0,25 Q10,23 20,25 T40,22 T60,30 T80,28 T100,20" fill="none" stroke="#ef4444" strokeWidth="0.5" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Power Management */}
                                        <div className="border border-red-500/10 rounded-xl overflow-hidden bg-red-500/5">
                                            <div className="bg-red-500/5 p-3 sm:p-4 border-b border-red-500/10 flex items-center gap-3">
                                                <div className="p-2 bg-red-500/10 rounded-lg"><Zap className="text-red-400 w-4 h-4" /></div>
                                                <h3 className="text-red-200 font-bold text-sm sm:text-base">Power Management</h3>
                                            </div>
                                            <div className="p-4 grid grid-cols-2 gap-4">
                                                <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/5 border border-white/5">
                                                    <div className="flex justify-between items-center">
                                                        <h4 className="font-bold text-gray-200 text-xs sm:text-sm">Reboot</h4>
                                                        <RotateCw className="w-4 h-4 text-orange-400" />
                                                    </div>
                                                    <button className="py-2 rounded bg-orange-500/10 text-orange-400 text-xs font-bold">REBOOT</button>
                                                </div>
                                                <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/5 border border-white/5">
                                                    <div className="flex justify-between items-center">
                                                        <h4 className="font-bold text-gray-200 text-xs sm:text-sm">Shutdown</h4>
                                                        <Power className="w-4 h-4 text-red-500" />
                                                    </div>
                                                    <button className="py-2 rounded bg-red-500/10 text-red-400 text-xs font-bold">SHUTDOWN</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Comparison - Why Sentinel */}
                <div className="py-16 sm:py-24 bg-background-dark">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="text-center mb-12 sm:mb-16">
                            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Why Sentinel?</h2>
                            <p className="text-gray-400 text-sm sm:text-base">Simple, lightweight, and yours.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
                            {[
                                { icon: Zap, title: "Lightweight", items: ["~10MB agent binary", "Minimal RAM footprint", "Zero dependencies"] },
                                { icon: Lock, title: "Privacy-First", items: ["100% self-hosted", "No telemetry", "Your data stays yours"] },
                                { icon: Code, title: "Developer-Friendly", items: ["Simple REST API", "gRPC streaming", "MIT Licensed"] }
                            ].map(({ icon: Icon, title, items }) => (
                                <div key={title} className="p-6 sm:p-8 rounded-2xl border border-white/10 bg-white/5">
                                    <div className="w-12 h-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center mb-6">
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-4">{title}</h3>
                                    <ul className="space-y-3">
                                        {items.map((item, i) => (
                                            <li key={i} className="flex items-center gap-3 text-gray-400 text-sm">
                                                <Check className="w-4 h-4 text-green-400 shrink-0" />
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Final CTA */}
                <div className="py-16 sm:py-20 relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent"></div>
                    <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-bold mb-6">
                            <ShieldCheck className="w-4 h-4" /> Free & Open Source — MIT License
                        </div>
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 sm:mb-6">Start Monitoring in Seconds</h2>
                        <p className="text-gray-400 mb-8 sm:mb-10 text-base sm:text-lg max-w-2xl mx-auto">
                            Deploy the lightweight agent and get real-time insights immediately. No signup required.
                        </p>
                        <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                            <Link href="/docs" className="bg-primary hover:bg-primary/90 text-white text-base sm:text-lg font-bold py-3 px-8 rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2">
                                Get Started <ArrowRight className="w-5 h-5" />
                            </Link>
                            <a href="https://github.com/harunkrl/sentinel" target="_blank" className="bg-white/5 hover:bg-white/10 border border-white/10 text-white text-base sm:text-lg font-bold py-3 px-8 rounded-lg transition-all flex items-center justify-center gap-2">
                                <Star className="w-5 h-5" /> Star on GitHub
                            </a>
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
