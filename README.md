# AI搭載ターミナル

> ⚠️ **Beta版**: 現在開発中のため、予期しない動作をする可能性があります

ElectronベースのAI搭載ターミナルアプリケーション。ネットワーク機器の設定作業を支援します。

## 主な機能

- **AIアシスタント**: Google Gemini
- **マルチ接続**: COM（シリアル）/ SSH接続対応
- **スキルファイル**: ベンダー別設定ガイド（Cisco、VyOS等）
- **マルチタブ**: 複数セッション同時管理
- **AI支援モード**: コマンド編集エリアでの一括実行
- **コピー&ペースト**: ターミナルからの文字列コピー対応

## ⚠️ 注意事項

- **Beta版**: 現在開発中のため、予期しない動作をする可能性があります
- **Windows専用**: macOS/Linuxは未テスト
- **バックアップ推奨**: 重要な設定作業前にバックアップを取ってください
- **セキュリティ**: SSH接続のパスワードはメモリ上にのみ保存されます

## セットアップ

### エンドユーザー向け（ダウンロードして使う）

**推奨**: [Releases](https://github.com/yourusername/ai-terminal/releases)から最新の`AI-Terminal-Portable.zip`をダウンロード

1. ZIPを展開
2. `AI Terminal.exe`を起動
3. 設定パネル（⚙️）からAPIキーを設定

### 開発者向け（ソースから実行）

#### 必要要件

- Node.js 16以上
- Windows 10/11（macOS/Linuxは未テスト）

#### インストール

```bash
git clone https://github.com/yourusername/ai-terminal.git
cd ai-terminal
npm install
```

## 起動

```bash
npm start
```

初回起動後、設定パネル（⚙️）からAPIキーを設定してください。

## Windows実行ファイル作成（開発者向け）

### インストーラー版とポータブル版

```bash
npm run build:win
```

- `dist/AI Terminal Setup.exe` - インストーラー
- `dist/AI Terminal.exe` - ポータブル版（単体）

### ポータブル版ZIP（推奨）

実行に必要なファイルをすべて含んだZIPを作成：

```bash
npm run build:portable
```

- `dist/AI-Terminal-Portable.zip` - 実行ファイル + README + skills

ZIPを展開して、`AI Terminal.exe`を起動するだけで使用できます。

## 使い方

### 接続方法

1. **COMポート接続**
   - 接続タイプで「COM」を選択
   - ポートとボーレートを選択
   - 「接続」ボタンをクリック

2. **SSH接続**
   - 接続タイプで「SSH」を選択
   - ホスト、ポート、ユーザー名、パスワードを入力
   - 「接続」ボタンをクリック

3. **PowerShell**
   - 「Shell」ボタンをクリック

### AIアシスタント

- 左パネルで質問を入力
- ターミナル出力が自動的にコンテキストとして送信されます
- 「ciscoのVLAN設定」等と質問すると、スキルファイルを参照して回答

### AI支援モード

1. 「⚡ 直接編集モード」ボタンをクリックして「🤖 AI支援モード」に切り替え
2. コマンド入力エリアにコマンドを記述
3. 「Commit」ボタンで一括実行

### コピー&ペースト

- **コピー**: テキスト選択後、`Ctrl+C`または右クリック
- **ペースト**: `Ctrl+V`または右クリック

### スキルファイル

`skills/ベンダー名/ファイル.md`にマークダウン形式で設定例を記述。
詳細は`skills/README.md`を参照。

## 設定

左サイドバーの⚙️アイコンから設定パネルを開く：

- AI モデル（Gemini / Claude）
- モデルバージョン
- API Key
- フォントサイズ

### 設定ファイルの保存場所

APIキーや設定は**実行ファイルと同じフォルダ**に保存されます：

- **ポータブル版**: `AI Terminal.exe`と同じフォルダの`config.json`
- **開発環境**: `%APPDATA%\ai-terminal\config.json`

※ APIキーは平文で保存されます。ファイルの取り扱いにご注意ください。

## 既知の問題

- [ ] macOS/Linuxでの動作未確認
- [ ] 大量のログ出力時のパフォーマンス低下の可能性
- [ ] 一部のネットワーク機器での互換性未確認

## フィードバック

問題や改善提案は[Issues](https://github.com/yourusername/ai-terminal/issues)でお知らせください。

## 技術スタック

- **Electron** - デスクトップアプリフレームワーク
- **xterm.js** - ターミナルエミュレータ
- **node-pty** - 疑似ターミナル
- **serialport** - シリアルポート通信
- **ssh2** - SSH接続

## ライセンス

MIT

サードパーティライブラリのライセンス情報は[NOTICE.md](NOTICE.md)を参照してください。

## 貢献

IssueやPull Requestを歓迎します。
