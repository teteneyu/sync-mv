import { StoryCardData } from '@/types';

let cardCounter = 0;

export function generateId(): string {
    cardCounter++;
    return `card-${Date.now()}-${cardCounter}`;
}

export function parseLyrics(text: string): StoryCardData[] {
    const lines = text.split('\n');
    const cards: StoryCardData[] = [];
    let currentSection: string | null = null;
    let order = 0;

    const addCard = (lyrics: string) => {
        const trimmed = lyrics.trim();
        if (trimmed.length > 0) {
            cards.push({
                id: generateId(),
                lyrics: trimmed,
                imageUrl: null,
                prompt: '',
                timestamp: null,
                sectionLabel: currentSection,
                order: order++,
            });
        }
    };

    for (const line of lines) {
        const trimmed = line.trim();

        // セクションタグの検出 (例: [Intro], [Verse 1], [Chorus])
        const sectionMatch = trimmed.match(/^\[(.+?)\]$/);
        if (sectionMatch) {
            currentSection = sectionMatch[1];
            continue;
        }

        // 空行はスキップ
        if (trimmed === '') {
            continue;
        }

        // 全角スペースで分割して各フレーズを個別カードにする
        const phrases = trimmed.split(/\u3000+/);
        for (const phrase of phrases) {
            addCard(phrase);
        }
    }

    return cards;
}

export function arrangeCardsOnGrid(
    cards: StoryCardData[],
    cardWidth: number = 320,
    cardHeight: number = 280,
    gapX: number = 40,
    gapY: number = 100, // セクション間の縦余白
    startX: number = 50,
    startY: number = 200
): { card: StoryCardData; x: number; y: number }[] {
    let currentX = startX;
    let currentY = startY;
    let prevSection = cards.length > 0 ? cards[0].sectionLabel : null;

    return cards.map((card, index) => {
        const section = card.sectionLabel;

        if (index > 0) {
            if (section !== prevSection) {
                // セクションが変わったら次の行に移動
                currentX = startX;
                currentY += cardHeight + gapY;
            } else {
                currentX += cardWidth + gapX;
            }
        }
        prevSection = section;

        return {
            card,
            x: currentX,
            y: currentY,
        };
    });
}
