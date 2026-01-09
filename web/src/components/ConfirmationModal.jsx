import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message, actionType }) => {
    if (!isOpen) return null;
    const isDanger = actionType === 'delete' || actionType === 'shutdown' || actionType === 'reboot';
    const confirmClass = isDanger ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/20' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="glass-panel border-gray-700/50 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                <div className="bg-gray-900/40 p-5 border-b border-white/5 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-white flex items-center gap-2">
                        {isDanger && <AlertTriangle className="text-red-500 w-5 h-5" />} {title}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-6"><p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{message}</p></div>
                <div className="bg-gray-900/40 p-4 border-t border-white/5 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition border border-transparent hover:border-white/10">Cancel</button>
                    <button onClick={() => { onConfirm(); onClose(); }} className={`px-4 py-2 rounded-lg text-sm font-medium shadow-lg transition border border-white/10 ${confirmClass}`}>Confirm Action</button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
