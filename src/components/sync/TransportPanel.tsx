'use client';

import React from 'react';
import { formatTimestamp } from '@/lib/syncProject';

interface TransportPanelProps {
  hasAudio: boolean;
  fileName: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLooping: boolean;
  onLoadAudio: () => void;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onSeekRelative: (delta: number) => void;
  onToggleLoop: () => void;
}

export default function TransportPanel({
  hasAudio,
  fileName,
  isPlaying,
  currentTime,
  duration,
  isLooping,
  onLoadAudio,
  onTogglePlay,
  onSeek,
  onSeekRelative,
  onToggleLoop,
}: TransportPanelProps) {
  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="p-4">
      <div className="rounded-md border border-[#d8dde3] bg-white p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[#52606d]">音声</div>
            <div className="truncate text-sm">{fileName ?? '未読込'}</div>
          </div>
          <button className="tool-button" onClick={onLoadAudio}>音声読込</button>
        </div>
        <div className="mb-3 flex items-center gap-2">
          <button className="mini-button" onClick={() => onSeekRelative(-5)} disabled={!hasAudio}>-5</button>
          <button className="tool-button-primary" onClick={onTogglePlay} disabled={!hasAudio}>{isPlaying ? '停止' : '再生'}</button>
          <button className="mini-button" onClick={() => onSeekRelative(5)} disabled={!hasAudio}>+5</button>
          <button className={isLooping ? 'mini-button-active' : 'mini-button'} onClick={onToggleLoop} disabled={!hasAudio}>ループ</button>
        </div>
        <input
          type="range"
          min="0"
          max={Math.max(duration, 0)}
          step="0.01"
          value={Math.min(currentTime, duration || 0)}
          onChange={(event) => onSeek(Number(event.target.value))}
          disabled={!hasAudio}
          className="w-full accent-[#2f7d68]"
        />
        <div className="mt-1 flex justify-between font-mono text-[11px] text-[#52606d]">
          <span>{formatTimestamp(currentTime)}</span>
          <span>{formatTimestamp(duration)}</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e5e9ed]">
          <div className="h-full bg-[#2f7d68]" style={{ width: `${Math.min(progress * 100, 100)}%` }} />
        </div>
      </div>
    </div>
  );
}
