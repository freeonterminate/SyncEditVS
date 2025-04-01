# SyncEdit

Delphi の SyncEdit 機能を VSCode に再現する拡張機能です。

## 概要

選択範囲内に複数回出現する単語を検出し、それらをマルチカーソルで一括編集できるようにします。  
Delphi の「同期編集（SyncEdit）」と同様の体験を VSCode 上で実現できます。

---

## 主な機能

- 選択範囲内の単語のうち、2回以上出現する単語を対象に
- すべての出現位置にマルチカーソルを配置
- 編集時に対象の単語が同時に変更される
- 単語の文字色／範囲の背景色を装飾
- カラープリセット切り替えやカスタマイズ可能
- `Tab` キーで次の単語に切り替え
- `ESC` / `クリック` / `選択範囲外への移動` で SyncEdit を終了

---

## コマンド

| コマンド名 | キーバインド | 機能 |
|------------|--------------|------|
| `SyncEdit: Start` | `Ctrl+Shift+J` | 選択範囲内の単語から同期編集を開始 |
| `SyncEdit: Next Word` | `Tab` | 次の対象単語に切り替え |
| `SyncEdit: Cancel` | `Esc` | 同期編集を終了 |

※ すべてのキーバインドは設定から変更可能です。

---

## 拡張設定（`settings.json`）

```json
"syncEdit.colorPreset": "custom",
"syncEdit.wordTextColor": "#ff3399",
"syncEdit.regionBackgroundColor": "#264f78aa"
```

- `colorPreset`: `"dark"`, `"light"`, `"highcontrast"`, `"fun"` などから選択可能
- `"custom"` を選ぶと下の色設定が有効になります
- 色は RGBA 形式で指定できます（例: `#ff0000cc`）

---

## ローカライズ対応

- 🇯🇵 日本語
- 🇺🇸 英語  
VSCode の表示言語に応じて自動切り替えされます。

---

## ライセンス

MIT

---

## 作者

[piksware](https://piksware.com/)
