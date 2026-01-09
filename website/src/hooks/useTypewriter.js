import { useState, useEffect } from 'react';

export default function useTypewriter(text, speed = 50, startDelay = 0) {
    const [displayText, setDisplayText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => {
        let timeout;
        let currentIndex = 0;

        // Reset state when text changes
        setDisplayText('');
        setIsFinished(false);

        const startTyping = () => {
            setIsTyping(true);

            const typeChar = () => {
                if (currentIndex < text.length) {
                    setDisplayText(text.slice(0, currentIndex + 1));
                    currentIndex++;
                    // Randomize speed slightly for realism
                    const randomSpeed = speed + (Math.random() * 20 - 10);
                    timeout = setTimeout(typeChar, randomSpeed);
                } else {
                    setIsTyping(false);
                    setIsFinished(true);
                }
            };

            typeChar();
        };

        timeout = setTimeout(startTyping, startDelay);

        return () => clearTimeout(timeout);
    }, [text, speed, startDelay]);

    return { displayText, isTyping, isFinished };
}
