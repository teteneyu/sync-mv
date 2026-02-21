'use client';

import React, { memo, useCallback, useState, useRef } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { StoryCardData } from '@/types';

interface StoryCardNodeProps {
    data: StoryCardData & {
        onUpdateCard: (id: string, updates: Partial<StoryCardData>) => void;
        onSeekTo: (seconds: number) => void;
        onDeleteCard: (id: string) => void;
        onSplitCard: (id: string) => void;
        isSelected: boolean;
    };
    id: string;
}

export function StoryCardNodeComponent({ data, id, selected }: NodeProps) {
    const cardData = data as any as StoryCardData & {
        onUpdateCard: (id: string, updates: Partial<StoryCardData>) => void;
        onSeekTo: (seconds: number) => void;
        onDeleteCard: (id: string) => void;
        onSplitCard: (id: string) => void;
        isSelected: boolean;
    };
    const [isCopied, setIsCopied] = useState(false);

    const sectionLabel = cardData.sectionLabel as string | null;
    const colorTheme = React.useMemo(() => {
        if (!sectionLabel) return { bg: 'bg-gray-100 text-gray-700', border: 'border-t-gray-300' };

        const lower = sectionLabel.toLowerCase();

        // 頻出セクションの固定カラー
        if (lower.includes('intro')) return { bg: 'bg-blue-500 text-white', border: 'border-t-blue-500' };
        if (lower.includes('verse')) return { bg: 'bg-emerald-500 text-white', border: 'border-t-emerald-500' };
        if (lower.includes('chorus') || lower.includes('hook')) return { bg: 'bg-pink-500 text-white', border: 'border-t-pink-500' };
        if (lower.includes('bridge')) return { bg: 'bg-amber-500 text-white', border: 'border-t-amber-500' };
        if (lower.includes('outro') || lower.includes('ending')) return { bg: 'bg-indigo-500 text-white', border: 'border-t-indigo-500' };
        if (lower.includes('pre') || lower.includes('build')) return { bg: 'bg-teal-500 text-white', border: 'border-t-teal-500' };
        if (lower.includes('solo') || lower.includes('inst')) return { bg: 'bg-fuchsia-500 text-white', border: 'border-t-fuchsia-500' };

        // 未知のラベルは文字列ハッシュで固定ランダム色を生成
        const palette = [
            { bg: 'bg-violet-500 text-white', border: 'border-t-violet-500' },
            { bg: 'bg-orange-500 text-white', border: 'border-t-orange-500' },
            { bg: 'bg-lime-500 text-white', border: 'border-t-lime-500' },
            { bg: 'bg-sky-500 text-white', border: 'border-t-sky-500' },
            { bg: 'bg-rose-500 text-white', border: 'border-t-rose-500' },
            { bg: 'bg-cyan-500 text-white', border: 'border-t-cyan-500' }
        ];

        let hash = 0;
        for (let i = 0; i < lower.length; i++) {
            hash = lower.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % palette.length;
        return palette[index];
    }, [sectionLabel]);

    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageDrop = useCallback(
        (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragOver(false);

            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type.startsWith('image/')) {
                const url = URL.createObjectURL(files[0]);
                cardData.onUpdateCard(id, { imageUrl: url });
            }
        },
        [id, cardData]
    );

    const handleImageClick = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileSelect = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const files = e.target.files;
            if (files && files.length > 0 && files[0].type.startsWith('image/')) {
                const url = URL.createObjectURL(files[0]);
                cardData.onUpdateCard(id, { imageUrl: url });
            }
        },
        [id, cardData]
    );

    const [isEditingTimestamp, setIsEditingTimestamp] = useState(false);
    const [timestampInput, setTimestampInput] = useState('');

    const handleTimestampClick = useCallback(() => {
        if (cardData.timestamp !== null) {
            cardData.onSeekTo(cardData.timestamp as number);
        }
    }, [cardData]);

    const handleTimestampDoubleClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setIsEditingTimestamp(true);
        setTimestampInput(
            cardData.timestamp !== null ? (cardData.timestamp as number).toFixed(2) : ''
        );
    }, [cardData.timestamp]);

    const handleTimestampSubmit = useCallback(() => {
        const parsed = parseFloat(timestampInput);
        if (!isNaN(parsed) && parsed >= 0) {
            cardData.onUpdateCard(id, { timestamp: parsed });
        }
        setIsEditingTimestamp(false);
    }, [timestampInput, id, cardData]);

    const handleCopyPrompt = () => {
        if (!cardData.prompt) return;
        navigator.clipboard.writeText(cardData.prompt);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    const formatTimestamp = (seconds: number | null): string => {
        if (seconds === null) return '--:--';
        const sec = seconds as number;
        const min = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        const ms = Math.floor((sec % 1) * 100);
        return `${min}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    };

    // 分離可能かどうかの判定（全角スペースまたは改行が含まれているか）
    const lyricsString = String(cardData.lyrics || '');
    const canSplit = lyricsString.includes('　') || lyricsString.includes('\n');

    return (
        <div
            className={`
        w-[320px] bg-white rounded-2xl shadow-sm border-t-[8px] border-x border-b border-gray-100 transition-all duration-300 relative group flex flex-col
        ${colorTheme.border}
        ${cardData.isSelected ? 'ring-2 ring-violet-300 ring-offset-2 scale-[1.01] shadow-violet-100/50' : 'hover:shadow-md'}
      `}
            style={{ fontFamily: "'Zen Maru Gothic', 'Rounded Mplus 1c', sans-serif" }}
        >
            {/* 削除ボタン（ホバー時に表示） */}
            <button
                onClick={(e) => { e.stopPropagation(); cardData.onDeleteCard(id); }}
                className="absolute -top-3 -right-3 w-6 h-6 bg-red-100 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-500 hover:text-white shadow-sm z-10 text-xs"
                title="カードを削除"
            >
                ✕
            </button>

            {/* ハンドル（接続用 - 表示は控えめに） */}
            <Handle type="target" position={Position.Top} className="!w-6 !h-2 !rounded-sm !border-0 !bg-gray-200 -mt-2 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Handle type="source" position={Position.Bottom} className="!w-6 !h-2 !rounded-sm !border-0 !bg-gray-200 -mb-2 opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* 1. 上段：画像エリア (16:9) */}
            <div
                className={`
            w-full aspect-video shrink-0 rounded-t-xl border-b border-dashed flex items-center justify-center
            overflow-hidden cursor-pointer transition-all relative
            ${isDragOver ? 'border-violet-400 bg-violet-50/50' : 'border-gray-200 bg-gray-50/50 hover:border-violet-300 hover:bg-gray-50'}
          `}
                onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleImageDrop}
                onClick={handleImageClick}
            >
                {cardData.imageUrl ? (
                    <img
                        src={cardData.imageUrl}
                        alt="thumbnail"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="flex flex-col items-center opacity-40 hover:opacity-80 transition-opacity">
                        <svg className="w-8 h-8 text-gray-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-gray-400 font-medium tracking-wider">画像をアップロード</span>
                    </div>
                )}
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                />
            </div>

            <div className="p-4 flex flex-col gap-3">
                {/* 2. セクション＆タイムスタンプ行 */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <input
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider w-20 outline-none transition-colors border-2 nodrag ${sectionLabel ? colorTheme.bg : 'bg-gray-100 text-gray-500 border-transparent'} focus:border-violet-300`}
                            value={sectionLabel || ''}
                            onChange={(e) => cardData.onUpdateCard(id, { sectionLabel: e.target.value })}
                            placeholder="Section"
                        />
                        <span className="text-[10px] text-gray-300 font-mono tracking-wider ml-1">
                            #{((cardData.order as number) + 1).toString().padStart(2, '0')}
                        </span>
                    </div>

                    {isEditingTimestamp ? (
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={timestampInput}
                            onChange={(e) => setTimestampInput(e.target.value)}
                            onBlur={handleTimestampSubmit}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleTimestampSubmit();
                                if (e.key === 'Escape') setIsEditingTimestamp(false);
                            }}
                            className="w-16 text-xs font-mono px-1.5 py-1 rounded bg-gray-50 text-gray-700 border border-gray-200 outline-none nodrag focus:border-violet-300 focus:ring-1 focus:ring-violet-300 transition-all text-right"
                            autoFocus
                            placeholder="秒数"
                        />
                    ) : (
                        <button
                            onClick={handleTimestampClick}
                            onDoubleClick={handleTimestampDoubleClick}
                            className={`
                  text-[11px] font-mono px-2 py-1 rounded transition-all
                  ${cardData.timestamp !== null
                                    ? 'bg-violet-50 text-violet-700 hover:bg-violet-100 cursor-pointer text-right'
                                    : 'text-gray-400 hover:bg-gray-50 text-right'
                                }
                `}
                            title="クリック: 再生 / ダブルクリック: 手動編集"
                        >
                            {formatTimestamp(cardData.timestamp as number | null)}
                        </button>
                    )}
                </div>

                {/* 3. 歌詞入力 */}
                <div className="relative">
                    <textarea
                        value={lyricsString}
                        onChange={(e) => cardData.onUpdateCard(id, { lyrics: e.target.value.replace(/\n/g, '') })}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') e.preventDefault();
                        }}
                        className="w-full text-[15px] font-medium text-gray-800 bg-transparent border-0 outline-none resize-none leading-relaxed nodrag min-h-[24px] overflow-hidden whitespace-nowrap"
                        placeholder="歌詞を入力..."
                        rows={1}
                    />
                    {canSplit && (
                        <button
                            onClick={() => cardData.onSplitCard(id)}
                            className="absolute bottom-0 right-0 text-[10px] font-medium text-gray-400 hover:text-violet-600 transition-colors nodrag bg-white/80 backdrop-blur-sm px-1"
                            title="スペースや改行で分離"
                        >
                            ✂️ 分離
                        </button>
                    )}
                </div>

                {/* 4. プロンプト */}
                <div className="px-3 pb-3 relative">
                    <textarea
                        value={cardData.prompt || ''}
                        onChange={(e) => cardData.onUpdateCard(id, { prompt: e.target.value })}
                        className="w-full h-10 resize-none rounded-md bg-gray-50 border-0 text-xs px-2 py-2 focus:ring-1 focus:ring-violet-200 outline-none placeholder:text-gray-400 transition-colors pr-8"
                        placeholder="メモ..."
                    />
                    <button
                        onClick={handleCopyPrompt}
                        className="absolute right-5 bottom-5 p-1 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"
                        title="メモをコピー"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                    </button>
                    {isCopied && (
                        <div className="absolute right-5 -top-1 bg-gray-800 text-white text-[10px] px-2 py-1 rounded shadow-lg animate-fade-in-up pointer-events-none">
                            コピーしました！
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default memo(StoryCardNodeComponent);
