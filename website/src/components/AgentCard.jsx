import { Cpu, Server, HardDrive, Thermometer, Clock, Activity, Trash2, Star } from "lucide-react";
import { getOSIcon } from "../utils/osHelpers";

export default function AgentCard({ agent, metrics, uptime, load }) {
    const { icon: OSIcon, color: osColor } = getOSIcon(agent);

    return (
        <div className="glass-card rounded-2xl p-6 border border-white/5 bg-white/5 hover:border-gray-500/30 transition relative overflow-hidden group">
            {/* Watermark */}
            <div className={`absolute -top-4 -right-4 w-32 h-32 opacity-10 transition-opacity group-hover:opacity-20 ${osColor}`}>
                <OSIcon className="w-full h-full" />
            </div>

            <div className="flex items-center gap-4 mb-6 relative z-10">
                <div className={`p-3 rounded-full border border-gray-700/50 shrink-0 bg-gray-800/50`}>
                    <OSIcon className={`w-6 h-6 ${osColor}`} />
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-lg text-white">{agent.hostname}</h3>
                    <p className="text-gray-500 text-xs font-mono mt-0.5">{agent.ip}</p>
                </div>
                <div className="p-2 rounded-lg text-gray-600 hover:text-yellow-400 transition cursor-pointer">
                    <Star className="w-5 h-5 fill-current opacity-50 hover:opacity-100" />
                </div>
            </div>

            <div className="space-y-4 relative z-10">
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-gray-500 text-[10px] uppercase font-bold">CPU</span>
                            <Cpu className="w-3 h-3 text-gray-600" />
                        </div>
                        <span className="font-mono text-lg text-white">{metrics.cpu}</span>
                    </div>
                    <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-gray-500 text-[10px] uppercase font-bold">RAM</span>
                            <Server className="w-3 h-3 text-gray-600" />
                        </div>
                        <span className="font-mono text-lg text-white">{metrics.ram}</span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-gray-500 text-[10px] uppercase font-bold">Disk</span>
                            <HardDrive className="w-3 h-3 text-gray-600" />
                        </div>
                        <span className="font-mono text-lg text-white">{metrics.disk}</span>
                    </div>
                    <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                        <div className="flex justify-between items-start mb-1">
                            <span className="text-gray-500 text-[10px] uppercase font-bold">Temp</span>
                            <Thermometer className="w-3 h-3 text-gray-600" />
                        </div>
                        <span className="font-mono text-lg text-white">{metrics.temp}</span>
                    </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-gray-500">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1"><Clock className="w-3 h-3" /><span>{uptime}</span></div>
                        <div className="flex items-center gap-1 text-green-400"><Activity className="w-3 h-3" /><span>{load}</span></div>
                    </div>
                    <div className="p-1.5 rounded-lg hover:bg-red-500/10 hover:text-red-400 cursor-pointer transition">
                        <Trash2 className="w-4 h-4" />
                    </div>
                </div>
            </div>

            {/* Online Indicator */}
            <div className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_#22c55e] animate-pulse"></div>
        </div>
    );
}
