'use client';

import React, { useCallback, useEffect, useRef } from 'react';

interface AudioPlayerProps {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    fileName: string | null;
    hasAudio: boolean;
    onTogglePlay: () => void;
    onSeek: (seconds: number) => void;
    onSeekRelative: (delta: number) => void;
    isLooping: boolean;
    onToggleLoop: () => void;
}

function formatTime(seconds: number): string {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({
    isPlaying,
    currentTime,
    duration,
    fileName,
    hasAudio,
    onTogglePlay,
    onSeek,
    onSeekRelative,
    isLooping,
    onToggleLoop,
}: AudioPlayerProps) {
    const progressBarRef = useRef<HTMLDivElement>(null);

    // キーボードショートカット
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            ) {
                return;
            }

            if (e.code === 'ArrowLeft') {
                e.preventDefault();
                onSeekRelative(-5);
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                onSeekRelative(5);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onSeekRelative]);

    const handleProgressClick = useCallback(
        (e: React.MouseEvent<HTMLDivElement>) => {
            if (!progressBarRef.current || !hasAudio) return;
            const rect = progressBarRef.current.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            onSeek(ratio * duration);
        },
        [duration, hasAudio, onSeek]
    );

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 h-16 w-[600px] max-w-[90vw] bg-white/90 backdrop-blur-xl border border-gray-200/50 rounded-2xl flex items-center px-5 gap-5 shadow-[0_8px_30px_rgb(0,0,0,0.06)] ring-1 ring-black/5 flex-shrink-0">
            {/* 再生コントロール */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onSeekRelative(-5)}
                    disabled={!hasAudio}
                    className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors rounded-lg hover:bg-gray-50"
                    title="5秒戻る (←)"
                >
                    ⏪
                </button>
                <button
                    onClick={onTogglePlay}
                    disabled={!hasAudio}
                    className={`
            w-11 h-11 rounded-full flex items-center justify-center text-lg transition-all
            ${hasAudio
                            ? isPlaying
                                ? 'bg-violet-500 text-white hover:bg-violet-600 shadow-md shadow-violet-200 hover:-translate-y-0.5'
                                : 'bg-violet-50 text-violet-600 hover:bg-violet-100 hover:scale-105'
                            : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        }
          `}
                    title={isPlaying ? '一時停止' : '再生'}
                >
                    {isPlaying ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    )}
                </button>
                <button
                    onClick={() => onSeekRelative(5)}
                    disabled={!hasAudio}
                    className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors rounded-lg hover:bg-gray-50"
                    title="5秒進む (→)"
                >
                    ⏩
                </button>
            </div>

            {/* ループボタン */}
            <div className="flex items-center mx-1">
                <button
                    onClick={onToggleLoop}
                    disabled={!hasAudio}
                    className={`p-1.5 rounded-lg transition-colors ${isLooping
                            ? 'text-violet-600 bg-violet-50'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                        } disabled:opacity-30`}
                    title="ループ再生"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isLooping ? 2.5 : 2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </button>
            </div>

            {/* 時間表示 */}
            <div className="text-xs font-mono font-medium text-gray-600 min-w-[85px] text-center tracking-tight">
                {formatTime(currentTime)} / {formatTime(duration)}
            </div>

            {/* プログレスバー */}
            <div
                ref={progressBarRef}
                onClick={handleProgressClick}
                className={`flex-1 h-2 bg-gray-100/80 rounded-full cursor-pointer overflow-hidden hover:h-3 transition-all ${!hasAudio ? 'opacity-30 cursor-not-allowed' : ''
                    }`}
            >
                <div
                    className="h-full bg-violet-400 rounded-full transition-[width] duration-75 relative"
                    style={{ width: `${progress}%` }}
                >
                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/30" />
                </div>
            </div>

            {/* ファイル名 */}
            <div className="text-[11px] font-medium text-gray-400 max-w-[120px] truncate" title={fileName || ''}>
                {fileName || '音声未読込'}
            </div>
        </div>
    );
}
