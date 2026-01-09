"use client";
import useTypewriter from "../hooks/useTypewriter";

export default function TypewriterText({ text, speed = 30, delay = 500 }) {
    const { displayText } = useTypewriter(text, speed, delay);

    return (
        <>
            <span className="break-all">{displayText}</span>
            <span className="animate-pulse inline-block w-2 h-4 bg-gray-500 ml-1 align-middle">▌</span>
        </>
    );
}
