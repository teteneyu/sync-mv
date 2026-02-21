'use client';

import React, { useCallback, useMemo, useRef } from 'react';
import {
    ReactFlow,
    Background,
    BackgroundVariant,
    Controls,
    MiniMap,
    ReactFlowProvider,
    useReactFlow,
    type Node,
    type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import StoryCardNodeComponent from './StoryCardNode';
import { StoryCardData, StoryCardNode, AppSettings } from '@/types';

function FocusHandler({ focusNodeId, onFocusComplete }: { focusNodeId: string | null, onFocusComplete?: () => void }) {
    const { fitView } = useReactFlow();
    React.useEffect(() => {
        if (focusNodeId) {
            // 少しズームアップしてカードにフォーカス
            fitView({ nodes: [{ id: focusNodeId }], duration: 800, maxZoom: 1.2 });
            onFocusComplete?.();
        }
    }, [focusNodeId, fitView, onFocusComplete]);
    return null;
}

interface CanvasProps {
    nodes: StoryCardNode[];
    edges: any[];
    onNodesChange: any;
    onEdgesChange: any;
    onNodeDragStop: (event: React.MouseEvent, node: Node) => void;
    onUpdateCard: (id: string, updates: Partial<StoryCardData>) => void;
    onSeekTo: (seconds: number) => void;
    selectedCardId: string | null;
    onSelectCard: (id: string) => void;
    settings: AppSettings;
    onDeleteCard: (id: string) => void;
    onSplitCard: (id: string) => void;
    focusNodeId?: string | null;
    onFocusComplete?: () => void;
}

export default function Canvas({
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onNodeDragStop,
    onUpdateCard,
    onSeekTo,
    selectedCardId,
    onSelectCard,
    settings,
    onDeleteCard,
    onSplitCard,
    focusNodeId,
    onFocusComplete,
}: CanvasProps) {
    const canvasRef = useRef<HTMLDivElement>(null);

    const nodeTypes: NodeTypes = useMemo(
        () => ({
            storyCard: StoryCardNodeComponent,
        }),
        []
    );

    // ノードデータにコールバックを注入
    const enrichedNodes = useMemo(() => {
        return nodes.map((node) => ({
            ...node,
            data: {
                ...node.data,
                onUpdateCard,
                onSeekTo,
                onDeleteCard,
                onSplitCard,
                isSelected: node.id === selectedCardId,
            },
        }));
    }, [nodes, onUpdateCard, onSeekTo, onDeleteCard, onSplitCard, selectedCardId]);

    const handleNodeClick = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            onSelectCard(node.id);
        },
        [onSelectCard]
    );

    return (
        <ReactFlowProvider>
            <div ref={canvasRef} className="w-full h-full" id="storyboard-canvas">
                <ReactFlow
                    nodes={enrichedNodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeDragStop={onNodeDragStop}
                    onNodeClick={handleNodeClick}
                    nodeTypes={nodeTypes}
                    snapToGrid={settings.snapToGrid}
                    snapGrid={[settings.gridSize, settings.gridSize]}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    minZoom={0.1}
                    maxZoom={2}
                    panOnScroll={true}
                    panOnDrag={true}
                    zoomOnDoubleClick={false}
                    selectionOnDrag={true}
                    zoomActivationKeyCode="Control"
                    className="bg-[#fafafa]"
                    proOptions={{ hideAttribution: true }}
                >
                    {settings.showGrid && (
                        <Background
                            variant={BackgroundVariant.Dots}
                            gap={settings.gridSize}
                            size={2}
                            color="#cbd5e1"
                        />
                    )}
                    <Controls
                        className="!bg-white !border-gray-200 !shadow-sm !rounded-xl"
                        showInteractive={false}
                    />
                    <MiniMap
                        className="!bg-white !border-gray-200 !shadow-sm !rounded-xl"
                        nodeColor={(node: Node) => {
                            return node.id === selectedCardId ? '#a78bfa' : '#e5e7eb';
                        }}
                        maskColor="rgba(255, 255, 255, 0.8)"
                        pannable
                        zoomable
                    />
                    <FocusHandler focusNodeId={focusNodeId || null} onFocusComplete={onFocusComplete} />
                </ReactFlow>
            </div>
        </ReactFlowProvider >
    );
}
