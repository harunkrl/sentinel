
"use client";

import { useState, useEffect, useRef } from "react";
import {
    Shield, Code, Info, Settings, Variable, Wrench, RefreshCw,
    Bolt, Cpu, Copy, AlertTriangle, Check, Terminal, Server, Lock,
    Container, Monitor, Network, Database, Bell, Zap, ExternalLink,
    Play, Square, Layers, FileCode, Menu, X
} from 'lucide-react';

// Section IDs for scroll tracking
const SECTION_IDS = [
    'introduction', 'quick-start', 'architecture',
    'docker-deployment', 'env-vars', 'production',
    'linux-install', 'windows-install', 'agent-config',
    'dashboard-features', 'agent-management', 'remote-control',
    'api-reference', 'security', 'alerts',
    'troubleshooting', 'updates'
];

// Syntax highlighting for bash commands
const highlightBash = (code) => {
    return code.split('\n').map((line, i) => {
        // Comment lines
        if (line.trim().startsWith('#')) {
            return <span key={i} className="text-gray-500 italic">{line}{'\n'}</span>;
        }

        // Process line with multiple tokens
        const tokens = [];
        let remaining = line;
        let key = 0;

        // Match patterns
        const patterns = [
            { regex: /^(curl|sudo|bash|git|cd|cp|nano|docker|docker-compose|npm|go|protoc|systemctl|journalctl|\.\/)/, className: 'text-purple-400 font-semibold' },
            { regex: /(-{1,2}[a-zA-Z][a-zA-Z0-9-]*)/, className: 'text-yellow-400' },
            { regex: /(\|)/, className: 'text-pink-400 font-bold' },
            { regex: /(https?:\/\/[^\s]+)/, className: 'text-blue-400 underline' },
            { regex: /(<[A-Z_]+>)/, className: 'text-cyan-400' },
            { regex: /("[^"]*")/, className: 'text-green-400' },
            { regex: /(\$[A-Za-z_][A-Za-z0-9_]*)/, className: 'text-orange-400' },
        ];

        while (remaining.length > 0) {
            let matched = false;
            for (const { regex, className } of patterns) {
                const match = remaining.match(regex);
                if (match && match.index === 0) {
                    tokens.push(<span key={key++} className={className}>{match[0]}</span>);
                    remaining = remaining.slice(match[0].length);
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                // Find next potential match
                let nextMatch = remaining.length;
                for (const { regex } of patterns) {
                    const match = remaining.match(regex);
                    if (match && match.index > 0 && match.index < nextMatch) {
                        nextMatch = match.index;
                    }
                }
                tokens.push(<span key={key++} className="text-slate-300">{remaining.slice(0, nextMatch)}</span>);
                remaining = remaining.slice(nextMatch);
            }
        }

        return <span key={i}>{tokens}{'\n'}</span>;
    });
};

// Syntax highlighting for PowerShell commands
const highlightPowerShell = (code) => {
    return code.split('\n').map((line, i) => {
        // Comment lines
        if (line.trim().startsWith('#')) {
            return <span key={i} className="text-gray-500 italic">{line}{'\n'}</span>;
        }

        // Process line with multiple tokens
        const tokens = [];
        let remaining = line;
        let key = 0;

        // Match patterns for PowerShell
        const patterns = [
            { regex: /^(Invoke-WebRequest|Set-ExecutionPolicy|Get-Process|Stop-Process|Start-Service|Stop-Service|Get-Service|Remove-Item|New-Item|Copy-Item|Move-Item|Test-Path|Write-Host|Read-Host)/, className: 'text-blue-400 font-semibold' },
            { regex: /^(\.\\.+\.ps1)/, className: 'text-purple-400 font-semibold' },
            { regex: /(-[A-Za-z]+)/, className: 'text-yellow-400' },
            { regex: /(https?:\/\/[^\s"]+)/, className: 'text-cyan-400 underline' },
            { regex: /(<[A-Z_]+>)/, className: 'text-cyan-400' },
            { regex: /("[^"]*")/, className: 'text-green-400' },
            { regex: /(\$[A-Za-z_][A-Za-z0-9_]*)/, className: 'text-orange-400' },
        ];

        while (remaining.length > 0) {
            let matched = false;
            for (const { regex, className } of patterns) {
                const match = remaining.match(regex);
                if (match && match.index === 0) {
                    tokens.push(<span key={key++} className={className}>{match[0]}</span>);
                    remaining = remaining.slice(match[0].length);
                    matched = true;
                    break;
                }
            }
            if (!matched) {
                // Find next potential match
                let nextMatch = remaining.length;
                for (const { regex } of patterns) {
                    const match = remaining.match(regex);
                    if (match && match.index > 0 && match.index < nextMatch) {
                        nextMatch = match.index;
                    }
                }
                tokens.push(<span key={key++} className="text-slate-300">{remaining.slice(0, nextMatch)}</span>);
                remaining = remaining.slice(nextMatch);
            }
        }

        return <span key={i}>{tokens}{'\n'}</span>;
    });
};

// Highlight code based on language
const highlightCode = (code, language) => {
    if (language === 'bash') return highlightBash(code);
    if (language === 'powershell') return highlightPowerShell(code);
    return <span className="text-slate-300">{code}</span>;
};

const CodeBlock = ({ code, language = "bash", filename }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        // Remove comment lines when copying
        const cleanCode = code.split('\n').filter(line => !line.trim().startsWith('#')).join('\n');

        try {
            // Try modern clipboard API first
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(cleanCode);
            } else {
                // Fallback for HTTP (non-secure) contexts
                const textArea = document.createElement('textarea');
                textArea.value = cleanCode;
                textArea.style.position = 'fixed';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className="rounded-xl overflow-hidden border border-white/10 bg-[#0d1117] mb-6">
            <div className="flex justify-between items-center px-4 py-2 bg-white/5 border-b border-white/10">
                <span className="text-xs font-mono text-slate-500">{filename || language}</span>
                <button
                    onClick={handleCopy}
                    className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1"
                >
                    {copied ? <Check className="w-[14px] h-[14px] text-green-400" /> : <Copy className="w-[14px] h-[14px]" />}
                    {copied ? 'Copied!' : 'Copy'}
                </button>
            </div>
            <div className="p-4 font-mono text-sm overflow-x-auto">
                <pre className="whitespace-pre-wrap">{highlightCode(code, language)}</pre>
            </div>
        </div>
    );
};

const SidebarLink = ({ href, icon: Icon, children, active, onClick }) => (
    <li>
        <a
            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition ${active
                ? 'bg-[#0da6f2]/10 text-[#0da6f2] font-medium'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
            href={href}
            onClick={onClick}
        >
            <Icon className="w-[18px] h-[18px] shrink-0" />
            <span className="truncate">{children}</span>
        </a>
    </li>
);

const SectionTitle = ({ children, id }) => (
    <h2 id={id} className="text-xl sm:text-2xl font-bold text-white mb-4 flex items-center gap-2 scroll-mt-24">
        <span className="text-[#0da6f2]">#</span> {children}
    </h2>
);

const SubSection = ({ children, id }) => (
    <h3 id={id} className="text-lg sm:text-xl font-bold text-white mb-3 mt-8 scroll-mt-24">{children}</h3>
);

const InfoBox = ({ type = "info", title, children }) => {
    const styles = {
        info: { bg: "bg-blue-500/5", border: "border-blue-500/20", icon: Info, iconColor: "text-blue-400", titleColor: "text-blue-400" },
        warning: { bg: "bg-yellow-500/5", border: "border-yellow-500/20", icon: AlertTriangle, iconColor: "text-yellow-500", titleColor: "text-yellow-500" },
        tip: { bg: "bg-green-500/5", border: "border-green-500/20", icon: Bolt, iconColor: "text-green-400", titleColor: "text-green-400" },
        danger: { bg: "bg-red-500/5", border: "border-red-500/20", icon: AlertTriangle, iconColor: "text-red-400", titleColor: "text-red-400" }
    };
    const s = styles[type];
    const IconComponent = s.icon;

    return (
        <div className={`mb-6 p-4 rounded-lg border ${s.border} ${s.bg} flex gap-3`}>
            <IconComponent className={`${s.iconColor} w-5 h-5 flex-shrink-0 mt-0.5`} />
            <div>
                {title && <h4 className={`${s.titleColor} font-bold text-sm mb-1`}>{title}</h4>}
                <div className="text-slate-400 text-sm">{children}</div>
            </div>
        </div>
    );
};

const ApiEndpoint = ({ method, path, description }) => {
    const methodColors = {
        GET: "bg-green-500/20 text-green-400 border-green-500/30",
        POST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
        PUT: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
    };

    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-3 bg-white/5 rounded-lg border border-white/5 mb-2">
            <span className={`px-2 py-1 rounded text-xs font-bold border w-fit ${methodColors[method]}`}>{method}</span>
            <code className="text-sm text-white font-mono flex-1 break-all">{path}</code>
            <span className="text-sm text-slate-500">{description}</span>
        </div>
    );
};

// Sidebar content component (reusable for desktop and mobile)
const SidebarContent = ({ activeSection, onLinkClick }) => (
    <>
        <h5 className="text-xs font-bold text-[#0da6f2] uppercase tracking-widest mb-4">Getting Started</h5>
        <ul className="space-y-1 mb-8">
            <SidebarLink href="#introduction" icon={Info} active={activeSection === 'introduction'} onClick={onLinkClick}>Introduction</SidebarLink>
            <SidebarLink href="#quick-start" icon={Zap} active={activeSection === 'quick-start'} onClick={onLinkClick}>Quick Start</SidebarLink>
            <SidebarLink href="#architecture" icon={Network} active={activeSection === 'architecture'} onClick={onLinkClick}>Architecture</SidebarLink>
        </ul>

        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Server Setup</h5>
        <ul className="space-y-1 mb-8">
            <SidebarLink href="#docker-deployment" icon={Container} active={activeSection === 'docker-deployment'} onClick={onLinkClick}>Docker Deployment</SidebarLink>
            <SidebarLink href="#env-vars" icon={Variable} active={activeSection === 'env-vars'} onClick={onLinkClick}>Environment Vars</SidebarLink>
            <SidebarLink href="#production" icon={Server} active={activeSection === 'production'} onClick={onLinkClick}>Production Setup</SidebarLink>
        </ul>

        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Agent Installation</h5>
        <ul className="space-y-1 mb-8">
            <SidebarLink href="#linux-install" icon={Terminal} active={activeSection === 'linux-install'} onClick={onLinkClick}>Linux</SidebarLink>
            <SidebarLink href="#windows-install" icon={Monitor} active={activeSection === 'windows-install'} onClick={onLinkClick}>Windows</SidebarLink>
            <SidebarLink href="#agent-config" icon={Settings} active={activeSection === 'agent-config'} onClick={onLinkClick}>Configuration</SidebarLink>
        </ul>

        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Dashboard</h5>
        <ul className="space-y-1 mb-8">
            <SidebarLink href="#dashboard-features" icon={Layers} active={activeSection === 'dashboard-features'} onClick={onLinkClick}>Features</SidebarLink>
            <SidebarLink href="#agent-management" icon={Server} active={activeSection === 'agent-management'} onClick={onLinkClick}>Agent Management</SidebarLink>
            <SidebarLink href="#remote-control" icon={Terminal} active={activeSection === 'remote-control'} onClick={onLinkClick}>Remote Control</SidebarLink>
        </ul>

        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Reference</h5>
        <ul className="space-y-1 mb-8">
            <SidebarLink href="#api-reference" icon={FileCode} active={activeSection === 'api-reference'} onClick={onLinkClick}>API Reference</SidebarLink>
            <SidebarLink href="#security" icon={Lock} active={activeSection === 'security'} onClick={onLinkClick}>Security</SidebarLink>
            <SidebarLink href="#alerts" icon={Bell} active={activeSection === 'alerts'} onClick={onLinkClick}>Alerts</SidebarLink>
        </ul>

        <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Operations</h5>
        <ul className="space-y-1">
            <SidebarLink href="#troubleshooting" icon={Wrench} active={activeSection === 'troubleshooting'} onClick={onLinkClick}>Troubleshooting</SidebarLink>
            <SidebarLink href="#updates" icon={RefreshCw} active={activeSection === 'updates'} onClick={onLinkClick}>Updates</SidebarLink>
        </ul>
    </>
);

export default function Docs() {
    const [activeSection, setActiveSection] = useState('introduction');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const mainRef = useRef(null);

    // Scroll tracking for active section
    useEffect(() => {
        const mainElement = mainRef.current;
        if (!mainElement) return;

        const handleScroll = () => {
            const scrollTop = mainElement.scrollTop;
            let currentSection = 'introduction';

            for (const id of SECTION_IDS) {
                const element = document.getElementById(id);
                if (element) {
                    const rect = element.getBoundingClientRect();
                    const mainRect = mainElement.getBoundingClientRect();
                    const offsetTop = rect.top - mainRect.top + scrollTop;

                    if (scrollTop >= offsetTop - 150) {
                        currentSection = id;
                    }
                }
            }

            setActiveSection(currentSection);
        };

        mainElement.addEventListener('scroll', handleScroll);
        handleScroll(); // Initial check

        return () => mainElement.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu on link click
    const handleMobileLinkClick = () => {
        setMobileMenuOpen(false);
    };

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [mobileMenuOpen]);

    return (
        <div className="min-h-screen bg-[#030712] text-slate-300 font-sans antialiased overflow-hidden selection:bg-[#0da6f2]/30 selection:text-white">
            <style jsx global>{`
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: #030712; }
                ::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: #334155; }
                
                .glass-sidebar {
                    background: rgba(3, 7, 18, 0.95);
                    backdrop-filter: blur(12px);
                    border-right: 1px solid rgba(255, 255, 255, 0.08);
                }
                .glass-header {
                    background: rgba(3, 7, 18, 0.95);
                    backdrop-filter: blur(12px);
                    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
                }
                html { scroll-behavior: smooth; }
            `}</style>

            <div className="flex flex-col h-screen w-full">
                {/* Header */}
                <header className="flex-none h-14 sm:h-16 z-50 flex items-center justify-between px-4 sm:px-6 glass-header sticky top-0">
                    <div className="flex items-center gap-4 sm:gap-8">
                        {/* Mobile menu button */}
                        <button
                            className="lg:hidden p-2 -ml-2 text-slate-400 hover:text-white transition"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>

                        <a href="/" className="flex items-center gap-2 sm:gap-3 text-white hover:opacity-80 transition">
                            <div className="w-8 h-8 sm:w-13 sm:h-13 flex items-center justify-center rounded-xl bg-[#0da6f2]/10 relative group">
                                <div className="absolute inset-0 bg-primary/40 blur-lg rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>
                                <img src="/logo.svg" alt="Sentinel Logo" className="w-6 h-6 sm:w-10 sm:h-10 relative drop-shadow-[0_0_5px_rgba(13,166,242,0.5)]" />
                            </div>
                            <h2 className="text-white text-lg sm:text-xl font-bold tracking-tight">Sentinel Docs</h2>
                        </a>
                        <div className="hidden sm:flex items-center text-sm font-medium border-l border-white/10 pl-4 sm:pl-6 h-6">
                            <span className="text-[#0da6f2] font-semibold">v2.3</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <a href="https://github.com/harunkrl/sentinel" target="_blank" className="text-slate-400 hover:text-white transition-colors flex items-center gap-2 text-sm">
                            <Code className="w-5 h-5" />
                            <span className="hidden sm:inline">GitHub</span>
                        </a>
                    </div>
                </header>

                <div className="flex flex-1 overflow-hidden relative">

                    {/* Mobile Sidebar Overlay */}
                    {mobileMenuOpen && (
                        <div
                            className="lg:hidden fixed inset-0 bg-black/60 z-40"
                            onClick={() => setMobileMenuOpen(false)}
                        />
                    )}

                    {/* Sidebar - Desktop */}
                    <aside className="hidden lg:flex w-72 flex-col glass-sidebar overflow-y-auto shrink-0">
                        <div className="p-6">
                            <SidebarContent activeSection={activeSection} />
                        </div>
                    </aside>

                    {/* Sidebar - Mobile */}
                    <aside
                        className={`lg:hidden fixed left-0 top-14 bottom-0 w-72 max-w-[80vw] flex-col glass-sidebar overflow-y-auto z-50 transform transition-transform duration-300 ease-in-out ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
                            }`}
                    >
                        <div className="p-6">
                            <SidebarContent activeSection={activeSection} onLinkClick={handleMobileLinkClick} />
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main ref={mainRef} className="flex-1 overflow-y-auto relative scroll-smooth px-4 sm:px-8 py-8 sm:py-12 md:px-16">
                        <div className="max-w-4xl mx-auto">

                            <div className="mb-8 sm:mb-12 pb-6 sm:pb-8 border-b border-white/10">
                                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6 tracking-tight">Documentation</h1>
                                <p className="text-slate-400 text-base sm:text-lg leading-relaxed">
                                    Complete guide to installing, configuring, and maintaining the Sentinel monitoring system.
                                    Sentinel is designed to be lightweight, secure, and 100% self-hosted.
                                </p>
                            </div>

                            {/* Introduction */}
                            <section id="introduction" className="mb-12 sm:mb-16 scroll-mt-24">
                                <SectionTitle>Introduction</SectionTitle>
                                <p className="text-slate-300 leading-7 mb-4">
                                    Sentinel is a distributed system monitoring platform consisting of a central <strong>Core Server</strong> and multiple lightweight <strong>Agents</strong>.
                                    Agents collect system metrics (CPU, RAM, Disk, Network, Temperature) and stream them via gRPC to the Core, which stores data in InfluxDB and serves a React Dashboard.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
                                    <div className="p-4 rounded-xl border border-white/10 bg-[#0f1623]">
                                        <h4 className="text-white font-bold mb-2 flex items-center gap-2"><Bolt className="text-[#0da6f2] w-5 h-5" /> Low Latency</h4>
                                        <p className="text-sm text-slate-400">gRPC streaming for real-time updates with sub-second latency.</p>
                                    </div>
                                    <div className="p-4 rounded-xl border border-white/10 bg-[#0f1623]">
                                        <h4 className="text-white font-bold mb-2 flex items-center gap-2"><Cpu className="text-[#0da6f2] w-5 h-5" /> Lightweight</h4>
                                        <p className="text-sm text-slate-400">Agents are compiled Go binaries (~10MB) with minimal resource footprint.</p>
                                    </div>
                                    <div className="p-4 rounded-xl border border-white/10 bg-[#0f1623] sm:col-span-2 lg:col-span-1">
                                        <h4 className="text-white font-bold mb-2 flex items-center gap-2"><Lock className="text-green-400 w-5 h-5" /> Self-Hosted</h4>
                                        <p className="text-sm text-slate-400">100% self-hosted. Your data never leaves your infrastructure.</p>
                                    </div>
                                </div>
                            </section>

                            {/* Quick Start */}
                            <section id="quick-start" className="mb-12 sm:mb-16 scroll-mt-24">
                                <SectionTitle>Quick Start</SectionTitle>
                                <p className="text-slate-300 mb-4">Get Sentinel up and running in under 5 minutes.</p>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-3 sm:gap-4">
                                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#0da6f2]/20 text-[#0da6f2] flex items-center justify-center font-bold shrink-0 text-sm sm:text-base">1</div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white font-bold mb-2">Clone the repository</h4>
                                            <CodeBlock code={`# Clone the Sentinel repository
git clone https://github.com/harunkrl/sentinel.git
# Navigate to project directory
cd sentinel`} />
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 sm:gap-4">
                                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#0da6f2]/20 text-[#0da6f2] flex items-center justify-center font-bold shrink-0 text-sm sm:text-base">2</div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white font-bold mb-2">Configure environment</h4>
                                            <CodeBlock code={`# Copy example environment file
cp .env.example .env
# Edit if needed (optional for development)`} />
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 sm:gap-4">
                                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#0da6f2]/20 text-[#0da6f2] flex items-center justify-center font-bold shrink-0 text-sm sm:text-base">3</div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white font-bold mb-2">Start development server</h4>
                                            <CodeBlock code={`# Start all services in development mode
./compile_and_run.sh --dev
# Dashboard available at http://localhost:3000`} />
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3 sm:gap-4">
                                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#0da6f2]/20 text-[#0da6f2] flex items-center justify-center font-bold shrink-0 text-sm sm:text-base">4</div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-white font-bold mb-2">Get admin credentials</h4>
                                            <CodeBlock code={`# View initial admin credentials from container logs
docker logs sentinel_core | grep -A3 "INITIAL ADMIN"`} />
                                        </div>
                                    </div>
                                </div>

                                <InfoBox type="tip" title="Pro Tip">
                                    Use the <code className="text-white bg-white/10 px-1 rounded">Add Agent</code> button in the Dashboard to get the correct install command for your server IP.
                                </InfoBox>
                            </section>

                            {/* Architecture */}
                            <section id="architecture" className="mb-12 sm:mb-16 scroll-mt-24">
                                <SectionTitle>Architecture</SectionTitle>

                                {/* Visual Architecture Diagram */}
                                <div className="p-4 sm:p-8 rounded-2xl border border-white/10 bg-gradient-to-br from-[#0d1117] to-[#0a0f18] mb-6 overflow-hidden">
                                    <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-6">

                                        {/* Agents Column */}
                                        <div className="flex flex-col gap-3">
                                            <div className="text-xs text-center text-slate-500 uppercase tracking-widest mb-2">Agents</div>
                                            <div className="flex flex-row lg:flex-col gap-3">
                                                <div className="group relative px-4 py-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30 hover:border-blue-400/50 transition-all hover:scale-105">
                                                    <div className="flex items-center gap-2">
                                                        <Terminal className="w-5 h-5 text-blue-400" />
                                                        <span className="text-white font-medium text-sm">Linux</span>
                                                    </div>
                                                    <div className="text-[10px] text-blue-400/70 mt-1">systemd</div>
                                                </div>
                                                <div className="group relative px-4 py-3 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 hover:border-cyan-400/50 transition-all hover:scale-105">
                                                    <div className="flex items-center gap-2">
                                                        <Monitor className="w-5 h-5 text-cyan-400" />
                                                        <span className="text-white font-medium text-sm">Windows</span>
                                                    </div>
                                                    <div className="text-[10px] text-cyan-400/70 mt-1">service</div>
                                                </div>
                                                <div className="group relative px-4 py-3 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30 hover:border-red-400/50 transition-all hover:scale-105">
                                                    <div className="flex items-center gap-2">
                                                        <Cpu className="w-5 h-5 text-red-400" />
                                                        <span className="text-white font-medium text-sm">RPi</span>
                                                    </div>
                                                    <div className="text-[10px] text-red-400/70 mt-1">ARM64</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Arrow 1 */}
                                        <div className="flex flex-col items-center gap-1 py-2 lg:py-0">
                                            <div className="hidden lg:block w-16 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 relative">
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-8 border-l-purple-500 border-y-4 border-y-transparent"></div>
                                            </div>
                                            <div className="lg:hidden h-8 w-0.5 bg-gradient-to-b from-blue-500 to-purple-500 relative">
                                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-t-8 border-t-purple-500 border-x-4 border-x-transparent"></div>
                                            </div>
                                            <span className="text-[10px] text-purple-400 font-mono bg-purple-500/10 px-2 py-0.5 rounded">gRPC :50051</span>
                                        </div>

                                        {/* Core Server */}
                                        <div className="flex flex-col items-center">
                                            <div className="text-xs text-center text-slate-500 uppercase tracking-widest mb-2">Core Server</div>
                                            <div className="relative px-6 py-5 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/10 border-2 border-purple-500/40 shadow-lg shadow-purple-500/10">
                                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                                <div className="flex items-center gap-3">
                                                    <Server className="w-8 h-8 text-purple-400" />
                                                    <div>
                                                        <span className="text-white font-bold">Sentinel Core</span>
                                                        <div className="text-[10px] text-purple-400/70">Go + Gin + gRPC</div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 mt-3 justify-center">
                                                    <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">HTTP :8080</span>
                                                    <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">SSE</span>
                                                    <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">JWT</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Arrow 2 */}
                                        <div className="flex flex-col items-center gap-1 py-2 lg:py-0">
                                            <div className="hidden lg:block w-12 h-0.5 bg-gradient-to-r from-pink-500 to-orange-500 relative">
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-8 border-l-orange-500 border-y-4 border-y-transparent"></div>
                                            </div>
                                            <div className="lg:hidden h-8 w-0.5 bg-gradient-to-b from-pink-500 to-orange-500 relative">
                                                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-0 border-t-8 border-t-orange-500 border-x-4 border-x-transparent"></div>
                                            </div>
                                            <span className="text-[10px] text-orange-400 font-mono bg-orange-500/10 px-2 py-0.5 rounded">Write</span>
                                        </div>

                                        {/* Storage Column */}
                                        <div className="flex flex-col gap-3">
                                            <div className="text-xs text-center text-slate-500 uppercase tracking-widest mb-2">Storage</div>
                                            <div className="flex flex-row lg:flex-col gap-3">
                                                <div className="group relative px-4 py-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-orange-600/10 border border-orange-500/30 hover:border-orange-400/50 transition-all hover:scale-105">
                                                    <div className="flex items-center gap-2">
                                                        <Database className="w-5 h-5 text-orange-400" />
                                                        <span className="text-white font-medium text-sm">InfluxDB</span>
                                                    </div>
                                                    <div className="text-[10px] text-orange-400/70 mt-1">Time-series</div>
                                                </div>
                                                <div className="group relative px-4 py-3 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 hover:border-emerald-400/50 transition-all hover:scale-105">
                                                    <div className="flex items-center gap-2">
                                                        <Database className="w-5 h-5 text-emerald-400" />
                                                        <span className="text-white font-medium text-sm">SQLite</span>
                                                    </div>
                                                    <div className="text-[10px] text-emerald-400/70 mt-1">Metadata</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dashboard Connection */}
                                    <div className="flex flex-col items-center mt-6 pt-6 border-t border-white/5">
                                        <div className="flex items-center gap-4">
                                            <div className="h-8 w-0.5 bg-gradient-to-b from-purple-500/50 to-green-500"></div>
                                            <div className="px-5 py-3 rounded-xl bg-gradient-to-br from-green-500/20 to-teal-500/10 border border-green-500/30">
                                                <div className="flex items-center gap-3">
                                                    <Layers className="w-6 h-6 text-green-400" />
                                                    <div>
                                                        <span className="text-white font-medium">Web Dashboard</span>
                                                        <div className="text-[10px] text-green-400/70">React + Vite + TailwindCSS</div>
                                                    </div>
                                                </div>
                                            </div>
                                            <span className="text-[10px] text-green-400 font-mono bg-green-500/10 px-2 py-0.5 rounded">HTTP/SSE :80</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Tech Cards */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    <div className="p-3 rounded-xl border border-white/10 bg-[#0f1623] text-center">
                                        <div className="text-2xl mb-1">🚀</div>
                                        <div className="text-white font-bold text-sm">Go</div>
                                        <div className="text-[10px] text-slate-500">Backend</div>
                                    </div>
                                    <div className="p-3 rounded-xl border border-white/10 bg-[#0f1623] text-center">
                                        <div className="text-2xl mb-1">⚡</div>
                                        <div className="text-white font-bold text-sm">gRPC</div>
                                        <div className="text-[10px] text-slate-500">Transport</div>
                                    </div>
                                    <div className="p-3 rounded-xl border border-white/10 bg-[#0f1623] text-center">
                                        <div className="text-2xl mb-1">⚛️</div>
                                        <div className="text-white font-bold text-sm">React</div>
                                        <div className="text-[10px] text-slate-500">Frontend</div>
                                    </div>
                                    <div className="p-3 rounded-xl border border-white/10 bg-[#0f1623] text-center">
                                        <div className="text-2xl mb-1">🐳</div>
                                        <div className="text-white font-bold text-sm">Docker</div>
                                        <div className="text-[10px] text-slate-500">Deploy</div>
                                    </div>
                                </div>
                            </section>

                            {/* Docker Deployment */}
                            <section id="docker-deployment" className="mb-12 sm:mb-16 scroll-mt-24">
                                <SectionTitle>Docker Deployment</SectionTitle>
                                <p className="text-slate-300 mb-4">Sentinel is designed to run in Docker containers for easy deployment and management.</p>

                                <SubSection>Services Overview</SubSection>
                                <div className="overflow-x-auto mb-6">
                                    <table className="w-full text-sm border border-white/10 rounded-lg overflow-hidden">
                                        <thead className="bg-white/5">
                                            <tr>
                                                <th className="text-left p-3 text-white font-bold">Service</th>
                                                <th className="text-left p-3 text-white font-bold">Port</th>
                                                <th className="text-left p-3 text-white font-bold hidden sm:table-cell">Description</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            <tr><td className="p-3 text-slate-300">sentinel_core</td><td className="p-3 text-slate-400">8080, 50051</td><td className="p-3 text-slate-400 hidden sm:table-cell">Go backend (HTTP API + gRPC)</td></tr>
                                            <tr><td className="p-3 text-slate-300">sentinel_web</td><td className="p-3 text-slate-400">80 / 3000</td><td className="p-3 text-slate-400 hidden sm:table-cell">React dashboard + Nginx</td></tr>
                                            <tr><td className="p-3 text-slate-300">influxdb</td><td className="p-3 text-slate-400">8086</td><td className="p-3 text-slate-400 hidden sm:table-cell">Time-series database</td></tr>
                                        </tbody>
                                    </table>
                                </div>

                                <SubSection>Development Mode</SubSection>
                                <CodeBlock code={`# Start development server
./scripts/dev.sh
# Alternative method
./compile_and_run.sh --dev
# Dashboard: http://localhost:3000
# API: http://localhost:3000/api
# gRPC: localhost:50051`} />

                                <SubSection>Production Mode</SubSection>
                                <CodeBlock code={`# Start production server
./scripts/prod.sh
# Alternative method
./compile_and_run.sh --prod
# Dashboard: http://localhost (port 80)
# gRPC: localhost:50051`} />
                            </section>

                            {/* Environment Variables */}
                            <section id="env-vars" className="mb-12 sm:mb-16 scroll-mt-24">
                                <SectionTitle>Environment Variables</SectionTitle>
                                <p className="text-slate-300 mb-4">Configure Sentinel using environment variables in the <code className="text-white bg-white/10 px-1 rounded">.env</code> file.</p>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm border border-white/10 rounded-lg overflow-hidden">
                                        <thead className="bg-white/5">
                                            <tr>
                                                <th className="text-left p-3 text-white font-bold">Variable</th>
                                                <th className="text-left p-3 text-white font-bold hidden sm:table-cell">Default</th>
                                                <th className="text-left p-3 text-white font-bold">Description</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            <tr><td className="p-3 font-mono text-[#0da6f2] text-xs sm:text-sm">INFLUX_URL</td><td className="p-3 text-slate-400 hidden sm:table-cell">http://influxdb:8086</td><td className="p-3 text-slate-400">InfluxDB connection URL</td></tr>
                                            <tr><td className="p-3 font-mono text-[#0da6f2] text-xs sm:text-sm">INFLUX_TOKEN</td><td className="p-3 text-slate-400 hidden sm:table-cell">-</td><td className="p-3 text-slate-400">InfluxDB auth token</td></tr>
                                            <tr><td className="p-3 font-mono text-[#0da6f2] text-xs sm:text-sm">JWT_SECRET</td><td className="p-3 text-slate-400 hidden sm:table-cell">auto</td><td className="p-3 text-slate-400">JWT signing key</td></tr>
                                            <tr><td className="p-3 font-mono text-[#0da6f2] text-xs sm:text-sm">AGENT_SECRET</td><td className="p-3 text-slate-400 hidden sm:table-cell">auto</td><td className="p-3 text-slate-400">Agent auth secret</td></tr>
                                            <tr><td className="p-3 font-mono text-[#0da6f2] text-xs sm:text-sm">GRPC_PORT</td><td className="p-3 text-slate-400 hidden sm:table-cell">50051</td><td className="p-3 text-slate-400">gRPC server port</td></tr>
                                        </tbody>
                                    </table>
                                </div>

                                <InfoBox type="warning" title="Security">
                                    In production, always set custom values for <code className="text-white bg-white/10 px-1 rounded">JWT_SECRET</code> and <code className="text-white bg-white/10 px-1 rounded">AGENT_SECRET</code>.
                                </InfoBox>
                            </section>

                            {/* Production Setup */}
                            <section id="production" className="mb-12 sm:mb-16 scroll-mt-24">
                                <SectionTitle>Production Setup</SectionTitle>

                                <CodeBlock code={`# Create production environment
cp .env.production.example .env
# Edit .env with secure values
nano .env
# Start production stack
./scripts/prod.sh`} filename=".env production" />

                                <InfoBox type="info" title="Port Configuration">
                                    Production mode serves the dashboard on port <strong>80</strong>. Make sure this port is available and open in your firewall.
                                </InfoBox>
                            </section>

                            {/* Linux Installation */}
                            <section id="linux-install" className="mb-12 sm:mb-16 scroll-mt-24">
                                <SectionTitle>Linux Agent Installation</SectionTitle>

                                <InfoBox type="warning" title="Prerequisites">
                                    Ensure your Core Server is running and port <code className="text-white bg-white/10 px-1 rounded">50051</code> (gRPC) is accessible from the agent machine.
                                </InfoBox>

                                <p className="text-slate-300 mb-4">Run this command on the Linux machine you want to monitor:</p>

                                <SubSection>Production (Port 80)</SubSection>
                                <CodeBlock code={`# Download and run install script (production mode)
curl -sL http://<SERVER_IP>/downloads/install.sh | sudo bash -s <SERVER_IP>`} />

                                <SubSection>Development (Port 3000)</SubSection>
                                <CodeBlock code={`# Download and run install script (development mode)
curl -sL http://<SERVER_IP>:3000/downloads/install.sh | sudo bash -s <SERVER_IP> 3000`} />

                                <SubSection>Supported Distributions</SubSection>
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {['Ubuntu', 'Debian', 'CentOS', 'RHEL', 'Fedora', 'Arch', 'RPi OS'].map(os => (
                                        <span key={os} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs sm:text-sm text-slate-300">{os}</span>
                                    ))}
                                </div>

                                <SubSection>Uninstall Agent</SubSection>
                                <CodeBlock code={`# Download and run uninstall script
curl -sL http://<SERVER_IP>/downloads/uninstall.sh | sudo bash`} />
                            </section>

                            {/* Windows Installation */}
                            <section id="windows-install" className="mb-12 sm:mb-16 scroll-mt-24">
                                <SectionTitle>Windows Agent Installation</SectionTitle>

                                <p className="text-slate-300 mb-4">Run PowerShell as Administrator:</p>

                                <CodeBlock language="powershell" code={`# Download install script
Invoke-WebRequest -Uri "http://<SERVER_IP>/downloads/install.ps1" -OutFile "install.ps1"

# Run installation
.\\install.ps1 -ServerIP <SERVER_IP>`} />

                                <SubSection>Uninstall (Windows)</SubSection>
                                <CodeBlock language="powershell" code={`# Download uninstall script
Invoke-WebRequest -Uri "http://<SERVER_IP>/downloads/uninstall.ps1" -OutFile "uninstall.ps1"
# Run uninstall
.\\uninstall.ps1`} />
                            </section>

                            {/* Agent Configuration */}
                            <section id="agent-config" className="mb-12 sm:mb-16 scroll-mt-24">
                                <SectionTitle>Agent Configuration</SectionTitle>

                                <SubSection>Linux (Systemd Service)</SubSection>
                                <p className="text-slate-300 mb-4">Agent configuration: <code className="text-white bg-white/10 px-1.5 py-0.5 rounded font-mono text-xs sm:text-sm break-all">/etc/systemd/system/sentinel-agent.service</code></p>

                                <CodeBlock filename="sentinel-agent.service" code={`[Unit]
Description=Sentinel System Monitoring Agent
After=network.target

[Service]
Type=simple
User=root
Environment="CORE_ADDRESS=<SERVER_IP>:50051"
Environment="AGENT_SECRET=<your-agent-secret>"
Environment="LOG_LEVEL=info"

ExecStart=/usr/local/bin/sentinel-agent
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target`} />

                                <SubSection>Restart Agent</SubSection>
                                <CodeBlock code={`sudo systemctl restart sentinel-agent`} />
                            </section>

                            {/* Dashboard Features */}
                            <section id="dashboard-features" className="mb-12 sm:mb-16 scroll-mt-24">
                                <SectionTitle>Dashboard Features</SectionTitle>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                                    <div className="p-4 rounded-xl border border-white/10 bg-[#0f1623]">
                                        <h4 className="text-white font-bold mb-2 flex items-center gap-2"><Zap className="text-yellow-400 w-5 h-5" /> Real-time Metrics</h4>
                                        <p className="text-sm text-slate-400">CPU, RAM, Disk, Network, and Temperature streamed via SSE.</p>
                                    </div>
                                    <div className="p-4 rounded-xl border border-white/10 bg-[#0f1623]">
                                        <h4 className="text-white font-bold mb-2 flex items-center gap-2"><Server className="text-blue-400 w-5 h-5" /> Agent Overview</h4>
                                        <p className="text-sm text-slate-400">View all agents with status, uptime, and key metrics at a glance.</p>
                                    </div>
                                    <div className="p-4 rounded-xl border border-white/10 bg-[#0f1623]">
                                        <h4 className="text-white font-bold mb-2 flex items-center gap-2"><Container className="text-green-400 w-5 h-5" /> Docker Control</h4>
                                        <p className="text-sm text-slate-400">Start, stop, and restart containers directly from the dashboard.</p>
                                    </div>
                                    <div className="p-4 rounded-xl border border-white/10 bg-[#0f1623]">
                                        <h4 className="text-white font-bold mb-2 flex items-center gap-2"><Terminal className="text-red-400 w-5 h-5" /> Process Management</h4>
                                        <p className="text-sm text-slate-400">View running processes and kill resource hogs remotely.</p>
                                    </div>
                                </div>
                            </section>

                            {/* Agent Management */}
                            <section id="agent-management" className="mb-12 sm:mb-16 scroll-mt-24">
                                <SectionTitle>Agent Management</SectionTitle>

                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl border border-white/10 bg-[#0f1623] flex gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-green-500/20 text-green-400 flex items-center justify-center shrink-0"><Play className="w-5 h-5" /></div>
                                        <div className="min-w-0">
                                            <h4 className="text-white font-bold mb-1">Add Agent</h4>
                                            <p className="text-sm text-slate-400">Click the + button to get the install command with your server IP pre-filled.</p>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl border border-white/10 bg-[#0f1623] flex gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-yellow-500/20 text-yellow-400 flex items-center justify-center shrink-0"><RefreshCw className="w-5 h-5" /></div>
                                        <div className="min-w-0">
                                            <h4 className="text-white font-bold mb-1">Update Agent</h4>
                                            <p className="text-sm text-slate-400">One-click remote update. Agent downloads latest binary and restarts automatically.</p>
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl border border-white/10 bg-[#0f1623] flex gap-4">
                                        <div className="w-10 h-10 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0"><Square className="w-5 h-5" /></div>
                                        <div className="min-w-0">
                                            <h4 className="text-white font-bold mb-1">Delete Agent</h4>
                                            <p className="text-sm text-slate-400">Remove offline agents from the dashboard. Hover over agent card to reveal delete button.</p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Remote Control */}
                            <section id="remote-control" className="mb-12 sm:mb-16 scroll-mt-24">
                                <SectionTitle>Remote Control</SectionTitle>

                                <div className="overflow-x-auto mb-6">
                                    <table className="w-full text-sm border border-white/10 rounded-lg overflow-hidden">
                                        <thead className="bg-white/5">
                                            <tr>
                                                <th className="text-left p-3 text-white font-bold">Action</th>
                                                <th className="text-left p-3 text-white font-bold hidden sm:table-cell">Description</th>
                                                <th className="text-left p-3 text-white font-bold">Platform</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            <tr><td className="p-3 text-slate-300">Reboot</td><td className="p-3 text-slate-400 hidden sm:table-cell">Restart the remote system</td><td className="p-3 text-slate-400">Linux, Win</td></tr>
                                            <tr><td className="p-3 text-slate-300">Shutdown</td><td className="p-3 text-slate-400 hidden sm:table-cell">Power off the remote system</td><td className="p-3 text-slate-400">Linux, Win</td></tr>
                                            <tr><td className="p-3 text-slate-300">Kill Process</td><td className="p-3 text-slate-400 hidden sm:table-cell">Terminate a specific process</td><td className="p-3 text-slate-400">Linux, Win</td></tr>
                                            <tr><td className="p-3 text-slate-300">Docker</td><td className="p-3 text-slate-400 hidden sm:table-cell">Control Docker containers</td><td className="p-3 text-slate-400">Linux</td></tr>
                                            <tr><td className="p-3 text-slate-300">Services</td><td className="p-3 text-slate-400 hidden sm:table-cell">Manage systemd services</td><td className="p-3 text-slate-400">Linux</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            {/* API Reference */}
                            <section id="api-reference" className="mb-12 sm:mb-16 scroll-mt-24">
                                <SectionTitle>API Reference</SectionTitle>
                                <p className="text-slate-300 mb-6">All API endpoints require JWT authentication (except login).</p>

                                <SubSection>Authentication</SubSection>
                                <ApiEndpoint method="POST" path="/api/auth/login" description="Get JWT token" />
                                <ApiEndpoint method="POST" path="/api/auth/change-password" description="Change password" />

                                <SubSection>Agents</SubSection>
                                <ApiEndpoint method="GET" path="/api/agents" description="List all agents" />
                                <ApiEndpoint method="GET" path="/api/agent/:id/history" description="Metric history" />
                                <ApiEndpoint method="GET" path="/api/agent/:id/stats" description="Stats (avg/min/max)" />
                                <ApiEndpoint method="POST" path="/api/agent/:id/action" description="System command" />
                                <ApiEndpoint method="DELETE" path="/api/agent/:id" description="Remove agent" />

                                <SubSection>Docker & Services</SubSection>
                                <ApiEndpoint method="GET" path="/api/agent/:id/containers" description="List containers" />
                                <ApiEndpoint method="POST" path="/api/agent/:id/docker" description="Container action" />
                                <ApiEndpoint method="GET" path="/api/agent/:id/services" description="List services" />
                                <ApiEndpoint method="POST" path="/api/agent/:id/service/action" description="Service control" />

                                <SubSection>Settings & Events</SubSection>
                                <ApiEndpoint method="GET" path="/api/settings" description="Get settings" />
                                <ApiEndpoint method="POST" path="/api/settings" description="Save settings" />
                                <ApiEndpoint method="GET" path="/api/events" description="SSE stream" />
                            </section>

                            {/* Security */}
                            <section id="security" className="mb-12 sm:mb-16 scroll-mt-24">
                                <SectionTitle>Security</SectionTitle>

                                <div className="overflow-x-auto mb-6">
                                    <table className="w-full text-sm border border-white/10 rounded-lg overflow-hidden">
                                        <thead className="bg-white/5">
                                            <tr>
                                                <th className="text-left p-3 text-white font-bold">Feature</th>
                                                <th className="text-left p-3 text-white font-bold">Implementation</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            <tr><td className="p-3 text-slate-300">Authentication</td><td className="p-3 text-slate-400">JWT tokens (24h validity)</td></tr>
                                            <tr><td className="p-3 text-slate-300">Password</td><td className="p-3 text-slate-400">bcrypt hashing</td></tr>
                                            <tr><td className="p-3 text-slate-300">Rate Limiting</td><td className="p-3 text-slate-400">5/min login, 100/min API</td></tr>
                                            <tr><td className="p-3 text-slate-300">Agent Auth</td><td className="p-3 text-slate-400">AGENT_SECRET verification</td></tr>
                                        </tbody>
                                    </table>
                                </div>

                                <InfoBox type="danger" title="Important">
                                    Always change default secrets in production. Use strong, randomly generated values.
                                </InfoBox>
                            </section>

                            {/* Alerts */}
                            <section id="alerts" className="mb-12 sm:mb-16 scroll-mt-24">
                                <SectionTitle>Alerts & Notifications</SectionTitle>
                                <p className="text-slate-300 mb-4">Configure threshold-based alerts and receive push notifications via Ntfy.sh.</p>

                                <SubSection>Thresholds</SubSection>
                                <div className="overflow-x-auto mb-6">
                                    <table className="w-full text-sm border border-white/10 rounded-lg overflow-hidden">
                                        <thead className="bg-white/5">
                                            <tr>
                                                <th className="text-left p-3 text-white font-bold">Metric</th>
                                                <th className="text-left p-3 text-white font-bold">Default</th>
                                                <th className="text-left p-3 text-white font-bold hidden sm:table-cell">Description</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            <tr><td className="p-3 text-slate-300">CPU</td><td className="p-3 text-slate-400">90%</td><td className="p-3 text-slate-400 hidden sm:table-cell">Alert when exceeded</td></tr>
                                            <tr><td className="p-3 text-slate-300">RAM</td><td className="p-3 text-slate-400">90%</td><td className="p-3 text-slate-400 hidden sm:table-cell">Alert when exceeded</td></tr>
                                            <tr><td className="p-3 text-slate-300">Disk</td><td className="p-3 text-slate-400">90%</td><td className="p-3 text-slate-400 hidden sm:table-cell">Alert when exceeded</td></tr>
                                            <tr><td className="p-3 text-slate-300">Temp</td><td className="p-3 text-slate-400">80°C</td><td className="p-3 text-slate-400 hidden sm:table-cell">Alert when exceeded</td></tr>
                                        </tbody>
                                    </table>
                                </div>

                                <SubSection>Ntfy Integration</SubSection>
                                <p className="text-slate-300 mb-4">
                                    Configure Ntfy.sh topic in Dashboard Settings to receive push notifications on mobile devices.
                                </p>
                            </section>

                            {/* Troubleshooting */}
                            <section id="troubleshooting" className="mb-12 sm:mb-16 scroll-mt-24">
                                <SectionTitle>Troubleshooting</SectionTitle>
                                <p className="text-slate-300 mb-6">Common issues and solutions.</p>

                                <SubSection>Check Agent Status</SubSection>
                                <CodeBlock code={`# Check agent service status
sudo systemctl status sentinel-agent`} />

                                <SubSection>View Live Logs</SubSection>
                                <CodeBlock code={`# Follow agent logs in real-time
sudo journalctl -u sentinel-agent -f`} />

                                <SubSection>Agent Not Connecting</SubSection>
                                <div className="space-y-2 mb-6 text-sm sm:text-base">
                                    <p className="text-slate-300">1. Verify Core Server is running and gRPC port (50051) is accessible</p>
                                    <p className="text-slate-300">2. Check CORE_ADDRESS in agent service file</p>
                                    <p className="text-slate-300">3. Ensure AGENT_SECRET matches between server and agent</p>
                                    <p className="text-slate-300">4. Check firewall rules for port 50051</p>
                                </div>

                                <SubSection>Container Issues</SubSection>
                                <CodeBlock code={`# Check container logs
docker logs sentinel_core
# Restart all services
docker-compose down && docker-compose up -d`} />
                            </section>

                            {/* Updates */}
                            <section id="updates" className="mb-12 sm:mb-16 scroll-mt-24">
                                <SectionTitle>Updates</SectionTitle>

                                <SubSection>Update Server</SubSection>
                                <CodeBlock code={`# Navigate to project directory
cd sentinel
# Pull latest changes
git pull
# Restart with latest code
./scripts/prod.sh`} />

                                <SubSection>Update Agents (Remote)</SubSection>
                                <p className="text-slate-300 mb-4">
                                    Click the <strong>&quot;Update Agent&quot;</strong> button in the agent detail page. The agent will:
                                </p>
                                <ol className="list-decimal list-inside space-y-2 text-slate-300 mb-6 text-sm sm:text-base">
                                    <li>Download the latest binary from the Core Server</li>
                                    <li>Replace the current binary</li>
                                    <li>Restart the service automatically</li>
                                </ol>

                                <InfoBox type="tip" title="Multi-Agent Update">
                                    You can update multiple agents at once by clicking the update button on each agent card.
                                </InfoBox>
                            </section>

                        </div>

                        <footer className="mt-12 sm:mt-20 pt-6 sm:pt-8 border-t border-white/10 text-center flex flex-col justify-center items-center text-sm text-slate-500 pb-8 sm:pb-10 gap-4">
                            <p>© 2026 Sentinel. Open Source under MIT License.</p>
                            <a href="https://github.com/harunkrl/sentinel" className="hover:text-white transition flex items-center gap-1">
                                <ExternalLink className="w-4 h-4" /> GitHub
                            </a>
                        </footer>
                    </main>

                </div>
            </div>
        </div>
    );
}
