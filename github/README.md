# LX Music Desktop — 发布文件

## 使用说明

### 方式 1：绿色版（推荐）

下载 `lx-music-desktop-vX.X.X-x64-green.7z`，解压到任意目录，双击 `lx-music-desktop.exe` 即可运行。

### 方式 2：从源码运行

```bash
git clone https://github.com/iaaaxia100-arch/lx-music-desktop.git
cd lx-music-desktop
npm install
npm run dev
```

### 便捷脚本

- `start-lx-music.bat` — 带控制台的启动脚本
- `start-lx-music.vbs` — 静默启动
- `create-shortcut.ps1` — 右键用 PowerShell 运行，生成可固定到任务栏的快捷方式

### 注意事项

- 首次使用需安装依赖：`npm install`
- AI 推荐功能需在设置中配置 API Key 后启用
- 数据存储在 `%APPDATA%/lx-music-desktop`
