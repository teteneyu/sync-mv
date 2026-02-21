'use client';

import React, { useCallback, useRef } from 'react';
import { AppSettings } from '@/types';

interface ToolbarProps {
    onLoadLyrics: (text: string) => void;
    onLoadAudio: (file: File) => void;
    onToggleGrid: () => void;
    onToggleSnap: () => void;
    onExportJson: () => void;
    onExportCsv: () => void;
    onExportPdf: () => void;
    onExportImage: () => void;
    onToggleTapSync: () => void;
    isTapSyncMode: boolean;
    onAddCard: () => void;
    onToggleSidebar: () => void;
    onOpenBulkLyrics: () => void;
    settings: AppSettings;
}

export default function Toolbar({
    onLoadLyrics,
    onLoadAudio,
    onToggleGrid,
    onToggleSnap,
    onExportJson,
    onExportCsv,
    onExportPdf,
    onExportImage,
    onToggleTapSync,
    settings,
    isTapSyncMode,
    onAddCard,
    onToggleSidebar,
    onOpenBulkLyrics,
}: ToolbarProps) {
    const lyricsInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);

    const handleLyricsFile = useCallback(
        async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const text = await file.text();
            onLoadLyrics(text);
            // リセット
            if (lyricsInputRef.current) lyricsInputRef.current.value = '';
        },
        [onLoadLyrics]
    );

    const handleAudioFile = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;
            onLoadAudio(file);
            if (audioInputRef.current) audioInputRef.current.value = '';
        },
        [onLoadAudio]
    );

    return (
        <header className="h-16 w-full bg-white border-b border-gray-100 flex items-center justify-between px-6 shadow-sm shrink-0 z-50">
            <div className="flex items-center gap-4">
                {/* ロゴ */}
                <div className="flex items-center gap-2 mr-4">
                    <span className="text-xl">🎬</span>
                    <h1 className="text-base font-bold text-gray-700 tracking-tight">
                        MV Storyboard
                    </h1>
                </div>

                <div className="w-px h-8 bg-gray-200" />

                {/* ファイル読み込み */}
                <div className="flex items-center gap-1.5 ml-2">
                    <button
                        onClick={onAddCard}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-white bg-violet-500 hover:bg-violet-600 rounded-lg shadow-sm shadow-violet-200 hover:shadow-md hover:shadow-violet-200 hover:-translate-y-0.5 transition-all"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                        </svg>
                        カード追加
                    </button>
                    <div className="w-px h-4 mx-1 bg-gray-200" />
                    <div className="flex bg-gray-50 rounded-lg overflow-hidden border border-gray-100 divide-x divide-gray-200">
                        <button
                            onClick={() => lyricsInputRef.current?.click()}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-violet-50 hover:text-violet-600 transition-all"
                            title="ファイルから歌詞を読み込む"
                        >
                            📝 ファイル
                        </button>
                        <button
                            onClick={onOpenBulkLyrics}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-violet-50 hover:text-violet-600 transition-all"
                            title="テキストでまとめて歌詞を入力"
                        >
                            📋 直接入力
                        </button>
                    </div>
                    <input
                        ref={lyricsInputRef}
                        type="file"
                        accept=".txt"
                        className="hidden"
                        onChange={handleLyricsFile}
                    />

                    <button
                        onClick={() => audioInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-violet-50 hover:text-violet-600 rounded-lg transition-all"
                    >
                        🎵 音声を読み込む
                    </button>
                    <input
                        ref={audioInputRef}
                        type="file"
                        accept=".mp3,.wav,.ogg,.m4a"
                        className="hidden"
                        onChange={handleAudioFile}
                    />
                </div>

                <div className="w-px h-8 bg-gray-200" />

                {/* キャンバス設定 */}
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={onToggleGrid}
                        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all ${settings.showGrid
                            ? 'bg-violet-100 text-violet-600'
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                            }`}
                    >
                        {settings.showGrid ? '⊞' : '⊟'} グリッド
                    </button>
                    <button
                        onClick={onToggleSnap}
                        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-all ${settings.snapToGrid
                            ? 'bg-violet-100 text-violet-600'
                            : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                            }`}
                    >
                        🧲 スナップ
                    </button>
                </div>

                <div className="w-px h-8 bg-gray-200" />

                {/* タップシンク */}
                <button
                    onClick={onToggleTapSync}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-medium rounded-lg transition-all ${isTapSyncMode
                        ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200 shadow-sm shadow-rose-100/50 animate-pulse'
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                        }`}
                >
                    <span className="relative flex h-2 w-2">
                        {isTapSyncMode && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>}
                        <span className={`relative inline-flex rounded-full h-2 w-2 ${isTapSyncMode ? 'bg-rose-500' : 'bg-gray-400'}`}></span>
                    </span>
                    タップシンク
                </button>

                <div className="w-px h-8 bg-gray-200 ml-1" />

                {/* タイムスタンプリスト起動 */}
                <button
                    onClick={onToggleSidebar}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] font-semibold text-white bg-violet-500 hover:bg-violet-600 rounded-lg shadow-sm shadow-violet-200 hover:shadow-md hover:shadow-violet-200 hover:-translate-y-0.5 transition-all"
                >
                    🎬 ショットリスト
                </button>
            </div>

            <div className="flex items-center gap-3">
                {/* エクスポート */}
                <div className="flex items-center gap-2 border-l border-gray-100 pl-4">
                    <span className="text-xs text-gray-400 font-medium tracking-wide">EXPORT</span>
                    <button
                        onClick={onExportJson}
                        className="px-3 py-1.5 text-[13px] font-medium text-gray-600 bg-gray-50 hover:bg-violet-50 hover:text-violet-600 rounded-lg transition-colors border border-gray-200"
                    >
                        JSON
                    </button>
                    <button
                        onClick={onExportCsv}
                        className="px-3 py-1.5 text-[13px] font-medium text-gray-600 bg-gray-50 hover:bg-violet-50 hover:text-violet-600 rounded-lg transition-colors border border-gray-200"
                    >
                        CSV
                    </button>
                </div>
            </div>
        </header>
    );
}
