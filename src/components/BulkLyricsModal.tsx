import React, { useState } from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (text: string) => void;
}

export default function BulkLyricsModal({ isOpen, onClose, onSubmit }: Props) {
    const [text, setText] = useState('');

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!text.trim()) return;
        onSubmit(text);
        setText('');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in transition-all">
            <div className="bg-white rounded-2xl shadow-2xl w-[600px] max-w-[90vw] overflow-hidden flex flex-col transform transition-all animate-slide-up">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        📝 まとめて歌詞入力
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 rounded-lg transition-colors"
                    >
                        ✕
                    </button>
                </div>
                <div className="p-6 flex flex-col gap-4">
                    <p className="text-sm text-gray-500">
                        テキストエリアに直接歌詞を貼り付けてください。
                        空行でカードを区切り、<code className="bg-gray-100 px-1 py-0.5 rounded text-violet-600">[Verse 2]</code>のような形式でセクション名（自動色分け）を自動判別します。
                    </p>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full h-64 resize-y rounded-xl border-gray-200 bg-gray-50 p-4 text-sm focus:bg-white focus:border-violet-500 focus:ring-2 focus:ring-violet-200 outline-none transition-all"
                        placeholder="[Intro]&#10;ここに歌詞を入力してください&#10;&#10;全角スペースや改行でカードが分割されます..."
                    />
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!text.trim()}
                        className="px-5 py-2 text-sm font-bold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-violet-200"
                    >
                        読み込む
                    </button>
                </div>
            </div>
        </div>
    );
}
