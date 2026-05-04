<p align="center"><a href="https://github.com/lyswhut/lx-music-desktop"><img width="200" src="https://github.com/lyswhut/lx-music-desktop/blob/master/doc/images/icon.png" alt="lx-music logo"></a></p>

<h1 align="center">LX Music 桌面版</h1>

<p align="center">一个基于 Electron & Vue 开发的音乐软件</p>

<p align="center">
  <a href="https://github.com/iaaaxia100-arch/lx-music-desktop/releases"><img src="https://img.shields.io/github/v/release/iaaaxia100-arch/lx-music-desktop" alt="Release version"></a>
  <a href="https://github.com/iaaaxia100-arch/lx-music-desktop/actions/workflows/release.yml"><img src="https://github.com/iaaaxia100-arch/lx-music-desktop/workflows/Build/badge.svg" alt="Build status"></a>
</p>

> **注意：** 本项目基于 [lyswhut/lx-music-desktop](https://github.com/lyswhut/lx-music-desktop) (v2.12.2) 修改，原项目使用 Apache License 2.0 许可。

## 新增功能

### AI 智能音乐推荐

基于大模型 API 的智能音乐推荐，类似「猜你喜欢」：

- 选择一个播放列表，大模型分析你的音乐品味
- 自动推荐风格相似的歌曲
- 支持 OpenAI、Anthropic 及自定义兼容 API（如 Ollama、LM Studio 等）
- 推荐结果通过现有音乐源搜索，可直接播放、添加到列表或下载
- 在设置 → AI 智能推荐中配置 API Key 后启用

### 其他改进

- 批量删除歌单中的歌曲
- 自定义 AI 推荐 Prompt
- 优化图标和启动方式

## 快速开始

### 下载安装

前往 [Releases](https://github.com/iaaaxia100-arch/lx-music-desktop/releases) 页面下载最新安装包：

- **Windows 用户**：下载 `lx-music-desktop-vX.X.X-x64-Setup.exe`，双击安装

### 从源码运行

```bash
# 克隆仓库
git clone https://github.com/iaaaxia100-arch/lx-music-desktop.git
cd lx-music-desktop

# 安装依赖
npm install

# 开发模式运行
npm run dev
```

`github/` 目录下提供了便捷启动脚本：
- `start-lx-music.bat` — 带控制台的启动脚本
- `start-lx-music.vbs` — 静默启动（可固定到任务栏）
- `create-shortcut.ps1` — 生成任务栏快捷方式

## 技术支持

- 原项目：https://github.com/lyswhut/lx-music-desktop
- 移动版：https://github.com/lyswhut/lx-music-mobile
- 使用文档：https://lyswhut.github.io/lx-music-doc

## 许可证

本项目基于 [Apache License 2.0](LICENSE) 许可，原始版权归 [lyswhut](https://github.com/lyswhut) 所有。修改部分按相同许可发布。
