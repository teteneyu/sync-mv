'use client';

import React from 'react';
import { getReferenceImageUrl } from '@/lib/syncProject';
import { REFERENCE_TYPE_LABELS, ReferenceAsset, SyncBlock, SyncProject } from '@/types';

interface ReferenceShelfProps {
  project: SyncProject;
  activeBlock?: SyncBlock;
  urlInput: string;
  textReferenceInput: string;
  onChangeUrl: (value: string) => void;
  onChangeTextReference: (value: string) => void;
  onAddFiles: () => void;
  onAddUrl: () => void;
  onAddText: () => void;
  onAttach: (referenceId: string, asMain: boolean) => void;
  onDetach: (referenceId: string) => void;
  onUpdateReference: (referenceId: string, updates: Partial<ReferenceAsset>) => void;
}

export default function ReferenceShelf({
  project,
  activeBlock,
  urlInput,
  textReferenceInput,
  onChangeUrl,
  onChangeTextReference,
  onAddFiles,
  onAddUrl,
  onAddText,
  onAttach,
  onDetach,
  onUpdateReference,
}: ReferenceShelfProps) {
  return (
    <aside className="flex min-h-0 flex-col border-l border-[#c9d0d8] bg-[#f8fafb]">
      <div className="border-b border-[#d8dde3] p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">リファレンス棚</div>
            <div className="text-xs text-[#52606d]">{activeBlock ? `対象 ${activeBlock.id}` : '対象未選択'}</div>
          </div>
          <button className="tool-button" onClick={onAddFiles}>ファイル登録</button>
        </div>
        <p className="mb-2 text-[11px] leading-4 text-[#66717e]">ファイル登録はproject.jsonへIDベースの相対パスを残します。実ファイルはassets/referencesへ同じID名で配置してください。</p>
        <div className="flex gap-2">
          <input
            value={urlInput}
            onChange={(event) => onChangeUrl(event.target.value)}
            className="h-9 min-w-0 flex-1 rounded-md border border-[#c9d0d8] bg-white px-2 text-sm outline-none focus:border-[#2f7d68]"
            placeholder="https://"
          />
          <button className="tool-button" onClick={onAddUrl} disabled={!urlInput.trim()}>URL追加</button>
        </div>
        <textarea
          value={textReferenceInput}
          onChange={(event) => onChangeTextReference(event.target.value)}
          className="mt-2 h-20 w-full resize-none rounded-md border border-[#c9d0d8] bg-white p-2 text-sm outline-none focus:border-[#2f7d68]"
          placeholder="テキスト"
        />
        <button className="mt-2 w-full tool-button" onClick={onAddText} disabled={!textReferenceInput.trim()}>テキスト追加</button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {project.references.length === 0 ? (
          <div className="rounded-md border border-dashed border-[#b8c1cb] bg-white p-4 text-sm text-[#52606d]">リファレンスなし</div>
        ) : (
          <div className="space-y-2">
            {project.references.map((reference) => {
              const attached = Boolean(activeBlock?.referenceIds.includes(reference.id));
              const main = activeBlock?.mainRefId === reference.id;
              const imageUrl = getReferenceImageUrl(reference);
              return (
                <div key={reference.id} className="rounded-md border border-[#d8dde3] bg-white p-3">
                  <div className="mb-2 flex items-start gap-2">
                    <div className="reference-preview">
                      {imageUrl ? <img src={imageUrl} alt={reference.title} /> : <span>{REFERENCE_TYPE_LABELS[reference.type]}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <input
                        value={reference.title}
                        onChange={(event) => onUpdateReference(reference.id, { title: event.target.value })}
                        className="w-full rounded border border-transparent bg-transparent text-sm font-semibold outline-none focus:border-[#c9d0d8] focus:bg-white"
                      />
                      <div className="truncate font-mono text-[10px] text-[#66717e]">{reference.id}</div>
                    </div>
                  </div>
                  <textarea
                    value={reference.note}
                    onChange={(event) => onUpdateReference(reference.id, { note: event.target.value })}
                    className="mb-2 h-14 w-full resize-none rounded-md border border-[#d8dde3] p-2 text-xs outline-none focus:border-[#2f7d68]"
                  />
                  <div className="flex items-center gap-2">
                    <button className={attached ? 'mini-button-active' : 'mini-button'} onClick={() => attached ? onDetach(reference.id) : onAttach(reference.id, false)} disabled={!activeBlock}>
                      {attached ? '解除' : '紐付け'}
                    </button>
                    <button className={main ? 'mini-button-active' : 'mini-button'} onClick={() => onAttach(reference.id, true)} disabled={!activeBlock}>
                      メイン
                    </button>
                    <span className="ml-auto text-xs text-[#52606d]">{REFERENCE_TYPE_LABELS[reference.type]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
