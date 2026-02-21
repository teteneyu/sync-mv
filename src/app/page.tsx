'use client';

import dynamic from 'next/dynamic';
import React, { useCallback, useRef, useState, useEffect } from 'react';
const Canvas = dynamic(() => import('@/components/Canvas'), { ssr: false });
import Toolbar from '@/components/Toolbar';
import AudioPlayer from '@/components/AudioPlayer';
import ShotListSidebar from '@/components/ShotListSidebar';
import BulkLyricsModal from '@/components/BulkLyricsModal';
import { useStoryCards } from '@/hooks/useStoryCards';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { useTapSync } from '@/hooks/useTapSync';
import { AppSettings } from '@/types';
import {
  exportToJson,
  exportToCsv,
  exportToPdf,
  exportToImage,
} from '@/utils/exportUtils';

export default function Home() {
  const [settings, setSettings] = useState<AppSettings>({
    snapToGrid: true,
    gridSize: 20,
    showGrid: true, // 初期値をONに変更
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    loadLyrics,
    updateCardData,
    handleNodeDragStop,
    selectedCardId,
    setSelectedCardId,
    selectNextCard,
    getCards,
    addCard,
    deleteCard,
    splitCard,
  } = useStoryCards();

  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);

  const {
    loadAudio,
    togglePlay,
    seekTo,
    seekRelative,
    isPlaying,
    currentTime,
    duration,
    fileName,
    hasAudio,
    audioRef,
    isLooping,
    toggleLoop,
  } = useAudioPlayer();

  const [isBulkLyricsOpen, setIsBulkLyricsOpen] = useState(false);

  // タップシンク用に最新のcurrentTimeをrefで追跡（stale closure対策）
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  const { isSyncMode, toggleSyncMode } = useTapSync({
    getCurrentTime: () => audioRef.current?.currentTime ?? currentTimeRef.current,
    selectedCardId,
    selectNextCard,
    updateCardTimestamp: (cardId, timestamp) =>
      updateCardData(cardId, { timestamp }),
    isPlaying,
  });

  const handleToggleGrid = useCallback(() => {
    setSettings((s: AppSettings) => ({ ...s, showGrid: !s.showGrid }));
  }, []);

  const handleToggleSnap = useCallback(() => {
    setSettings((s: AppSettings) => ({ ...s, snapToGrid: !s.snapToGrid }));
  }, []);

  const handleExportJson = useCallback(() => {
    exportToJson(getCards());
  }, [getCards]);

  const handleExportCsv = useCallback(() => {
    exportToCsv(getCards());
  }, [getCards]);

  const handleExportPdf = useCallback(() => {
    const canvasEl = document.getElementById('storyboard-canvas');
    if (canvasEl) exportToPdf(canvasEl);
  }, []);

  const handleExportImage = useCallback(() => {
    const canvasEl = document.getElementById('storyboard-canvas');
    if (canvasEl) exportToImage(canvasEl);
  }, []);

  const handleSeekTo = useCallback(
    (seconds: number) => {
      seekTo(seconds);
      // 再生中でなければ再生開始
      if (!isPlaying && hasAudio) {
        togglePlay();
      }
    },
    [seekTo, isPlaying, hasAudio, togglePlay]
  );

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName) || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      if ((e.key === ' ' || e.code === 'Space') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        togglePlay();
      }

      if (e.shiftKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        seekTo(0);
      }

      if (e.shiftKey && e.key === 'ArrowRight') {
        e.preventDefault();
        if (audioRef.current) {
          seekTo(audioRef.current.duration);
        }
      }

      if (e.key.toLowerCase() === 't' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        toggleSyncMode();
      }

      if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsSidebarOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [addCard, handleExportJson, togglePlay, toggleSyncMode, seekTo, audioRef]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-white">
      <Toolbar
        onLoadLyrics={loadLyrics}
        onLoadAudio={loadAudio}
        onToggleGrid={handleToggleGrid}
        onToggleSnap={handleToggleSnap}
        onExportJson={handleExportJson}
        onExportCsv={handleExportCsv}
        onExportPdf={handleExportPdf}
        onExportImage={handleExportImage}
        onToggleTapSync={toggleSyncMode}
        settings={settings}
        isTapSyncMode={isSyncMode}
        onAddCard={addCard}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        onOpenBulkLyrics={() => setIsBulkLyricsOpen(true)}
      />
      <div className="flex-1 overflow-hidden relative">
        <Canvas
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={handleNodeDragStop}
          onUpdateCard={updateCardData}
          onSeekTo={handleSeekTo}
          selectedCardId={selectedCardId}
          onSelectCard={setSelectedCardId}
          settings={settings}
          onDeleteCard={deleteCard}
          onSplitCard={splitCard}
        />
        {/* タイムスタンプサイドバー (Shot List) */}
        <ShotListSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          nodes={nodes}
          audioDuration={duration}
          onSeekTo={seekTo}
          onFocusNode={(nodeId) => setFocusNodeId(nodeId)}
        />
      </div>
      <AudioPlayer
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        fileName={fileName}
        hasAudio={hasAudio}
        onTogglePlay={togglePlay}
        onSeek={seekTo}
        onSeekRelative={seekRelative}
        isLooping={isLooping}
        onToggleLoop={toggleLoop}
      />
      <BulkLyricsModal
        isOpen={isBulkLyricsOpen}
        onClose={() => setIsBulkLyricsOpen(false)}
        onSubmit={loadLyrics}
      />
    </div>
  );
}
