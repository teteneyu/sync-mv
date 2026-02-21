'use client';

import { useCallback, useEffect, useState } from 'react';

interface UseTapSyncProps {
    getCurrentTime: () => number;
    selectedCardId: string | null;
    selectNextCard: () => string | null;
    updateCardTimestamp: (cardId: string, timestamp: number) => void;
    isPlaying: boolean;
}

export function useTapSync({
    getCurrentTime,
    selectedCardId,
    selectNextCard,
    updateCardTimestamp,
    isPlaying,
}: UseTapSyncProps) {
    const [isSyncMode, setIsSyncMode] = useState(true);

    const toggleSyncMode = useCallback(() => {
        setIsSyncMode((prev) => !prev);
    }, []);

    useEffect(() => {
        if (!isSyncMode || !isPlaying) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // テキスト入力中はスキップ
            const target = e.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return;
            }

            if (e.key === 'Enter') {
                e.preventDefault();
                const time = getCurrentTime();
                if (selectedCardId) {
                    updateCardTimestamp(selectedCardId, time);
                    selectNextCard();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [
        isSyncMode,
        isPlaying,
        getCurrentTime,
        selectedCardId,
        selectNextCard,
        updateCardTimestamp,
    ]);

    return {
        isSyncMode,
        toggleSyncMode,
        setIsSyncMode,
    };
}
