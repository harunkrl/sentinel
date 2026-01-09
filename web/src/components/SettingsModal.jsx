import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Save, Bell, Settings, Globe, Zap, Radio, CheckCircle, Lock, Eye, EyeOff } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export default function SettingsModal({ isOpen, onClose }) {
    const [settings, setSettings] = useState({
        notifications_enabled: true,
        ntfy_topic: '',
        cpu_threshold: 90,
        ram_threshold: 90,
        disk_threshold: 90,
        cpu_temp_threshold: 80
    });

    // Password change state
    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [showPasswords, setShowPasswords] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    // UI State
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(false);
    const [saveStatus, setSaveStatus] = useState(null);

    useEffect(() => {
        if (isOpen) {
            axios.get(`${API_BASE}/settings`)
                .then(res => setSettings(res.data))
                .catch(err => console.error("Failed to load settings", err));
            setSaveStatus(null);
            setPasswordError('');
            setPasswordSuccess(false);
            setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
        }
    }, [isOpen]);

    const handleSave = async () => {
        setLoading(true);
        setSaveStatus(null);
        try {
            const payload = {
                ...settings,
                cpu_threshold: Number(settings.cpu_threshold),
                ram_threshold: Number(settings.ram_threshold),
                disk_threshold: Number(settings.disk_threshold),
                cpu_temp_threshold: Number(settings.cpu_temp_threshold),
            };

            await axios.post(`${API_BASE}/settings`, payload);
            setSaveStatus('success');
            setTimeout(() => setSaveStatus(null), 3000);
        } catch (err) {
            console.error(err);
            setSaveStatus('error');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async () => {
        setPasswordError('');
        setPasswordSuccess(false);

        if (passwordForm.new_password !== passwordForm.confirm_password) {
            setPasswordError('New passwords do not match');
            return;
        }
        if (passwordForm.new_password.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            return;
        }

        try {
            await axios.post(`${API_BASE}/auth/change-password`, {
                current_password: passwordForm.current_password,
                new_password: passwordForm.new_password
            });
            setPasswordSuccess(true);
            setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
            setTimeout(() => setPasswordSuccess(false), 3000);
        } catch (err) {
            setPasswordError(err.response?.data?.error || 'Failed to change password');
        }
    };

    if (!isOpen) return null;

    const navItems = [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'alerting', label: 'Thresholds & Alerts', icon: Bell },
        { id: 'integrations', label: 'Integrations', icon: Globe },
        { id: 'security', label: 'Security', icon: Lock },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
            <div className="glass-panel w-full max-w-6xl h-[90vh] md:h-[85vh] rounded-2xl flex flex-col md:flex-row overflow-hidden shadow-2xl scale-100 animate-in zoom-in-95 duration-200">

                {/* SIDEBAR */}
                <div className="w-full md:w-80 bg-bg-secondary/60 border-b md:border-b-0 md:border-r border-border-color p-4 md:p-6 flex flex-row md:flex-col gap-2 md:gap-3 overflow-x-auto md:overflow-visible shrink-0">
                    <div className="hidden md:flex items-center gap-3 mb-6 px-4 pt-2">
                        <div className="p-2 bg-blue-500/20 rounded-xl">
                            <Settings className="w-6 h-6 text-blue-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-text-primary">Settings</h2>
                    </div>

                    {navItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`relative flex items-center gap-4 px-5 py-4 rounded-xl transition-all font-medium text-base whitespace-nowrap ${activeTab === item.id
                                ? 'bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-900/40 text-white'
                                : 'text-text-secondary hover:text-text-primary hover:bg-white/10'
                                }`}
                        >
                            {activeTab === item.id && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                            )}
                            <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-gray-500'}`} />
                            <span className="hidden sm:inline md:inline">{item.label}</span>
                            <span className="sm:hidden">{item.label.split(' ')[0]}</span>
                        </button>
                    ))}
                </div>

                {/* CONTENT AREA */}
                <div className="flex-1 flex flex-col min-w-0 bg-white/2 h-full overflow-hidden">

                    {/* TOP BAR */}
                    <div className="h-16 md:h-20 flex items-center justify-between px-6 md:px-10 border-b border-border-color shrink-0 bg-transparent">
                        <h3 className="text-xl md:text-2xl font-semibold text-text-primary">
                            {navItems.find(i => i.id === activeTab)?.label}
                        </h3>
                        <button onClick={onClose} className="p-3 rounded-xl hover:bg-white/10 text-text-secondary hover:text-text-primary transition border border-transparent hover:border-border-color">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* SCROLLABLE CONTENT */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-10">

                        {/* GENERAL TAB */}
                        {activeTab === 'general' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="p-6 rounded-2xl bg-bg-secondary/40 border border-border-color">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h4 className="text-text-primary font-medium mb-1">Global Notifications</h4>
                                            <p className="text-sm text-text-secondary max-w-sm">
                                                Master switch to enable or disable all outgoing alerts from the core server.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setSettings({ ...settings, notifications_enabled: !settings.notifications_enabled })}
                                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${settings.notifications_enabled ? 'bg-green-500' : 'bg-gray-700'}`}
                                        >
                                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${settings.notifications_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ALERTING TAB */}
                        {activeTab === 'alerting' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <section>
                                    <h4 className="text-sm uppercase font-bold text-text-secondary mb-6 tracking-wider flex items-center gap-2">
                                        <Zap className="w-4 h-4" />
                                        Alert Thresholds
                                    </h4>
                                    <p className="text-text-secondary text-sm mb-6 max-w-xl">
                                        Configure when to receive alerts. When a metric exceeds its threshold, you'll be notified via your configured integrations.
                                    </p>
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {[
                                            { key: 'cpu_threshold', label: 'CPU Load Limit', unit: '%', color: 'blue', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20', max: 100, icon: '💻' },
                                            { key: 'ram_threshold', label: 'RAM Usage Limit', unit: '%', color: 'purple', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/20', max: 100, icon: '🧠' },
                                            { key: 'disk_threshold', label: 'Disk Usage Limit', unit: '%', color: 'green', bgColor: 'bg-green-500/10', borderColor: 'border-green-500/20', max: 100, icon: '💾' },
                                            { key: 'cpu_temp_threshold', label: 'CPU Temperature', unit: '°C', color: 'orange', bgColor: 'bg-orange-500/10', borderColor: 'border-orange-500/20', max: 120, icon: '🌡️' },
                                        ].map(item => (
                                            <div key={item.key} className={`${item.bgColor} p-6 rounded-2xl border ${item.borderColor} group hover:shadow-lg transition-all duration-300`}>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl">{item.icon}</span>
                                                        <span className="text-text-primary font-semibold text-base">{item.label}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            max={item.max}
                                                            value={settings[item.key]}
                                                            onChange={(e) => setSettings({ ...settings, [item.key]: Math.min(item.max, Math.max(0, Number(e.target.value))) })}
                                                            className="w-20 h-10 text-center bg-bg-secondary border border-border-color rounded-lg text-text-primary font-bold text-lg focus:border-blue-500 focus:outline-none appearance-none"
                                                        />
                                                        <span className="text-text-secondary font-medium text-lg">{item.unit}</span>
                                                    </div>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max={item.max}
                                                    value={settings[item.key]}
                                                    onChange={(e) => setSettings({ ...settings, [item.key]: Number(e.target.value) })}
                                                    className="w-full h-3 bg-gray-700/50 rounded-full appearance-none cursor-pointer"
                                                    style={{
                                                        accentColor: item.color === 'blue' ? '#3b82f6' : item.color === 'purple' ? '#8b5cf6' : item.color === 'green' ? '#22c55e' : '#f97316',
                                                        background: `linear-gradient(to right, ${item.color === 'blue' ? '#3b82f6' : item.color === 'purple' ? '#8b5cf6' : item.color === 'green' ? '#22c55e' : '#f97316'} 0%, ${item.color === 'blue' ? '#3b82f6' : item.color === 'purple' ? '#8b5cf6' : item.color === 'green' ? '#22c55e' : '#f97316'} ${(settings[item.key] / item.max) * 100}%, rgba(107, 114, 128, 0.3) ${(settings[item.key] / item.max) * 100}%, rgba(107, 114, 128, 0.3) 100%)`
                                                    }}
                                                />
                                                <div className="flex justify-between text-xs text-text-secondary mt-2 font-medium">
                                                    <span>0{item.unit}</span>
                                                    <span className="text-text-secondary/70">Alert when above threshold</span>
                                                    <span>{item.max}{item.unit}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        )}

                        {/* INTEGRATIONS TAB */}
                        {activeTab === 'integrations' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="bg-bg-secondary/40 p-8 rounded-2xl border border-border-color">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400"><Radio className="w-7 h-7" /></div>
                                        <div>
                                            <h4 className="text-xl font-semibold text-text-primary">Ntfy.sh Integration</h4>
                                            <p className="text-sm text-text-secondary mt-1">Push notifications to your phone via Ntfy app.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Topic Name</label>
                                        <div className="flex gap-3">
                                            <span className="flex items-center px-5 py-3 bg-bg-secondary/50 text-text-secondary rounded-xl border border-border-color select-none text-base font-mono">ntfy.sh/</span>
                                            <input
                                                type="text"
                                                value={settings.ntfy_topic}
                                                onChange={(e) => setSettings({ ...settings, ntfy_topic: e.target.value })}
                                                className="flex-1 bg-bg-secondary border border-border-color rounded-xl p-4 text-text-primary text-base focus:border-blue-500 outline-none focus:ring-2 focus:ring-blue-500/20"
                                                placeholder="your-topic-name"
                                            />
                                        </div>
                                        <p className="text-sm text-blue-400/80 pt-2 flex items-center gap-2">
                                            <Bell className="w-4 h-4" />
                                            Subscribe to this topic in the Ntfy app to receive alerts.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* SECURITY TAB - PASSWORD CHANGE */}
                        {activeTab === 'security' && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="bg-bg-secondary/40 p-8 rounded-2xl border border-border-color">
                                    <div className="flex items-center gap-4 mb-8">
                                        <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400"><Lock className="w-7 h-7" /></div>
                                        <div>
                                            <h4 className="text-xl font-semibold text-text-primary">Change Password</h4>
                                            <p className="text-sm text-text-secondary mt-1">Update your account password for enhanced security.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-5 max-w-lg">
                                        <div>
                                            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-3">Current Password</label>
                                            <div className="relative">
                                                <input
                                                    type={showPasswords ? 'text' : 'password'}
                                                    value={passwordForm.current_password}
                                                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                                                    className="w-full bg-bg-secondary border border-border-color rounded-xl p-4 text-text-primary text-base focus:border-blue-500 outline-none pr-14 focus:ring-2 focus:ring-blue-500/20"
                                                    placeholder="••••••••"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPasswords(!showPasswords)}
                                                    className="absolute right-4 top-4 text-text-secondary hover:text-text-primary transition"
                                                >
                                                    {showPasswords ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-3">New Password</label>
                                            <input
                                                type={showPasswords ? 'text' : 'password'}
                                                value={passwordForm.new_password}
                                                onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                                                className="w-full bg-bg-secondary border border-border-color rounded-xl p-4 text-text-primary text-base focus:border-blue-500 outline-none focus:ring-2 focus:ring-blue-500/20"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-text-secondary uppercase tracking-wider block mb-3">Confirm New Password</label>
                                            <input
                                                type={showPasswords ? 'text' : 'password'}
                                                value={passwordForm.confirm_password}
                                                onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                                                className="w-full bg-bg-secondary border border-border-color rounded-xl p-4 text-text-primary text-base focus:border-blue-500 outline-none focus:ring-2 focus:ring-blue-500/20"
                                                placeholder="••••••••"
                                            />
                                        </div>

                                        {passwordError && (
                                            <p className="text-red-400 text-sm bg-red-500/10 p-4 rounded-xl border border-red-500/20">{passwordError}</p>
                                        )}
                                        {passwordSuccess && (
                                            <p className="text-green-400 text-sm bg-green-500/10 p-4 rounded-xl border border-green-500/20 flex items-center gap-2">
                                                <CheckCircle className="w-5 h-5" /> Password changed successfully!
                                            </p>
                                        )}

                                        <button
                                            onClick={handlePasswordChange}
                                            className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-semibold text-base transition shadow-lg shadow-blue-600/20 mt-2"
                                        >
                                            Update Password
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* FOOTER */}
                    <div className="p-6 md:p-8 border-t border-border-color flex justify-end items-center gap-4 bg-bg-secondary/30">
                        {saveStatus === 'success' && <span className="text-green-400 text-base font-medium animate-in fade-in flex items-center gap-2"><CheckCircle className="w-5 h-5" /> Saved Successfully</span>}
                        {saveStatus === 'error' && <span className="text-red-400 text-base font-medium animate-in fade-in">Error Saving!</span>}

                        <button onClick={onClose} className="px-8 py-3 rounded-xl text-text-secondary hover:text-text-primary hover:bg-white/10 transition text-base font-medium border border-transparent hover:border-border-color">
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={loading}
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-xl text-base font-semibold shadow-lg shadow-blue-600/30 transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                            <Save className="w-5 h-5" />
                            Save Changes
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}