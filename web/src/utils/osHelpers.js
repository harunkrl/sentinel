import { 
    SiUbuntu, SiDebian, SiArchlinux, SiRaspberrypi, SiApple, SiLinux, 
    SiFedora, SiCentos, SiRedhat, SiOpensuse,
    SiAlpinelinux,
    SiEndeavouros
} from "react-icons/si";
import { FaWindows } from "react-icons/fa"; // Alternatif Windows ikonu

// Marka/Distro Tanımlamaları
// Key: Aranan kelime (küçük harf), Value: İkon ve Renk
const OS_MAP = {
    'raspbian':  { icon: SiRaspberrypi, color: 'text-red-500' },
    'raspberry': { icon: SiRaspberrypi, color: 'text-red-500' },
    'ubuntu':    { icon: SiUbuntu,      color: 'text-orange-500' },
    'debian':    { icon: SiDebian,      color: 'text-red-600' },
    'arch':      { icon: SiArchlinux,   color: 'text-blue-400' },
    'endeavour': { icon: SiEndeavouros, color: 'text-purple-400' }, 
    'fedora':    { icon: SiFedora,      color: 'text-blue-500' },
    'centos':    { icon: SiCentos,      color: 'text-purple-500' },
    'redhat':    { icon: SiRedhat,      color: 'text-red-700' },
    'suse':      { icon: SiOpensuse,    color: 'text-green-500' },
    'alpine':    { icon: SiAlpinelinux, color: 'text-blue-200' },
    'windows':   { icon: FaWindows,     color: 'text-blue-400' },
    'darwin':    { icon: SiApple,       color: 'text-gray-200' },
    'mac':       { icon: SiApple,       color: 'text-gray-200' },
};

const DEFAULT_OS = { icon: SiLinux, color: 'text-gray-400' };

export const getOSIcon = (agent) => {
    if (!agent) return DEFAULT_OS;

    // Platform, OS ve Hostname içinde arama yapıyoruz
    const searchString = `
        ${agent.platform || ''} 
        ${agent.os || ''} 
        ${agent.hostname || ''}
    `.toLowerCase();

    // Map içindeki anahtarları tek tek kontrol et
    for (const [key, value] of Object.entries(OS_MAP)) {
        if (searchString.includes(key)) {
            return value;
        }
    }

    return DEFAULT_OS;
};