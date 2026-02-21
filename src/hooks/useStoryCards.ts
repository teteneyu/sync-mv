'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import {
    useNodesState,
    useEdgesState,
    type Node,
    type Edge,
    type NodeChange,
} from '@xyflow/react';
import { StoryCardData, StoryCardNode } from '@/types';
import { parseLyrics, arrangeCardsOnGrid, generateId } from '@/utils/LyricsLoader';

const MERGE_DISTANCE = 50; // カード同士を連結する判定距離
const SNAP_DISTANCE = 40;
const CARD_WIDTH = 320;
const CARD_HEIGHT = 280;
const GAP_X = 40;
const GAP_Y = 120;

export function useStoryCards() {
    const [nodes, setNodes, onNodesChange] = useNodesState<StoryCardNode>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const cardOrderRef = useRef<string[]>([]);
    const pastRef = useRef<StoryCardNode[][]>([]);
    const futureRef = useRef<StoryCardNode[][]>([]);

    const saveHistory = useCallback((currentNodes: StoryCardNode[]) => {
        pastRef.current.push([...currentNodes]);
        futureRef.current = [];
    }, []);

    const undo = useCallback(() => {
        if (pastRef.current.length === 0) return;
        setNodes((currentNodes) => {
            const previous = pastRef.current.pop()!;
            futureRef.current.push([...currentNodes]);
            return previous;
        });
    }, [setNodes]);

    const redo = useCallback(() => {
        if (futureRef.current.length === 0) return;
        setNodes((currentNodes) => {
            const next = futureRef.current.pop()!;
            pastRef.current.push([...currentNodes]);
            return next;
        });
    }, [setNodes]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
                return;
            }
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z') {
                    if (e.shiftKey) {
                        e.preventDefault();
                        redo();
                    } else {
                        e.preventDefault();
                        undo();
                    }
                } else if (e.key === 'y') {
                    e.preventDefault();
                    redo();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    const loadLyrics = useCallback(
        (text: string) => {
            const cards = parseLyrics(text);
            const arranged = arrangeCardsOnGrid(cards, CARD_WIDTH, CARD_HEIGHT, GAP_X, GAP_Y);

            const newNodes: StoryCardNode[] = arranged.map(({ card, x, y }) => ({
                id: card.id,
                type: 'storyCard',
                position: { x, y },
                data: card,
            }));

            setNodes(newNodes);
            setEdges([]);
            cardOrderRef.current = newNodes.map((n) => n.id);
            if (newNodes.length > 0) {
                setSelectedCardId(newNodes[0].id);
            }
        },
        [setNodes, setEdges]
    );

    const updateCardData = useCallback(
        (cardId: string, updates: Partial<StoryCardData>) => {
            setNodes((nds) =>
                nds.map((node) => {
                    if (node.id === cardId) {
                        return {
                            ...node,
                            data: { ...node.data, ...updates },
                        };
                    }
                    return node;
                })
            );
        },
        [setNodes]
    );

    const addCard = useCallback(() => {
        setNodes((nds) => {
            const offset = (nds.length % 5) * 20; // 少しずつずらして配置
            const newCard: StoryCardNode = {
                id: generateId(),
                type: 'storyCard',
                position: { x: 50 + offset, y: 50 + offset },
                data: {
                    id: generateId(),
                    lyrics: '',
                    imageUrl: null,
                    prompt: '',
                    timestamp: null,
                    sectionLabel: null,
                    order: nds.length,
                }
            };
            return [...nds, newCard];
        });
    }, [setNodes]);

    const deleteCard = useCallback((cardId: string) => {
        setNodes((nds) => nds.filter((n) => n.id !== cardId));
    }, [setNodes]);

    const splitCard = useCallback((cardId: string) => {
        setNodes((nds) => {
            const targetIndex = nds.findIndex((n) => n.id === cardId);
            if (targetIndex === -1) return nds;

            const target = nds[targetIndex];
            const lyrics = String(target.data.lyrics);

            // 分離：全角スペースまたは改行で分割
            const parts = lyrics.split(/[\u3000\n]+/).filter(p => p.trim().length > 0);
            if (parts.length <= 1) return nds;

            // アンドゥ履歴を保存
            saveHistory(nds);

            // シフト計算（分割して増えたカード分の幅）
            const shiftX = (parts.length - 1) * (CARD_WIDTH + GAP_X);

            // 右側にある同一直線上のカードを右にずらす
            const shiftedNodes = nds.map((n) => {
                const isSameRow = Math.abs(n.position.y - target.position.y) < 20;
                if (n.id !== target.id && isSameRow && n.position.x > target.position.x) {
                    return { ...n, position: { ...n.position, x: n.position.x + shiftX } };
                }
                return n;
            });

            // 元カードは前半部分を保持
            const updatedTarget = {
                ...shiftedNodes[targetIndex],
                data: { ...shiftedNodes[targetIndex].data, lyrics: parts[0] }
            };

            // 以降のフレーズを新カードとして生成
            const newCards = parts.slice(1).map((part, idx) => ({
                id: generateId(),
                type: 'storyCard',
                position: { x: target.position.x + (idx + 1) * (CARD_WIDTH + GAP_X), y: target.position.y },
                data: {
                    ...target.data,
                    id: generateId(),
                    lyrics: part,
                    imageUrl: null, // 画像は引き継がない
                    prompt: '', // プロンプトは引き継がない
                    timestamp: null, // 再生位置も引き継がない
                }
            }));

            const newNodes = [...shiftedNodes];
            newNodes[targetIndex] = updatedTarget;
            newNodes.splice(targetIndex + 1, 0, ...newCards as StoryCardNode[]);
            return newNodes;
        });
    }, [setNodes]);

    const handleNodeDragStop = useCallback(
        (_event: React.MouseEvent, draggedNode: Node) => {
            setNodes((nds) => {
                const otherNodes = nds.filter((n) => n.id !== draggedNode.id);

                // 1. 連結判定（マージ）
                let mergedTargetId: string | null = null;

                // ドラッグ中のカードの中心座標を計算
                const draggedCenterX = draggedNode.position.x + CARD_WIDTH / 2;
                const draggedCenterY = draggedNode.position.y + CARD_HEIGHT / 2;

                for (const other of otherNodes) {
                    // 他のカードの領域（バウンディングボックス）
                    const otherLeft = other.position.x;
                    const otherRight = other.position.x + CARD_WIDTH;
                    const otherTop = other.position.y;
                    const otherBottom = other.position.y + CARD_HEIGHT;

                    // 中心座標が他のカードの領域内にあるか判定
                    if (
                        draggedCenterX >= otherLeft &&
                        draggedCenterX <= otherRight &&
                        draggedCenterY >= otherTop &&
                        draggedCenterY <= otherBottom
                    ) {
                        mergedTargetId = other.id;
                        break;
                    }
                }

                if (mergedTargetId) {
                    saveHistory(nds); // マージ前に履歴を保存
                    // マージ先ターゲットにテキストを統合し、ドラッグされたノードを削除
                    return nds.map((n) => {
                        if (n.id === mergedTargetId) {
                            const oldLyrics = String(n.data.lyrics || '');
                            const dragLyrics = String(draggedNode.data.lyrics || '');
                            const newLyrics = oldLyrics
                                ? `${oldLyrics}　${dragLyrics}`
                                : dragLyrics;
                            return {
                                ...n,
                                data: { ...n.data, lyrics: newLyrics }
                            };
                        }
                        return n;
                    }).filter((n) => n.id !== draggedNode.id);
                }

                // 2. スナップ判定
                let snappedX = draggedNode.position.x;
                let snappedY = draggedNode.position.y;
                let didSnap = false;

                for (const other of otherNodes) {
                    // 横方向スナップ：右隣に吸着
                    const rightEdge = other.position.x + CARD_WIDTH + GAP_X;
                    if (
                        Math.abs(snappedX - rightEdge) < SNAP_DISTANCE &&
                        Math.abs(snappedY - other.position.y) < SNAP_DISTANCE
                    ) {
                        snappedX = rightEdge;
                        snappedY = other.position.y;
                        didSnap = true;
                        break;
                    }

                    // 横方向スナップ：左隣に吸着
                    const leftEdge = other.position.x - CARD_WIDTH - GAP_X;
                    if (
                        Math.abs(snappedX - leftEdge) < SNAP_DISTANCE &&
                        Math.abs(snappedY - other.position.y) < SNAP_DISTANCE
                    ) {
                        snappedX = leftEdge;
                        snappedY = other.position.y;
                        didSnap = true;
                        break;
                    }

                    // 縦方向スナップ：下に吸着
                    const bottomEdge = other.position.y + CARD_HEIGHT + GAP_Y;
                    if (
                        Math.abs(snappedY - bottomEdge) < SNAP_DISTANCE &&
                        Math.abs(snappedX - other.position.x) < SNAP_DISTANCE
                    ) {
                        snappedX = other.position.x;
                        snappedY = bottomEdge;
                        didSnap = true;
                        break;
                    }

                    // 縦方向スナップ：上に吸着
                    const topEdge = other.position.y - CARD_HEIGHT - GAP_Y;
                    if (
                        Math.abs(snappedY - topEdge) < SNAP_DISTANCE &&
                        Math.abs(snappedX - other.position.x) < SNAP_DISTANCE
                    ) {
                        snappedX = other.position.x;
                        snappedY = topEdge;
                        didSnap = true;
                        break;
                    }
                }

                if (didSnap) {
                    return nds.map((n) =>
                        n.id === draggedNode.id
                            ? { ...n, position: { x: snappedX, y: snappedY } }
                            : n
                    );
                }

                return nds;
            });
        },
        [setNodes]
    );

    const selectNextCard = useCallback(() => {
        const order = cardOrderRef.current;
        if (order.length === 0) return null;
        if (!selectedCardId) {
            setSelectedCardId(order[0]);
            return order[0];
        }
        const currentIndex = order.indexOf(selectedCardId);
        const nextIndex = (currentIndex + 1) % order.length;
        setSelectedCardId(order[nextIndex]);
        return order[nextIndex];
    }, [selectedCardId]);

    const getCards = useCallback((): StoryCardData[] => {
        // 見た目の配置順序でソートする (まずは行(Y)で大まかに並べ、次にXで並べる)
        const sortedNodes = [...nodes].sort((a, b) => {
            const yDiff = a.position.y - b.position.y;
            // 150px未満のY軸差異は「同じ行」とみなす
            if (Math.abs(yDiff) > 150) {
                return yDiff;
            }
            return a.position.x - b.position.x;
        });

        // エクスポート用にorderを見かけ順に再採番して返す
        return sortedNodes.map((n, i) => ({ ...n.data, order: i }));
    }, [nodes]);

    return {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        loadLyrics,
        addCard,
        deleteCard,
        splitCard,
        updateCardData,
        handleNodeDragStop,
        selectedCardId,
        setSelectedCardId,
        selectNextCard,
        getCards,
        setNodes,
    };
}
