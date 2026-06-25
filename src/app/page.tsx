'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BlockCard from '@/components/sync/BlockCard';
import ReferenceShelf from '@/components/sync/ReferenceShelf';
import TransportPanel from '@/components/sync/TransportPanel';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import {
  addReference,
  attachReference,
  createEmptyProject,
  detachReference,
  downloadTextFile,
  exportableProject,
  formatTimestamp,
  generateAeGuideJsx,
  getBlockById,
  getBlocksInDisplayOrder,
  getCuesInDisplayOrder,
  getNextCueId,
  groupCuts,
  inferReferenceType,
  normalizeProject,
  parseLyricsToProject,
  ungroupScene,
  updateBlock,
  updateCue,
  updateReference,
} from '@/lib/syncProject';
import { Cue, CutBlock, ReferenceAsset, SyncBlock, SyncProject } from '@/types';

export default function Home() {
  const [project, setProject] = useState<SyncProject>(() => createEmptyProject('新規MV'));
  const [lyricsText, setLyricsText] = useState('');
  const [selectedCutIds, setSelectedCutIds] = useState<string[]>([]);
  const [lastSelectedCutId, setLastSelectedCutId] = useState<string | null>(null);
  const [representativeCutId, setRepresentativeCutId] = useState<string | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeCueId, setActiveCueId] = useState<string | null>(null);
  const [syncMode, setSyncMode] = useState(false);
  const [message, setMessage] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [textReferenceInput, setTextReferenceInput] = useState('');
  const lyricsFileRef = useRef<HTMLInputElement>(null);
  const projectFileRef = useRef<HTMLInputElement>(null);
  const audioFileRef = useRef<HTMLInputElement>(null);
  const referenceFileRef = useRef<HTMLInputElement>(null);

  const audio = useAudioPlayer();
  const blocksInOrder = useMemo(() => getBlocksInDisplayOrder(project), [project]);
  const cuesInOrder = useMemo(() => getCuesInDisplayOrder(project), [project]);
  const activeBlock = activeBlockId ? getBlockById(project, activeBlockId) : undefined;
  const activeCue = activeCueId ? cuesInOrder.find((cue) => cue.cutId === activeCueId) : undefined;

  useEffect(() => {
    if (!audio.fileName) return;
    setProject((current) => ({
      ...current,
      audio: {
        path: `assets/audio/${audio.fileName}`,
        duration: audio.duration || current.audio.duration,
      },
    }));
  }, [audio.duration, audio.fileName]);

  useEffect(() => {
    if (cuesInOrder.length === 0) {
      setActiveCueId(null);
      return;
    }
    if (!activeCueId || !cuesInOrder.some((cue) => cue.cutId === activeCueId)) {
      setActiveCueId(cuesInOrder[0].cutId);
    }
  }, [activeCueId, cuesInOrder]);

  const selectBlockForCue = useCallback((cutId: string) => {
    const parent = getBlocksInDisplayOrder(project).find((block) => block.cues.some((cue) => cue.cutId === cutId));
    if (parent) setActiveBlockId(parent.id);
  }, [project]);

  const applyProjectAfterLyrics = useCallback((nextProject: SyncProject, statusMessage: string) => {
    const firstBlock = getBlocksInDisplayOrder(nextProject)[0];
    const firstCue = getCuesInDisplayOrder(nextProject)[0];
    setProject(nextProject);
    setSelectedCutIds(firstBlock?.type === 'cut' ? [firstBlock.id] : []);
    setRepresentativeCutId(firstBlock?.type === 'cut' ? firstBlock.id : null);
    setLastSelectedCutId(firstBlock?.type === 'cut' ? firstBlock.id : null);
    setActiveBlockId(firstBlock?.id ?? null);
    setActiveCueId(firstCue?.cutId ?? null);
    setMessage(statusMessage);
  }, []);

  const handleCreateFromLyrics = useCallback(() => {
    const nextProject = parseLyricsToProject(lyricsText, project.title || '新規MV');
    applyProjectAfterLyrics(nextProject, `${nextProject.blocks.length}件のカットを生成しました`);
  }, [applyProjectAfterLyrics, lyricsText, project.title]);

  const handleLyricsFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setLyricsText(text);
    const nextProject = parseLyricsToProject(text, project.title || file.name.replace(/\.[^.]+$/, ''));
    applyProjectAfterLyrics(nextProject, `${file.name} からカットを生成しました`);
    event.currentTarget.value = '';
  }, [applyProjectAfterLyrics, project.title]);

  const handleProjectFile = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const nextProject = normalizeProject(parsed);
      setProject(nextProject);
      setSelectedCutIds([]);
      setRepresentativeCutId(null);
      setLastSelectedCutId(null);
      setActiveBlockId(getBlocksInDisplayOrder(nextProject)[0]?.id ?? null);
      setActiveCueId(getCuesInDisplayOrder(nextProject)[0]?.cutId ?? null);
      setMessage('project.json を読み込みました');
    } catch (error) {
      setMessage(`project.json を読み込めません: ${error instanceof Error ? error.message : 'unknown error'}`);
    } finally {
      event.currentTarget.value = '';
    }
  }, []);

  const handleAudioFile = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    audio.loadAudio(file);
    setMessage(`${file.name} を読み込みました`);
    event.currentTarget.value = '';
  }, [audio]);

  const handleReferenceFiles = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;
    setProject((current) => files.reduce((next, file) => {
      const type = inferReferenceType(file);
      return addReference(next, {
        type,
        title: file.name,
        path: `assets/references/{id}${getFileExtension(file.name)}`,
        thumbPath: type === 'image' ? `assets/thumbs/${file.name}` : '',
        sourceUrl: '',
        note: '',
        previewUrl: type === 'image' || type === 'video' || type === 'audio' ? URL.createObjectURL(file) : undefined,
      });
    }, current));
    setMessage(`${files.length}件のリファレンスを追加しました`);
    event.currentTarget.value = '';
  }, []);

  const handleAddUrlReference = useCallback(() => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    const isImage = /\.(png|jpe?g|gif|webp|avif|svg)(\?.*)?$/i.test(trimmed);
    setProject((current) => addReference(current, {
      type: isImage ? 'image' : 'url',
      title: trimmed.replace(/^https?:\/\//, '').slice(0, 64),
      path: '',
      thumbPath: '',
      sourceUrl: trimmed,
      note: '',
    }));
    setUrlInput('');
    setMessage('URLリファレンスを追加しました');
  }, [urlInput]);

  const handleAddTextReference = useCallback(() => {
    const trimmed = textReferenceInput.trim();
    if (!trimmed) return;
    setProject((current) => addReference(current, {
      type: 'text',
      title: trimmed.split(/\r?\n/)[0].slice(0, 32) || 'テキストリファレンス',
      path: 'assets/references/{id}.txt',
      thumbPath: '',
      sourceUrl: '',
      note: trimmed,
    }));
    setTextReferenceInput('');
    setMessage('テキストリファレンスを追加しました');
  }, [textReferenceInput]);

  const handleBlockClick = useCallback((block: SyncBlock, event: React.MouseEvent<HTMLElement>) => {
    setActiveBlockId(block.id);
    const target = event.target as HTMLElement;
    if (target.closest('button,input,textarea,select,a,label')) return;
    if (block.type !== 'cut') return;

    const cutIdsInOrder = blocksInOrder.filter((item): item is CutBlock => item.type === 'cut').map((item) => item.id);
    let nextSelection: string[];

    if (event.shiftKey && lastSelectedCutId) {
      const start = cutIdsInOrder.indexOf(lastSelectedCutId);
      const end = cutIdsInOrder.indexOf(block.id);
      if (start >= 0 && end >= 0) {
        const [from, to] = start < end ? [start, end] : [end, start];
        nextSelection = cutIdsInOrder.slice(from, to + 1);
      } else {
        nextSelection = [block.id];
      }
    } else if (event.ctrlKey || event.metaKey) {
      nextSelection = selectedCutIds.includes(block.id)
        ? selectedCutIds.filter((id) => id !== block.id)
        : [...selectedCutIds, block.id];
    } else {
      nextSelection = [block.id];
    }

    if (event.altKey) {
      setRepresentativeCutId(block.id);
      if (!nextSelection.includes(block.id)) nextSelection = [...nextSelection, block.id];
    } else if (!representativeCutId || !nextSelection.includes(representativeCutId)) {
      setRepresentativeCutId(nextSelection[0] ?? null);
    }

    setSelectedCutIds(nextSelection);
    setLastSelectedCutId(block.id);
    setActiveCueId(block.cutId);
  }, [blocksInOrder, lastSelectedCutId, representativeCutId, selectedCutIds]);

  const handleGroupSelection = useCallback(() => {
    const result = groupCuts(project, selectedCutIds, representativeCutId ?? selectedCutIds[0] ?? '');
    setProject(result.project);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setSelectedCutIds([]);
    setRepresentativeCutId(null);
    setLastSelectedCutId(null);
    setActiveBlockId(result.sceneId ?? null);
    setMessage('選択範囲をシーン化しました');
  }, [project, representativeCutId, selectedCutIds]);

  const handleUngroupScene = useCallback((sceneId: string) => {
    const result = ungroupScene(project, sceneId);
    setProject(result.project);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setSelectedCutIds(result.cutIds ?? []);
    setRepresentativeCutId(result.cutIds?.[0] ?? null);
    setLastSelectedCutId(result.cutIds?.[0] ?? null);
    setActiveBlockId(result.cutIds?.[0] ?? null);
    setMessage('シーンを解除しました');
  }, [project]);

  const handleTap = useCallback(() => {
    if (!audio.hasAudio) {
      setMessage('音声を読み込んでからタップしてください');
      return;
    }
    const targetCueId = activeCueId ?? cuesInOrder[0]?.cutId;
    if (!targetCueId) return;
    const time = audio.audioRef.current?.currentTime ?? audio.currentTime;
    setProject((current) => updateCue(current, targetCueId, { time }));
    const nextCueId = getNextCueId(project, targetCueId);
    setActiveCueId(nextCueId);
    if (nextCueId) {
      selectBlockForCue(nextCueId);
    } else {
      setSyncMode(false);
      setMessage('最後のカットまで同期しました');
    }
  }, [activeCueId, audio.audioRef, audio.currentTime, audio.hasAudio, cuesInOrder, project, selectBlockForCue]);

  useEffect(() => {
    if (!syncMode) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.tagName === 'BUTTON' || target.tagName === 'A' || target.isContentEditable) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        handleTap();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTap, syncMode]);

  const updateProjectBlock = useCallback((blockId: string, updates: Partial<SyncBlock>) => {
    setProject((current) => updateBlock(current, blockId, updates));
  }, []);

  const updateProjectCue = useCallback((cutId: string, updates: Partial<Cue>) => {
    setProject((current) => updateCue(current, cutId, updates));
  }, []);

  return (
    <main className="h-screen w-screen overflow-hidden bg-[#eef1f4] text-[#17202a]">
      <input ref={lyricsFileRef} type="file" accept=".txt,.md" className="hidden" onChange={handleLyricsFile} />
      <input ref={projectFileRef} type="file" accept=".json" className="hidden" onChange={handleProjectFile} />
      <input ref={audioFileRef} type="file" accept="audio/*" className="hidden" onChange={handleAudioFile} />
      <input ref={referenceFileRef} type="file" multiple className="hidden" onChange={handleReferenceFiles} />

      <header className="flex h-16 items-center justify-between border-b border-[#c9d0d8] bg-[#f8fafb] px-5">
        <div className="flex min-w-0 items-center gap-4">
          <div className="min-w-[220px]">
            <div className="text-[15px] font-semibold tracking-[0.02em]">Sync MV</div>
            <div className="text-xs text-[#5b6773]">AIと思考を同期する</div>
          </div>
          <input
            value={project.title}
            onChange={(event) => setProject((current) => ({ ...current, title: event.target.value }))}
            className="h-9 w-[280px] rounded-md border border-[#c9d0d8] bg-white px-3 text-sm outline-none focus:border-[#2f7d68]"
            aria-label="プロジェクト名"
          />
          {message && <div className="max-w-[360px] truncate text-xs text-[#52606d]">{message}</div>}
        </div>
        <div className="flex items-center gap-2">
          <button className="tool-button" onClick={() => lyricsFileRef.current?.click()}>歌詞TXT</button>
          <button className="tool-button" onClick={() => projectFileRef.current?.click()}>project.json読込</button>
          <button className="tool-button-primary" onClick={() => downloadTextFile('project.json', JSON.stringify(exportableProject(project), null, 2), 'application/json;charset=utf-8')}>project.json保存</button>
          <button className="tool-button" onClick={() => downloadTextFile('sync-mv-ae-guide.jsx', generateAeGuideJsx(), 'application/javascript;charset=utf-8')}>AE JSX保存</button>
        </div>
      </header>

      <div className="app-shell grid h-[calc(100vh-64px)] overflow-hidden">
        <aside className="flex min-h-0 flex-col border-r border-[#c9d0d8] bg-[#f8fafb]">
          <div className="border-b border-[#d8dde3] p-4">
            <div className="mb-2 text-xs font-semibold text-[#52606d]">歌詞</div>
            <textarea value={lyricsText} onChange={(event) => setLyricsText(event.target.value)} className="h-40 w-full resize-none rounded-md border border-[#c9d0d8] bg-white p-3 text-sm leading-6 outline-none focus:border-[#2f7d68]" placeholder="[Verse]\n歌詞を入力" />
            <button className="mt-3 w-full tool-button-primary" onClick={handleCreateFromLyrics} disabled={!lyricsText.trim()}>カット生成</button>
          </div>
          <div className="border-b border-[#d8dde3] p-4">
            <div className="mb-2 text-xs font-semibold text-[#52606d]">タップシンク</div>
            <div className="rounded-md border border-[#d8dde3] bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <button className={syncMode ? 'pill-active' : 'pill'} onClick={() => setSyncMode((value) => !value)}>{syncMode ? '同期ON' : '同期OFF'}</button>
                <button className="tool-button-primary" onClick={handleTap} disabled={!audio.hasAudio || cuesInOrder.length === 0}>タップ</button>
              </div>
              <div className="text-xs text-[#52606d]">{activeCue ? `${activeCue.cutId} / ${formatTimestamp(activeCue.time)}` : 'カットなし'}</div>
              <div className="mt-2 truncate text-sm font-medium">{activeCue?.lyrics ?? ''}</div>
            </div>
          </div>
          <TransportPanel hasAudio={audio.hasAudio} fileName={audio.fileName} isPlaying={audio.isPlaying} currentTime={audio.currentTime} duration={audio.duration} isLooping={audio.isLooping} onLoadAudio={() => audioFileRef.current?.click()} onTogglePlay={audio.togglePlay} onSeek={audio.seekTo} onSeekRelative={audio.seekRelative} onToggleLoop={audio.toggleLoop} />
        </aside>

        <section className="min-h-0 overflow-y-auto p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div><div className="text-sm font-semibold">制作台帳</div><div className="text-xs text-[#52606d]">{project.blocks.length} blocks / {cuesInOrder.length} cues</div></div>
            <div className="flex items-center gap-2"><span className="text-xs text-[#52606d]">{selectedCutIds.length}件選択</span>{representativeCutId && <span className="rounded bg-[#dfeee8] px-2 py-1 text-xs text-[#25614f]">代表 {representativeCutId}</span>}<button className="tool-button-primary" onClick={handleGroupSelection} disabled={selectedCutIds.length < 2}>シーン化</button></div>
          </div>
          {project.sections.length === 0 ? (
            <div className="flex h-full items-center justify-center rounded-md border border-dashed border-[#b8c1cb] bg-white text-sm text-[#52606d]">歌詞を読み込むと、ここにカットが並びます</div>
          ) : (
            <div className="space-y-6 pb-12">
              {project.sections.map((section) => {
                const sectionBlocks = section.blockIds.map((id) => getBlockById(project, id)).filter(Boolean) as SyncBlock[];
                let sceneIndex = 0;
                return (
                  <div key={section.id}>
                    <div className="mb-3 flex items-center gap-3"><h2 className="text-sm font-semibold text-[#27323f]">{section.label}</h2><span className="h-px flex-1 bg-[#c9d0d8]" /></div>
                    <div className="space-y-3">
                      {sectionBlocks.map((block) => {
                        if (block.type === 'scene') sceneIndex += 1;
                        return <BlockCard key={block.id} block={block} sceneIndex={block.type === 'scene' ? sceneIndex : null} project={project} references={project.references} isActive={activeBlockId === block.id} selectedCutIds={selectedCutIds} representativeCutId={representativeCutId} activeCueId={activeCueId} onClick={handleBlockClick} onUpdateBlock={updateProjectBlock} onUpdateCue={updateProjectCue} onSetRepresentative={(cutId) => { setRepresentativeCutId(cutId); setSelectedCutIds((current) => current.includes(cutId) ? current : [...current, cutId]); }} onSetActiveCue={setActiveCueId} onUngroup={handleUngroupScene} />;
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <ReferenceShelf project={project} activeBlock={activeBlock} urlInput={urlInput} textReferenceInput={textReferenceInput} onChangeUrl={setUrlInput} onChangeTextReference={setTextReferenceInput} onAddFiles={() => referenceFileRef.current?.click()} onAddUrl={handleAddUrlReference} onAddText={handleAddTextReference} onAttach={(referenceId, asMain) => { if (!activeBlock) return; setProject((current) => attachReference(current, activeBlock.id, referenceId, asMain)); }} onDetach={(referenceId) => { if (!activeBlock) return; setProject((current) => detachReference(current, activeBlock.id, referenceId)); }} onUpdateReference={(referenceId: string, updates: Partial<ReferenceAsset>) => setProject((current) => updateReference(current, referenceId, updates))} />
      </div>
    </main>
  );
}


function getFileExtension(filename: string): string {
  const match = filename.match(/\.[^.]+$/);
  return match ? match[0].toLowerCase() : '';
}
