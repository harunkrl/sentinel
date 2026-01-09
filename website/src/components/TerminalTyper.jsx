"use client";
import { useState, useEffect, useRef } from 'react';

export default function TerminalTyper({ lines, speed = 12, startDelay = 0, mode = 'sequential' }) {
    // State to track character progress for EACH line
    const [charProgress, setCharProgress] = useState(new Array(lines.length).fill(0));
    const [isStarted, setIsStarted] = useState(false);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setIsStarted(true);
        }, startDelay);
        return () => clearTimeout(timeout);
    }, [startDelay]);

    useEffect(() => {
        if (!isStarted) return;

        const interval = setInterval(() => {
            setCharProgress(prev => {
                const newProgress = [...prev];

                if (mode === 'sequential') {
                    // Sequential mode: type one line at a time, top to bottom
                    const currentLineIndex = newProgress.findIndex((len, idx) => {
                        const lineLength = (lines[idx].prefix || '').length + lines[idx].text.length;
                        return len < lineLength;
                    });

                    if (currentLineIndex === -1) {
                        clearInterval(interval);
                        return prev;
                    }

                    newProgress[currentLineIndex] += 1;
                } else if (mode === 'concurrent') {
                    // Concurrent mode: type all lines at once
                    let anyIncremented = false;
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        const fullLength = (line.prefix || '').length + line.text.length;
                        if (newProgress[i] < fullLength) {
                            newProgress[i] += 1;
                            anyIncremented = true;
                        }
                    }
                    if (!anyIncremented) {
                        clearInterval(interval);
                        return prev;
                    }
                } else if (mode === 'first-then-concurrent') {
                    // First line types, then all others type concurrently
                    const firstLineDone = newProgress[0] >= ((lines[0].prefix || '').length + lines[0].text.length);

                    if (!firstLineDone) {
                        // Type first line
                        const fullLength = (lines[0].prefix || '').length + lines[0].text.length;
                        if (newProgress[0] < fullLength) {
                            newProgress[0] += 1;
                        }
                    } else {
                        // Type all remaining lines concurrently
                        let anyIncremented = false;
                        for (let i = 1; i < lines.length; i++) {
                            const line = lines[i];
                            const fullLength = (line.prefix || '').length + line.text.length;
                            if (newProgress[i] < fullLength) {
                                newProgress[i] += 1;
                                anyIncremented = true;
                            }
                        }
                        if (!anyIncremented) {
                            clearInterval(interval);
                            return prev;
                        }
                    }
                }

                return newProgress;
            });
        }, speed);

        return () => clearInterval(interval);
    }, [isStarted, lines, speed, mode]);

    // Check if everything is fully typed
    const allTyped = charProgress.every((len, idx) => {
        const fullLen = (lines[idx].prefix || '').length + lines[idx].text.length;
        return len === fullLen;
    });

    return (
        <div className="font-mono text-sm sm:text-base leading-relaxed overflow-hidden h-full">
            {lines.map((line, index) => {
                const fullText = (line.prefix || '') + line.text;
                const visibleLen = charProgress[index];

                // Hide lines that haven't started typing yet
                if (visibleLen === 0) return null;

                return (
                    <div key={index} className={line.wrapperClassName || ""}>
                        <span className={line.className}>
                            {fullText.slice(0, visibleLen)}
                        </span>
                        {/* Cursor for THIS line if it's currently typing */}
                        {visibleLen < fullText.length && visibleLen > 0 && (
                            <span className="animate-pulse inline-block w-2 h-4 bg-gray-500 ml-1 align-middle">▌</span>
                        )}
                    </div>
                );
            })}

            {/* Final Cursor */}
            {allTyped && (
                <div className="mt-1">
                    <span className="animate-pulse inline-block w-2 h-4 bg-gray-500 align-middle">▌</span>
                </div>
            )}
        </div>
    );
}
