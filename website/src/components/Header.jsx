import Link from "next/link";
import { Shield, Github, BookOpen, ExternalLink } from "lucide-react";

export default function Header() {
    return (
        <header className="w-full bg-background-dark/80 backdrop-blur-xl fixed top-0 z-50 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16 sm:h-18">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="relative">
                            <div className="absolute inset-0 bg-primary/50 blur-xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <img src="/logo.svg" alt="Sentinel Logo" className="w-8 h-8 sm:w-13 sm:h-13 relative drop-shadow-[0_0_8px_rgba(13,166,242,0.5)]" />
                        </div>
                        <span className="text-lg sm:text-xl font-bold tracking-tight text-white">Sentinel</span>
                    </Link>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-2">
                        <Link href="/docs" className="text-sm text-gray-300 hover:text-white px-4 py-2 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Docs
                        </Link>
                        <a href="https://github.com/harunkrl/sentinel" target="_blank" className="text-sm text-gray-300 hover:text-white px-4 py-2 rounded-lg border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all flex items-center gap-2">
                            <Github className="w-4 h-4" />
                            GitHub
                        </a>
                    </nav>

                    {/* Actions */}
                    <div className="flex items-center gap-2 sm:gap-3">
                        <a
                            href="https://github.com/harunkrl/sentinel"
                            target="_blank"
                            className="md:hidden bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white p-2.5 rounded-lg transition-all border border-white/5"
                            aria-label="GitHub"
                        >
                            <Github className="w-5 h-5" />
                        </a>
                        <Link
                            href="/docs"
                            className="bg-primary hover:bg-primary/90 text-white text-xs sm:text-sm font-bold py-2.5 px-4 sm:px-5 rounded-lg transition-all shadow-[0_0_20px_-5px_#0da6f2] flex items-center gap-2"
                        >
                            <BookOpen className="w-4 h-4 hidden sm:block" />
                            Get Started
                        </Link>
                    </div>
                </div>
            </div>
        </header>
    );
}
