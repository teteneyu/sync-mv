'use client';

import React from 'react';
import {
  formatTimestamp,
  getCueWarning,
  getMainReference,
  getReferenceImageUrl,
} from '@/lib/syncProject';
import {
  BlockStatus,
  Cue,
  REFERENCE_TYPE_LABELS,
  ReferenceAsset,
  STATUS_LABELS,
  SyncBlock,
  SyncProject,
} from '@/types';

const STATUS_OPTIONS = Object.keys(STATUS_LABELS) as BlockStatus[];

interface BlockCardProps {
  block: SyncBlock;
  sceneIndex: number | null;
  project: SyncProject;
  references: ReferenceAsset[];
  isActive: boolean;
  selectedCutIds: string[];
  representativeCutId: string | null;
  activeCueId: string | null;
  onClick: (block: SyncBlock, event: React.MouseEvent<HTMLElement>) => void;
  onUpdateBlock: (blockId: string, updates: Partial<SyncBlock>) => void;
  onUpdateCue: (cutId: string, updates: Partial<Cue>) => void;
  onSetRepresentative: (cutId: string) => void;
  onSetActiveCue: (cutId: string) => void;
  onUngroup: (sceneId: string) => void;
}

export default function BlockCard({
  block,
  sceneIndex,
  project,
  references,
  isActive,
  selectedCutIds,
  representativeCutId,
  activeCueId,
  onClick,
  onUpdateBlock,
  onUpdateCue,
  onSetRepresentative,
  onSetActiveCue,
  onUngroup,
}: BlockCardProps) {
  const attachedReferences = block.referenceIds
    .map((id) => references.find((reference) => reference.id === id))
    .filter(Boolean) as ReferenceAsset[];
  const mainReference = getMainReference(block, references);
  const mainImageUrl = getReferenceImageUrl(mainReference.reference);
  const isSelected = block.type === 'cut' && selectedCutIds.includes(block.id);
  const cardClass = block.type === 'scene' ? 'block-card scene-card' : 'block-card cut-card';
  const label = block.type === 'scene'
    ? `シーン ${String(sceneIndex ?? 0).padStart(2, '0')}`
    : displayCutId(block.cutId);

  return (
    <article
      className={`${cardClass} ${isActive ? 'active-card' : ''} ${isSelected ? 'selected-card' : ''}`}
      onClick={(event) => onClick(block, event)}
    >
      <div className="w-[150px] shrink-0">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">{label}</div>
            <div className="max-w-[120px] truncate font-mono text-[10px] text-[#66717e]">{block.id}</div>
          </div>
          {block.type === 'cut' && (
            <button className={representativeCutId === block.cutId ? 'mini-button-active' : 'mini-button'} onClick={() => onSetRepresentative(block.cutId)}>
              代表
            </button>
          )}
        </div>
        <div className="image-slot">
          {mainImageUrl ? (
            <>
              <img src={mainImageUrl} alt="main reference" className={mainReference.isFallback ? 'fallback-image' : ''} />
              {mainReference.isFallback && <span className="image-badge">仮</span>}
            </>
          ) : (
            <span>画像なし</span>
          )}
        </div>
        <div className="mt-2 flex items-center gap-1">
          {attachedReferences.slice(0, 3).map((reference) => {
            const url = getReferenceImageUrl(reference);
            return (
              <div key={reference.id} className="thumb-slot" title={reference.title}>
                {url ? <img src={url} alt={reference.title} /> : <span>{REFERENCE_TYPE_LABELS[reference.type].slice(0, 1)}</span>}
              </div>
            );
          })}
          {attachedReferences.length > 3 && <span className="text-xs text-[#52606d]">+{attachedReferences.length - 3}</span>}
        </div>
      </div>

      <div className="min-w-[260px] flex-1">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-xs font-semibold text-[#52606d]">歌詞タイミング</div>
          {block.type === 'scene' && <button className="mini-button" onClick={() => onUngroup(block.id)}>シーン解除</button>}
        </div>
        <div className="space-y-2">
          {block.cues.map((cue) => {
            const warning = getCueWarning(project, cue);
            return (
              <div key={cue.cutId} className={activeCueId === cue.cutId ? 'cue-row active-cue' : 'cue-row'}>
                <button className="cue-id" onClick={() => onSetActiveCue(cue.cutId)}>{cue.cutId}</button>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cue.time ?? ''}
                  onChange={(event) => onUpdateCue(cue.cutId, { time: event.target.value === '' ? null : Number(event.target.value) })}
                  className="time-input"
                  aria-label={`${cue.cutId} timestamp`}
                />
                <input
                  value={cue.lyrics}
                  onChange={(event) => onUpdateCue(cue.cutId, { lyrics: event.target.value })}
                  className="lyrics-input"
                  aria-label={`${cue.cutId} lyrics`}
                />
                {warning && <div className="cue-warning">{warning}</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid min-w-[360px] flex-1 grid-cols-3 gap-2">
        <TextAreaField label="意図" value={block.intent} onChange={(value) => onUpdateBlock(block.id, { intent: value } as Partial<SyncBlock>)} />
        <TextAreaField label="AI相談メモ" value={block.aiMemo} onChange={(value) => onUpdateBlock(block.id, { aiMemo: value } as Partial<SyncBlock>)} />
        <TextAreaField label="プロンプト方針" value={block.promptPlan} onChange={(value) => onUpdateBlock(block.id, { promptPlan: value } as Partial<SyncBlock>)} />
      </div>

      <div className="w-[150px] shrink-0">
        <label className="mb-1 block text-xs font-semibold text-[#52606d]">状態</label>
        <select
          value={block.status}
          onChange={(event) => onUpdateBlock(block.id, { status: event.target.value as BlockStatus } as Partial<SyncBlock>)}
          className="h-9 w-full rounded-md border border-[#c9d0d8] bg-white px-2 text-sm outline-none focus:border-[#2f7d68]"
        >
          {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
        </select>
        <div className="mt-3 text-xs text-[#66717e]">開始 {formatTimestamp(getFirstTime(block))}</div>
      </div>
    </article>
  );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="flex min-h-[116px] flex-col gap-1">
      <span className="text-xs font-semibold text-[#52606d]">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[92px] flex-1 resize-none rounded-md border border-[#c9d0d8] bg-white p-2 text-sm leading-5 outline-none focus:border-[#2f7d68]"
      />
    </label>
  );
}

function getFirstTime(block: SyncBlock): number | null {
  return block.cues.find((cue) => cue.time !== null)?.time ?? null;
}

function displayCutId(cutId: string): string {
  return `カット ${cutId.replace(/^cut_/, '')}`;
}
