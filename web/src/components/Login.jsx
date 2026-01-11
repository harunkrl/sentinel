import React, { useState } from 'react';
import axios from 'axios';
import { Activity, Lock, User, AlertCircle, Eye, EyeOff } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export default function Login({ onLoginSuccess }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await axios.post(`${API_BASE}/auth/login`, { username, password });
            const { token } = res.data;

            localStorage.setItem("token", token);
            localStorage.setItem("username", username);

            onLoginSuccess(token);
        } catch (err) {
            setError(err.response?.data?.error || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
            </div>

            <div className="glass-panel p-8 rounded-2xl shadow-2xl w-full max-w-md relative z-10">
                {/* Logo & Title */}
                <div className="flex flex-col items-center mb-8">
                    <div className="p-4 bg-blue-500/10 rounded-2xl mb-4 backdrop-blur-sm border border-blue-500/20 relative">
                        <div className="absolute inset-0 bg-blue-500/30 blur-xl rounded-full opacity-50 animate-pulse"></div>
                        <img src="/logo.svg" alt="Sentinel Logo" className="w-20 h-20 relative drop-shadow-[0_0_10px_rgba(13,166,242,0.6)]" />
                    </div>
                    <h1 className="text-3xl font-bold text-text-primary tracking-tight">Sentinel</h1>
                    <p className="text-text-secondary text-sm mt-1">System Monitoring and Management</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Username</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-bg-secondary border border-border-color rounded-xl py-3 pl-11 pr-4 text-text-primary focus:outline-none focus:border-blue-500 transition placeholder-gray-500 shadow-sm"
                                placeholder="Enter username"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-text-secondary text-xs font-bold uppercase tracking-wider">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-bg-secondary border border-border-color rounded-xl py-3 pl-11 pr-12 text-text-primary focus:outline-none focus:border-blue-500 transition placeholder-gray-500 shadow-sm"
                                placeholder="Enter password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-3 text-gray-500 hover:text-gray-300 transition"
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-blue-600/25 disabled:opacity-50 disabled:cursor-not-allowed mt-2 flex items-center justify-center gap-2"
                    >
                        {loading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                <p className="text-center text-xs text-gray-500 mt-6">
                    Check console logs for initial admin password
                </p>
            </div>
        </div>
    );
}
