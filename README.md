# Sync MV

表示名: `Sync MV | AIと思考を同期する`

歌詞、音声タイミング、シーン/カットの意図、AI相談メモ、プロンプト方針、リファレンスを `project.json` として扱うMV制作支援MVPです。

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## MVP scope

- 歌詞から固定IDのカット生成
- 音声読み込みとタップシンク
- セクションごとの横長カード一覧
- リファレンス棚とメイン画像指定
- 複数カットのシーン化、解除、同条件再シーン化時の復元
- `project.json` import/export
- After Effects `MV Guide` JSX出力
