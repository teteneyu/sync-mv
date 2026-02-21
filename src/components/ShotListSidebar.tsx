import React, { useMemo, useState, useRef } from 'react';
import { StoryCardNode } from '@/types';

interface ShotListSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    nodes: StoryCardNode[];
    audioDuration: number;
    onSeekTo: (seconds: number) => void;
    onFocusNode?: (id: string) => void;
}

export default function ShotListSidebar({ isOpen, onClose, nodes, audioDuration, onSeekTo, onFocusNode }: ShotListSidebarProps) {
    const shotList = useMemo(() => {
        const sorted = nodes
            .filter((n) => n.data.timestamp !== null)
            .map((n) => ({
                id: n.id,
                time: n.data.timestamp as number,
                sectionLabel: n.data.sectionLabel,
                lyrics: n.data.lyrics,
                imageUrl: n.data.imageUrl as string | null,
            }))
            .sort((a, b) => a.time - b.time);

        return sorted.map((item, index) => {
            let duration = 0;
            if (index < sorted.length - 1) {
                duration = sorted[index + 1].time - item.time;
            } else {
                // Ensure audioDuration doesn't cause NaNs during initialization
                duration = Math.max(0, (audioDuration || 0) - item.time);
            }
            return { ...item, duration };
        });
    }, [nodes, audioDuration]);

    const formatTimestamp = (sec: number): string => {
        const min = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${min}:${s.toString().padStart(2, '0')}`;
    };

    // --- Drag Logic ---
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const dragStart = useRef({ x: 0, y: 0 });

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        isDragging.current = true;
        dragStart.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging.current) return;
        setPosition({
            x: e.clientX - dragStart.current.x,
            y: e.clientY - dragStart.current.y
        });
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        isDragging.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    if (!isOpen) return null;

    return (
        <div
            className="absolute top-16 right-0 w-80 h-[calc(100vh-64px)] bg-white/90 backdrop-blur-xl border border-gray-100 shadow-2xl z-40 flex flex-col rounded-xl overflow-hidden"
            style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
        >
            <div
                className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50 cursor-grab active:cursor-grabbing select-none touch-none"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
            >
                <div className="flex items-center gap-2 pointer-events-none">
                    <span className="text-gray-400">⋮⋮</span>
                    <h2 className="text-sm font-bold text-gray-700">🎬 ショットリスト</h2>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="p-1 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {shotList.length === 0 ? (
                    <div className="text-center text-xs text-gray-400 mt-10">
                        タイムスタンプが設定されたカードが<br />まだありません
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        {shotList.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => onSeekTo(item.time)}
                                onDoubleClick={() => onFocusNode?.(item.id)}
                                title="クリック: この時間にシーク / ダブルクリック: カードへ移動"
                                className="flex w-full p-2 rounded-lg hover:bg-violet-50 transition-colors group text-left gap-3 relative"
                            >
                                <div className="absolute top-2 right-2 flex flex-col items-end pointer-events-none">
                                    <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">
                                        {item.duration.toFixed(1)}s
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1 items-center shrink-0 w-20">
                                    {item.imageUrl ? (
                                        <div className="w-20 h-[45px] bg-gray-200 rounded overflow-hidden">
                                            <img src={item.imageUrl} alt="thumbnail" className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-20 h-[45px] bg-gray-100 border border-dashed border-gray-300 rounded flex items-center justify-center">
                                            <span className="text-[8px] text-gray-400">No Image</span>
                                        </div>
                                    )}
                                    <div className="text-[10px] font-mono font-bold text-violet-600 bg-violet-100/50 px-2 py-0.5 rounded w-full text-center">
                                        {formatTimestamp(item.time)}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col pt-1 pr-8">
                                    {item.sectionLabel && (
                                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
                                            {item.sectionLabel as string}
                                        </div>
                                    )}
                                    <div className="text-[11px] text-gray-600 line-clamp-2 leading-tight">
                                        {item.lyrics ? String(item.lyrics) : 'No lyrics...'}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
