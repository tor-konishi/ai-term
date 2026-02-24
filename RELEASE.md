# リリース手順

## ソースコード公開

```bash
# Gitリポジトリ初期化
git init
git add .
git commit -m "Initial commit: AI Terminal Beta v1.0.0"

# GitHubにプッシュ
git branch -M main
git remote add origin https://github.com/yourusername/ai-terminal.git
git push -u origin main
```

## 実行ファイルのビルドと公開

### 1. ビルド

```bash
npm run build:win
```

生成されるファイル:
- `dist/AI Terminal Setup.exe` - インストーラー（推奨）
- `dist/AI Terminal.exe` - ポータブル版

### 2. GitHub Releasesで公開

1. GitHubリポジトリページで「Releases」→「Create a new release」
2. タグ: `v1.0.0-beta`
3. タイトル: `AI Terminal v1.0.0 Beta`
4. 説明:
```markdown
## AI Terminal v1.0.0 Beta

初回ベータリリース

### 主な機能
- AIアシスタント（Gemini/Claude対応）
- COM/SSH接続
- スキルファイル（Cisco/VyOS）
- マルチタブ
- AI支援モード

### ダウンロード
- **AI Terminal Setup.exe**: インストーラー版（推奨）
- **AI Terminal.exe**: ポータブル版

### 注意事項
⚠️ Beta版のため、予期しない動作をする可能性があります
```

5. ファイルをアップロード:
   - `AI Terminal Setup.exe`
   - `AI Terminal.exe`

6. 「This is a pre-release」にチェック
7. 「Publish release」をクリック

## 推奨公開戦略

### ✅ 推奨: ソースコード + Releases

**メリット**:
- ユーザーは実行ファイルをダウンロードするだけで使える
- 開発者はソースコードから自分でビルドできる
- GitHubの標準的な配布方法
- ダウンロード数が追跡できる

**手順**:
1. ソースコードをGitHubにプッシュ（distフォルダは除外）
2. ローカルで`npm run build:win`を実行
3. GitHub Releasesで実行ファイルを配布

### ❌ 非推奨: distフォルダをコミット

**デメリット**:
- リポジトリサイズが大きくなる
- バイナリファイルの差分管理が困難
- クローン時間が長くなる

## 更新時の手順

```bash
# バージョン更新
npm version patch  # 1.0.0 → 1.0.1

# ビルド
npm run build:win

# コミット&プッシュ
git push origin main
git push origin --tags

# GitHub Releasesで新バージョンを公開
```
