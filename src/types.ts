import { Node } from '@xyflow/react';

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
