import Link from "next/link";
import { Shield } from "lucide-react";

export default function Footer() {
    return (
        <footer className="border-t border-white/5 pt-16 pb-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full opacity-10 pointer-events-none"></div>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
                    {/* Brand */}
                    <div className="col-span-1">
                        <Link href="/" className="flex items-center gap-2 mb-6">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/30 blur-lg rounded-full opacity-50"></div>
                                <img src="/logo.svg" alt="Sentinel Logo" className="w-12 h-12 relative drop-shadow-[0_0_5px_rgba(13,166,242,0.5)]" />
                            </div>
                            <span className="text-xl font-bold tracking-tight text-white">Sentinel</span>
                        </Link>
                        <p className="text-gray-400 text-sm leading-relaxed mb-6">
                            Open-source infrastructure monitoring for the modern web. Built with performance in mind.
                        </p>
                    </div>

                    {/* Product */}
                    <div>
                        <h3 className="text-white font-bold mb-6">Product</h3>
                        <ul className="space-y-4">
                            <li><Link href="/docs#introduction" className="text-gray-400 hover:text-white transition-colors text-sm">Features</Link></li>
                            <li><Link href="/docs#architecture" className="text-gray-400 hover:text-white transition-colors text-sm">Architecture</Link></li>
                            <li><Link href="/docs#api-reference" className="text-gray-400 hover:text-white transition-colors text-sm">API Reference</Link></li>
                            <li><a href="https://github.com/harunkrl/sentinel/releases" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors text-sm">Changelog</a></li>
                        </ul>
                    </div>

                    {/* Resources */}
                    <div>
                        <h3 className="text-white font-bold mb-6">Resources</h3>
                        <ul className="space-y-4">
                            <li><Link href="/docs" className="text-gray-400 hover:text-white transition-colors text-sm">Documentation</Link></li>
                            <li><Link href="/docs#quick-start" className="text-gray-400 hover:text-white transition-colors text-sm">Quick Start</Link></li>
                            <li><Link href="/docs#troubleshooting" className="text-gray-400 hover:text-white transition-colors text-sm">Troubleshooting</Link></li>
                            <li><a href="https://github.com/harunkrl/sentinel" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors text-sm">GitHub</a></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h3 className="text-white font-bold mb-6">Legal</h3>
                        <ul className="space-y-4">
                            <li><a href="https://github.com/harunkrl/sentinel/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors text-sm">MIT License</a></li>
                        </ul>
                    </div>
                </div>
            </div>

            <div className="border-t border-white/5 bg-black/20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-gray-500 text-sm">
                        © 2025 Sentinel. Open Source under MIT License.
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 font-mono">
                        <span>Built with Go & React</span>
                        <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                        <span>v1.1</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
