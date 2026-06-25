import {
  BlockStatus,
  Cue,
  CutBlock,
  ReferenceAsset,
  ReferenceType,
  SCHEMA_VERSION,
  SceneBlock,
  SceneHistoryEntry,
  Section,
  SyncBlock,
  SyncProject,
  STATUS_LABELS,
} from '@/types';

const DEFAULT_SECTION_LABEL = '未分類';

export function createEmptyProject(title = '新規MV'): SyncProject {
  return {
    schemaVersion: SCHEMA_VERSION,
    title,
    audio: { path: '', duration: 0 },
    sections: [],
    blocks: [],
    references: [],
    sceneHistory: [],
  };
}

export function parseLyricsToProject(text: string, title = '新規MV'): SyncProject {
  const project = createEmptyProject(title);
  const lines = text.split(/\r?\n/);
  let currentSection: Section | null = null;
  let cutNumber = 1;
  let sectionNumber = 1;

  const ensureSection = (label: string) => {
    if (currentSection && currentSection.label === label) return currentSection;
    const section: Section = {
      id: formatNumberedId('section', sectionNumber++),
      label,
      blockIds: [],
    };
    project.sections.push(section);
    currentSection = section;
    return section;
  };

  const addCut = (lyrics: string) => {
    const trimmed = lyrics.trim();
    if (!trimmed) return;

    const section = currentSection ?? ensureSection(DEFAULT_SECTION_LABEL);
    const cutId = formatNumberedId('cut', cutNumber++);
    const block: CutBlock = {
      id: cutId,
      type: 'cut',
      cutId,
      sectionId: section.id,
      order: cutNumber - 2,
      cues: [{ cutId, time: null, lyrics: trimmed }],
      mainRefId: '',
      referenceIds: [],
      intent: '',
      aiMemo: '',
      promptPlan: '',
      status: 'unset',
    };
    project.blocks.push(block);
    section.blockIds.push(block.id);
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const sectionMatch = line.match(/^\[(.+?)\]$/);
    if (sectionMatch) {
      ensureSection(sectionMatch[1].trim() || DEFAULT_SECTION_LABEL);
      continue;
    }

    line.split(/\u3000+/).forEach(addCut);
  }

  return project;
}

export function normalizeProject(input: unknown): SyncProject {
  if (Array.isArray(input)) {
    return migrateLegacyCards(input);
  }

  const raw = input as Partial<SyncProject>;
  const project: SyncProject = {
    schemaVersion: SCHEMA_VERSION,
    title: typeof raw.title === 'string' && raw.title.trim() ? raw.title : '新規MV',
    audio: {
      path: typeof raw.audio?.path === 'string' ? raw.audio.path : '',
      duration: typeof raw.audio?.duration === 'number' ? raw.audio.duration : 0,
    },
    sections: Array.isArray(raw.sections) ? raw.sections.map(normalizeSection) : [],
    blocks: Array.isArray(raw.blocks) ? raw.blocks.map(normalizeBlock).filter(Boolean) as SyncBlock[] : [],
    references: Array.isArray(raw.references) ? raw.references.map(normalizeReference) : [],
    sceneHistory: Array.isArray(raw.sceneHistory)
      ? raw.sceneHistory.map(normalizeSceneHistory).filter(Boolean) as SceneHistoryEntry[]
      : [],
  };

  if (project.sections.length === 0 && project.blocks.length > 0) {
    project.sections = [{ id: 'section_0001', label: DEFAULT_SECTION_LABEL, blockIds: project.blocks.map((block) => block.id) }];
  }

  return project;
}

export function exportableProject(project: SyncProject): SyncProject {
  return {
    ...project,
    schemaVersion: SCHEMA_VERSION,
    references: project.references.map((reference) => ({ id: reference.id, type: reference.type, title: reference.title, path: reference.path, thumbPath: reference.thumbPath, sourceUrl: reference.sourceUrl, note: reference.note })),
    sceneHistory: project.sceneHistory.map((entry) => ({
      ...entry,
      sceneData: stripRuntimeFromBlock(entry.sceneData) as SceneBlock,
      originalCutBlocks: entry.originalCutBlocks.map((block) => stripRuntimeFromBlock(block) as CutBlock),
    })),
    blocks: project.blocks.map(stripRuntimeFromBlock),
  };
}

export function getBlocksInDisplayOrder(project: SyncProject): SyncBlock[] {
  const blockMap = new Map(project.blocks.map((block) => [block.id, block]));
  return project.sections.flatMap((section) => section.blockIds.map((id) => blockMap.get(id)).filter(Boolean) as SyncBlock[]);
}

export function getCuesInDisplayOrder(project: SyncProject): Cue[] {
  return getBlocksInDisplayOrder(project).flatMap((block) => block.cues);
}

export function getBlockById(project: SyncProject, id: string): SyncBlock | undefined {
  return project.blocks.find((block) => block.id === id);
}

export function getReferenceById(project: SyncProject, id: string): ReferenceAsset | undefined {
  return project.references.find((reference) => reference.id === id);
}

export function getBlockStartTime(block: SyncBlock): number | null {
  return block.cues.find((cue) => cue.time !== null)?.time ?? null;
}

export function updateBlock(project: SyncProject, blockId: string, updates: Partial<SyncBlock>): SyncProject {
  return {
    ...project,
    blocks: project.blocks.map((block) => block.id === blockId ? ({ ...block, ...updates } as SyncBlock) : block),
  };
}

export function updateCue(project: SyncProject, cutId: string, updates: Partial<Cue>): SyncProject {
  return {
    ...project,
    blocks: project.blocks.map((block) => ({
      ...block,
      cues: block.cues.map((cue) => cue.cutId === cutId ? { ...cue, ...updates } : cue),
    } as SyncBlock)),
  };
}

export function updateReference(project: SyncProject, referenceId: string, updates: Partial<ReferenceAsset>): SyncProject {
  return {
    ...project,
    references: project.references.map((reference) => reference.id === referenceId ? { ...reference, ...updates } : reference),
  };
}

export function addReference(project: SyncProject, reference: Omit<ReferenceAsset, 'id'>): SyncProject {
  const id = getNextReferenceId(project);
  const nextReference = { id, ...reference };
  nextReference.path = nextReference.path.replaceAll('{id}', id);
  nextReference.thumbPath = nextReference.thumbPath.replaceAll('{id}', id);
  return {
    ...project,
    references: [...project.references, nextReference],
  };
}

export function attachReference(project: SyncProject, blockId: string, referenceId: string, asMain = false): SyncProject {
  return {
    ...project,
    blocks: project.blocks.map((block) => {
      if (block.id !== blockId) return block;
      const referenceIds = block.referenceIds.includes(referenceId)
        ? block.referenceIds
        : [...block.referenceIds, referenceId];
      return {
        ...block,
        referenceIds,
        mainRefId: asMain ? referenceId : block.mainRefId,
      };
    }),
  };
}

export function detachReference(project: SyncProject, blockId: string, referenceId: string): SyncProject {
  return {
    ...project,
    blocks: project.blocks.map((block) => {
      if (block.id !== blockId) return block;
      const referenceIds = block.referenceIds.filter((id) => id !== referenceId);
      return {
        ...block,
        referenceIds,
        mainRefId: block.mainRefId === referenceId ? '' : block.mainRefId,
      };
    }),
  };
}

export function groupCuts(project: SyncProject, cutIds: string[], representativeCutId: string): { project: SyncProject; sceneId?: string; error?: string } {
  const uniqueCutIds = Array.from(new Set(cutIds));
  if (uniqueCutIds.length < 2) return { project, error: '2つ以上のカットを選んでください' };

  const blockMap = new Map(project.blocks.map((block) => [block.id, block]));
  const cutBlocks = uniqueCutIds.map((id) => blockMap.get(id)).filter((block): block is CutBlock => block?.type === 'cut');
  if (cutBlocks.length !== uniqueCutIds.length) return { project, error: 'シーン化できるのは未シーン化のカットだけです' };

  const sectionIds = Array.from(new Set(cutBlocks.map((block) => block.sectionId)));
  if (sectionIds.length !== 1) return { project, error: '同じセクション内のカットだけシーン化できます' };

  const section = project.sections.find((item) => item.id === sectionIds[0]);
  if (!section) return { project, error: 'セクションが見つかりません' };

  const selectedInSection = section.blockIds.filter((id) => uniqueCutIds.includes(id));
  const selectedIndexes = selectedInSection.map((id) => section.blockIds.indexOf(id));
  const minIndex = Math.min(...selectedIndexes);
  const maxIndex = Math.max(...selectedIndexes);
  if (maxIndex - minIndex + 1 !== selectedInSection.length) {
    return { project, error: '連続したカットだけシーン化できます' };
  }

  const representativeBlock = blockMap.get(representativeCutId);
  const representative = representativeBlock?.type === 'cut' && selectedInSection.includes(representativeCutId)
    ? representativeBlock
    : blockMap.get(selectedInSection[0]) as CutBlock;

  const startCutId = selectedInSection[0];
  const endCutId = selectedInSection[selectedInSection.length - 1];
  const sceneId = makeSceneId(startCutId, endCutId, representative.cutId);
  const history = project.sceneHistory.find((entry) => entry.sceneId === sceneId);
  const cues = selectedInSection.map((id) => (blockMap.get(id) as CutBlock).cues[0]);
  const restored = history?.sceneData;

  const sceneBlock: SceneBlock = {
    id: sceneId,
    type: 'scene',
    sectionId: section.id,
    cutIds: selectedInSection,
    representativeCutId: representative.cutId,
    cues,
    mainRefId: restored?.mainRefId ?? representative.mainRefId,
    referenceIds: restored?.referenceIds ?? representative.referenceIds,
    intent: restored?.intent ?? representative.intent,
    aiMemo: restored?.aiMemo ?? representative.aiMemo,
    promptPlan: restored?.promptPlan ?? representative.promptPlan,
    status: restored?.status ?? representative.status,
  };

  const nextSection: Section = {
    ...section,
    blockIds: [
      ...section.blockIds.slice(0, minIndex),
      sceneId,
      ...section.blockIds.slice(maxIndex + 1),
    ],
  };

  const originalCutBlocks = selectedInSection.map((id) => blockMap.get(id) as CutBlock);
  const nextHistoryEntry: SceneHistoryEntry = {
    sceneId,
    cutIds: selectedInSection,
    representativeCutId: representative.cutId,
    sceneData: sceneBlock,
    originalCutBlocks,
    updatedAt: new Date().toISOString(),
  };

  return {
    sceneId,
    project: {
      ...project,
      sections: project.sections.map((item) => item.id === section.id ? nextSection : item),
      blocks: [...project.blocks.filter((block) => !selectedInSection.includes(block.id)), sceneBlock],
      sceneHistory: upsertSceneHistory(project.sceneHistory, nextHistoryEntry),
    },
  };
}

export function ungroupScene(project: SyncProject, sceneId: string): { project: SyncProject; cutIds?: string[]; error?: string } {
  const scene = project.blocks.find((block): block is SceneBlock => block.id === sceneId && block.type === 'scene');
  if (!scene) return { project, error: 'シーンが見つかりません' };

  const section = project.sections.find((item) => item.id === scene.sectionId);
  if (!section) return { project, error: 'セクションが見つかりません' };

  const history = project.sceneHistory.find((entry) => entry.sceneId === sceneId);
  const cutBlocks = restoreCutBlocks(scene, history);
  const sceneIndex = section.blockIds.indexOf(sceneId);
  const nextSection: Section = {
    ...section,
    blockIds: [
      ...section.blockIds.slice(0, sceneIndex),
      ...cutBlocks.map((block) => block.id),
      ...section.blockIds.slice(sceneIndex + 1),
    ],
  };

  const nextHistoryEntry: SceneHistoryEntry = {
    sceneId,
    cutIds: scene.cutIds,
    representativeCutId: scene.representativeCutId,
    sceneData: scene,
    originalCutBlocks: cutBlocks,
    updatedAt: new Date().toISOString(),
  };

  return {
    cutIds: cutBlocks.map((block) => block.id),
    project: {
      ...project,
      sections: project.sections.map((item) => item.id === section.id ? nextSection : item),
      blocks: [...project.blocks.filter((block) => block.id !== sceneId), ...cutBlocks],
      sceneHistory: upsertSceneHistory(project.sceneHistory, nextHistoryEntry),
    },
  };
}

export function makeSceneId(startCutId: string, endCutId: string, representativeCutId: string): string {
  return `scene_${startCutId}_${endCutId}_rep_${representativeCutId.replace(/^cut_/, '')}`;
}

export function getNextCueId(project: SyncProject, currentCutId: string | null): string | null {
  const cues = getCuesInDisplayOrder(project);
  if (cues.length === 0) return null;
  if (!currentCutId) return cues[0].cutId;
  const currentIndex = cues.findIndex((cue) => cue.cutId === currentCutId);
  if (currentIndex < 0) return cues[0].cutId;
  return cues[currentIndex + 1]?.cutId ?? null;
}

export function getPreviousCue(project: SyncProject, cutId: string): Cue | null {
  const cues = getCuesInDisplayOrder(project);
  const index = cues.findIndex((cue) => cue.cutId === cutId);
  return index > 0 ? cues[index - 1] : null;
}

export function getCueWarning(project: SyncProject, cue: Cue): string {
  if (cue.time === null) return '';
  const previous = getPreviousCue(project, cue.cutId);
  if (!previous || previous.time === null) return '';
  return cue.time < previous.time ? '前のカットより早い時刻です' : '';
}

export function formatTimestamp(seconds: number | null): string {
  if (seconds === null || Number.isNaN(seconds)) return '--:--.--';
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  const cent = Math.floor((seconds % 1) * 100);
  return `${min}:${sec.toString().padStart(2, '0')}.${cent.toString().padStart(2, '0')}`;
}

export function inferReferenceType(file: File): ReferenceType {
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('text/')) return 'text';
  return 'file';
}

export function getReferenceImageUrl(reference?: ReferenceAsset): string {
  if (!reference || reference.type !== 'image') return '';
  return reference.previewUrl || reference.sourceUrl || reference.path;
}

export function getMainReference(block: SyncBlock, references: ReferenceAsset[]): { reference?: ReferenceAsset; isFallback: boolean } {
  const byId = new Map(references.map((reference) => [reference.id, reference]));
  if (block.mainRefId) return { reference: byId.get(block.mainRefId), isFallback: false };
  const fallback = block.referenceIds.map((id) => byId.get(id)).find((reference) => reference?.type === 'image');
  return { reference: fallback, isFallback: Boolean(fallback) };
}

export function generateAeGuideJsx(): string {
  return `#target aftereffects
(function () {
  app.beginUndoGroup("Sync MV Guide");
  try {
    var comp = app.project.activeItem;
    if (!(comp instanceof CompItem)) {
      alert("対象コンポを開いてから実行してください。");
      return;
    }

    var jsonFile = File.openDialog("Sync MV project.json を選択", "JSON:*.json");
    if (!jsonFile) return;
    jsonFile.encoding = "UTF-8";
    if (!jsonFile.open("r")) {
      alert("project.json を開けませんでした。");
      return;
    }
    var raw = jsonFile.read();
    jsonFile.close();

    var projectData = JSON.parse(raw);

    for (var i = comp.numLayers; i >= 1; i--) {
      if (comp.layer(i).name === "MV Guide") {
        comp.layer(i).remove();
      }
    }

    var guide = comp.layers.addNull();
    guide.name = "MV Guide";
    guide.enabled = false;

    var references = {};
    for (var r = 0; r < projectData.references.length; r++) {
      references[projectData.references[r].id] = projectData.references[r];
    }

    var blockMap = {};
    for (var b = 0; b < projectData.blocks.length; b++) {
      blockMap[projectData.blocks[b].id] = projectData.blocks[b];
    }

    for (var s = 0; s < projectData.sections.length; s++) {
      var section = projectData.sections[s];
      for (var bi = 0; bi < section.blockIds.length; bi++) {
        var block = blockMap[section.blockIds[bi]];
        if (!block) continue;
        var start = null;
        for (var c = 0; c < block.cues.length; c++) {
          if (block.cues[c].time !== null) {
            start = block.cues[c].time;
            break;
          }
        }
        if (start === null) continue;

        var marker = new MarkerValue(buildMarkerComment(block, references));
        guide.property("Marker").setValueAtTime(start, marker);
      }
    }
  } catch (error) {
    alert("Sync MV AE Guide error: " + error.toString());
  } finally {
    app.endUndoGroup();
  }

  function buildMarkerComment(block, references) {
    var label = block.type === "scene" ? "シーン" : "カット";
    var statusMap = ${JSON.stringify(STATUS_LABELS)};
    var lines = [];
    lines.push("[" + block.id + "] " + label + " / " + (statusMap[block.status] || block.status));
    lines.push("");
    lines.push("歌詞:");
    for (var i = 0; i < block.cues.length; i++) {
      var cue = block.cues[i];
      var time = cue.time === null ? "--.--" : Number(cue.time).toFixed(2);
      lines.push(time + " " + cue.lyrics);
    }
    if (block.intent) {
      lines.push("");
      lines.push("意図:");
      lines.push(block.intent);
    }
    if (block.aiMemo) {
      lines.push("");
      lines.push("AI相談メモ:");
      lines.push(block.aiMemo);
    }
    if (block.promptPlan) {
      lines.push("");
      lines.push("プロンプト方針:");
      lines.push(block.promptPlan);
    }
    if (block.referenceIds && block.referenceIds.length) {
      lines.push("");
      lines.push("リファレンス:");
      for (var r = 0; r < block.referenceIds.length; r++) {
        var ref = references[block.referenceIds[r]];
        if (ref) lines.push(ref.path || ref.sourceUrl || ref.title);
      }
    }
    return lines.join("\\n");
  }
})();
`;
}

export function downloadTextFile(filename: string, contents: string, type = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([contents], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function formatNumberedId(prefix: string, value: number): string {
  return `${prefix}_${value.toString().padStart(4, '0')}`;
}

function getNextReferenceId(project: SyncProject): string {
  const max = project.references.reduce((current, reference) => {
    const match = reference.id.match(/^ref_(\d+)$/);
    return match ? Math.max(current, Number(match[1])) : current;
  }, 0);
  return formatNumberedId('ref', max + 1);
}

function stripRuntimeFromBlock(block: SyncBlock): SyncBlock {
  return JSON.parse(JSON.stringify(block)) as SyncBlock;
}

function upsertSceneHistory(history: SceneHistoryEntry[], entry: SceneHistoryEntry): SceneHistoryEntry[] {
  return [...history.filter((item) => item.sceneId !== entry.sceneId), entry];
}

function restoreCutBlocks(scene: SceneBlock, history?: SceneHistoryEntry): CutBlock[] {
  const cueMap = new Map(scene.cues.map((cue) => [cue.cutId, cue]));
  const historyIsUsable = Boolean(history && history.originalCutBlocks.length === scene.cues.length);
  const source = historyIsUsable ? history!.originalCutBlocks : scene.cues.map((cue, index) => ({
    id: cue.cutId,
    type: 'cut' as const,
    cutId: cue.cutId,
    sectionId: scene.sectionId,
    order: index,
    cues: [cue] as [Cue],
    mainRefId: '',
    referenceIds: [],
    intent: '',
    aiMemo: '',
    promptPlan: '',
    status: 'unset' as BlockStatus,
  }));

  return source.map((block) => {
    const cue = cueMap.get(block.cutId) ?? block.cues[0];
    return {
      ...block,
      cues: [{ ...block.cues[0], lyrics: cue.lyrics, time: cue.time }],
    };
  });
}

function normalizeSection(section: Partial<Section>, index: number): Section {
  return {
    id: typeof section.id === 'string' ? section.id : formatNumberedId('section', index + 1),
    label: typeof section.label === 'string' ? section.label : DEFAULT_SECTION_LABEL,
    blockIds: Array.isArray(section.blockIds) ? section.blockIds.filter((id): id is string => typeof id === 'string') : [],
  };
}

function normalizeCue(cue: Partial<Cue>, fallbackCutId: string): Cue {
  return {
    cutId: typeof cue.cutId === 'string' ? cue.cutId : fallbackCutId,
    time: typeof cue.time === 'number' ? cue.time : null,
    lyrics: typeof cue.lyrics === 'string' ? cue.lyrics : '',
  };
}

function normalizeBlock(block: Partial<SyncBlock>, index: number): SyncBlock | null {
  const id = typeof block.id === 'string' ? block.id : formatNumberedId('cut', index + 1);
  const base = {
    id,
    mainRefId: typeof block.mainRefId === 'string' ? block.mainRefId : '',
    referenceIds: Array.isArray(block.referenceIds) ? block.referenceIds.filter((item): item is string => typeof item === 'string') : [],
    intent: typeof block.intent === 'string' ? block.intent : '',
    aiMemo: typeof block.aiMemo === 'string' ? block.aiMemo : '',
    promptPlan: typeof block.promptPlan === 'string' ? block.promptPlan : '',
    status: isStatus(block.status) ? block.status : 'unset',
  };

  if (block.type === 'scene') {
    const cutIds = Array.isArray(block.cutIds) ? block.cutIds.filter((item): item is string => typeof item === 'string') : [];
    return {
      ...base,
      type: 'scene',
      sectionId: typeof block.sectionId === 'string' ? block.sectionId : 'section_0001',
      cutIds,
      representativeCutId: typeof block.representativeCutId === 'string' ? block.representativeCutId : cutIds[0] ?? '',
      cues: Array.isArray(block.cues) ? block.cues.map((cue, cueIndex) => normalizeCue(cue, cutIds[cueIndex] ?? formatNumberedId('cut', cueIndex + 1))) : [],
    };
  }

  const maybeCut = block as Partial<CutBlock>;
  const cutId = typeof maybeCut.cutId === 'string' ? maybeCut.cutId : id;
  return {
    ...base,
    type: 'cut',
    cutId,
    sectionId: typeof block.sectionId === 'string' ? block.sectionId : 'section_0001',
    order: typeof maybeCut.order === 'number' ? maybeCut.order : index,
    cues: [normalizeCue(Array.isArray(block.cues) ? block.cues[0] ?? {} : {}, cutId)],
  };
}

function normalizeReference(reference: Partial<ReferenceAsset>, index: number): ReferenceAsset {
  return {
    id: typeof reference.id === 'string' ? reference.id : formatNumberedId('ref', index + 1),
    type: isReferenceType(reference.type) ? reference.type : 'file',
    title: typeof reference.title === 'string' ? reference.title : `reference ${index + 1}`,
    path: typeof reference.path === 'string' ? reference.path : '',
    thumbPath: typeof reference.thumbPath === 'string' ? reference.thumbPath : '',
    sourceUrl: typeof reference.sourceUrl === 'string' ? reference.sourceUrl : '',
    note: typeof reference.note === 'string' ? reference.note : '',
  };
}

function normalizeSceneHistory(entry: Partial<SceneHistoryEntry>): SceneHistoryEntry | null {
  if (typeof entry.sceneId !== 'string') return null;
  const sceneData = entry.sceneData ? normalizeBlock(entry.sceneData, 0) : null;
  if (!sceneData || sceneData.type !== 'scene') return null;
  return {
    sceneId: entry.sceneId,
    cutIds: Array.isArray(entry.cutIds) ? entry.cutIds.filter((item): item is string => typeof item === 'string') : sceneData.cutIds,
    representativeCutId: typeof entry.representativeCutId === 'string' ? entry.representativeCutId : sceneData.representativeCutId,
    sceneData,
    originalCutBlocks: Array.isArray(entry.originalCutBlocks)
      ? entry.originalCutBlocks.map((block, index) => normalizeBlock(block, index)).filter((block): block is CutBlock => block?.type === 'cut')
      : [],
    updatedAt: typeof entry.updatedAt === 'string' ? entry.updatedAt : new Date().toISOString(),
  };
}

function migrateLegacyCards(cards: unknown[]): SyncProject {
  const text = cards.map((item) => {
    const card = item as { lyrics?: unknown; sectionLabel?: unknown };
    const section = typeof card.sectionLabel === 'string' && card.sectionLabel ? `[${card.sectionLabel}]\n` : '';
    return `${section}${typeof card.lyrics === 'string' ? card.lyrics : ''}`;
  }).join('\n');
  return parseLyricsToProject(text, '移行プロジェクト');
}

function isStatus(value: unknown): value is BlockStatus {
  return value === 'unset' || value === 'idea' || value === 'draft' || value === 'ready' || value === 'done';
}

function isReferenceType(value: unknown): value is ReferenceType {
  return value === 'image' || value === 'video' || value === 'audio' || value === 'text' || value === 'url' || value === 'file';
}
