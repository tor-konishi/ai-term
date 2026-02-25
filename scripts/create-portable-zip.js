const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const distDir = path.join(__dirname, '..', 'dist');
const zipName = 'AI-Terminal-Portable.zip';
const zipPath = path.join(distDir, zipName);

// ポータブル版exeを検索（バージョン付きファイル名に対応）
const exeFiles = fs.readdirSync(distDir).filter(f => f.endsWith('.exe') && f.startsWith('AI Terminal'));
if (exeFiles.length === 0) {
  console.error('ポータブル版exeが見つかりません');
  process.exit(1);
}
const portableExe = path.join(distDir, exeFiles[0]);
console.log(`ポータブル版exeを検出: ${exeFiles[0]}`);

const tempDir = path.join(distDir, 'portable-temp');
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true });
}
fs.mkdirSync(tempDir);

console.log('ポータブル版ZIPを作成中...');

fs.copyFileSync(portableExe, path.join(tempDir, 'AI Terminal.exe'));

const readme = `AI Terminal - ポータブル版
========================================

このZIPには実行に必要なファイルがすべて含まれています。

セットアップ手順
----------------

1. このフォルダを任意の場所に展開してください

2. AI Terminal.exe をダブルクリックして起動

3. 設定パネル（⚙️）からAPIキーを設定

注意事項
--------

- 設定ファイル（config.json）は実行ファイルと同じフォルダに保存されます
- フォルダごと移動しても設定が保持されます

使い方
------

詳細な使い方は README.md を参照してください。
https://github.com/yourusername/ai-terminal

問題が発生した場合
------------------

- Windows Defenderに警告される場合は「詳細情報」→「実行」を選択
- COMポート接続できない場合は、デバイスマネージャーでポート番号を確認
- SSH接続できない場合は、ファイアウォール設定を確認

バージョン: 1.0.0
`;

fs.writeFileSync(path.join(tempDir, 'README_PORTABLE.txt'), readme, 'utf8');

const skillsDir = path.join(__dirname, '..', 'skills');
if (fs.existsSync(skillsDir)) {
  const targetSkillsDir = path.join(tempDir, 'skills');
  fs.mkdirSync(targetSkillsDir, { recursive: true });
  
  function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }
  
  copyDir(skillsDir, targetSkillsDir);
  console.log('skillsフォルダをコピーしました');
}

try {
  if (fs.existsSync(zipPath)) {
    fs.unlinkSync(zipPath);
  }
  
  const powershellCmd = `Compress-Archive -Path "${tempDir}\\*" -DestinationPath "${zipPath}" -Force`;
  execSync(`powershell -Command "${powershellCmd}"`, { stdio: 'inherit' });
  
  console.log(`\n✓ ポータブル版ZIPを作成しました: ${zipPath}`);
  console.log(`  ファイルサイズ: ${(fs.statSync(zipPath).size / 1024 / 1024).toFixed(2)} MB`);
  
  fs.rmSync(tempDir, { recursive: true });
} catch (error) {
  console.error('ZIP作成エラー:', error.message);
  process.exit(1);
}
