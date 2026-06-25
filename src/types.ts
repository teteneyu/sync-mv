import { Node } from '@xyflow/react';

export const SCHEMA_VERSION = 'sync-mv/v0.1' as const;

export type BlockStatus = 'unset' | 'idea' | 'draft' | 'ready' | 'done';
export type ReferenceType = 'image' | 'video' | 'audio' | 'text' | 'url' | 'file';
export type BlockType = 'cut' | 'scene';

export interface Cue {
  cutId: string;
  time: number | null;
  lyrics: string;
}

export interface Section {
  id: string;
  label: string;
  blockIds: string[];
}

export interface ReferenceAsset {
  id: string;
  type: ReferenceType;
  title: string;
  path: string;
  thumbPath: string;
  sourceUrl: string;
  note: string;
  previewUrl?: string;
}

export interface BlockBase {
  id: string;
  type: BlockType;
  mainRefId: string;
  referenceIds: string[];
  intent: string;
  aiMemo: string;
  promptPlan: string;
  status: BlockStatus;
}

export interface CutBlock extends BlockBase {
  type: 'cut';
  cutId: string;
  sectionId: string;
  order: number;
  cues: [Cue];
}

export interface SceneBlock extends BlockBase {
  type: 'scene';
  sectionId: string;
  cutIds: string[];
  representativeCutId: string;
  cues: Cue[];
}

export type SyncBlock = CutBlock | SceneBlock;

export interface SceneHistoryEntry {
  sceneId: string;
  cutIds: string[];
  representativeCutId: string;
  sceneData: SceneBlock;
  originalCutBlocks: CutBlock[];
  updatedAt: string;
}

export interface SyncProject {
  schemaVersion: typeof SCHEMA_VERSION;
  title: string;
  audio: {
    path: string;
    duration: number;
  };
  sections: Section[];
  blocks: SyncBlock[];
  references: ReferenceAsset[];
  sceneHistory: SceneHistoryEntry[];
}

export const STATUS_LABELS: Record<BlockStatus, string> = {
  unset: '未設定',
  idea: 'アイデア',
  draft: '下書き',
  ready: '制作OK',
  done: '完了',
};

export const REFERENCE_TYPE_LABELS: Record<ReferenceType, string> = {
  image: '画像',
  video: '動画',
  audio: '音声',
  text: 'テキスト',
  url: 'URL',
  file: 'ファイル',
};

// Legacy types kept so the old prototype files remain type-checkable while the MVP UI is rebuilt.
export interface StoryCardData {
  [key: string]: unknown;
  id: string;
  lyrics: string;
  imageUrl: string | null;
  prompt: string;
  timestamp: number | null;
  sectionLabel: string | null;
  order: number;
}

export type StoryCardNode = Node<StoryCardData, 'storyCard'>;

export interface AudioState {
  file: File | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

export interface AppSettings {
  snapToGrid: boolean;
  gridSize: number;
  showGrid: boolean;
}
