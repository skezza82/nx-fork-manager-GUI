# NX Fork Manager GUI 🎮

A modern, high-performance Windows desktop GUI for [nx-fork-manager](https://github.com/Schroederr/nx-fork-manager) that keeps your Nintendo Switch emulator forks up to date and tells you which fork to use for each game.

Powered by community compatibility data from [riyadhHDA/wichforks](https://github.com/riyadhHDA/wichforks).

![Platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-blue)
![License](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Features

- **🎮 Fork Library Dashboard**:
  - One-click **Launch**, **Update**, **Check**, and **Install** for all known Switch emulator forks (Eglantine, Lichii, Orchid, PokeDinner, Selevet, SmileyTatsu, and more).
  - Automatically downloads, verifies SHA-256 hashes / file sizes, and extracts ready-made Windows releases.
  - Safe rollback to previous versions with 1-click **Rollback** and **Pin** to prevent accidental updates.
  - Never overwrites an emulator while it is currently running.
  - Card View and Table View with live search and filter pills (*All*, *Installed*, *Pinned*, *Custom*).

- **🎯 Which Fork For Which Game**:
  - Browse community recommendations per game from the `wichforks` guide.
  - **Launch Recommended Fork** with a single click (automatically installs the build if not present).
  - Add **Personal Game Notes** and set custom overrides (your own benchmarks and preferences take precedence over the community guide).
  - Auto-filtered by your detected GPU (NVIDIA, AMD, or Intel) to prevent crashes on incompatible architectures.

- **➕ Add Any Fork from a Link**:
  - Paste any GitHub repository, GitHub release URL, Forgejo / Gitea repo, or GitHub Actions workflow link.
  - Auto-detects the latest Windows build zip and saves regex pattern matching for future daily updates.

- **📖 Built-in Wichforks Knowledge Base**:
  - Read community reports, performance tables (`PERFORMANCE.md`), project notes (`PROJECT-NOTES.md`), and game-specific guides without leaving the app.

- **⚙️ Hardware & API Settings**:
  - GPU vendor switching (AMD / NVIDIA / Intel / None).
  - Configurable fork install directory with folder picker.
  - Integrated GitHub Personal Access Token validator (showing remaining API quota out of 5,000 requests/hr).

- **📟 Real-time Console & Download Drawer**:
  - Live streaming log console showing download speeds, extraction status, and verification checks.

---

## 🚀 Quick Start

### 1. Launch with One Click
Double-click:
```cmd
ForkManagerGUI.cmd
```
*(If dependencies are not yet installed, the script will automatically install them on the first run and launch the GUI).*

### 2. Or Launch via Terminal
```bash
npm install
npm start
```

### 3. Classic Terminal Menu (Optional)
The original CLI tool is fully preserved and can still be opened at any time:
```cmd
ForkManager.cmd
```

---

## 🔑 GitHub API Token (Recommended)

Without a token, GitHub limits unauthenticated requests to **60 requests per hour per IP address**.
A free personal access token raises your limit to **5,000 requests per hour** and allows direct artifact downloads.

1. Open [GitHub Personal Access Tokens](https://github.com/settings/personal-access-tokens/new).
2. Choose **Public Repositories (read-only)**. No extra permissions needed.
3. Open the **Settings** tab in NX Fork Manager GUI, paste your token, and click **Test Token & Save**.

---

## 📁 Project Structure

```
├── ForkManagerGUI.cmd     # One-click Windows GUI launcher
├── ForkManager.cmd        # Original interactive console menu
├── fork-manager.ps1       # Core PowerShell engine
├── forks.json             # Emulator fork catalog
├── my-forks.json          # User-added custom forks
├── main.js                # Electron desktop backend
├── preload.js             # Secure IPC context bridge
├── renderer/
│   ├── index.html         # Modern Switch-themed UI
│   ├── style.css          # Neon cyber aesthetic & responsive styles
│   └── app.js             # Reactive application logic
├── data/
│   ├── state.json         # Installed versions, tags, and rollback states
│   ├── my-notes.json      # User game notes & personal overrides
│   └── wichforks/         # Synced community guide and markdown docs
└── forks/                 # Installed emulator folders
```

---

## ⚖️ Requirements & Notice

- Windows 10 (1803 or later) or Windows 11.
- Node.js (v18 or newer).
- An internet connection.
- **Your own keys and firmware**, dumped from your own Nintendo Switch console. This tool does not provide, host, or download games, keys, or copyrighted system firmware.

---

## 📜 Credits

- Core CLI logic & fork patterns by [Schroederr](https://github.com/Schroederr/nx-fork-manager).
- Emulator fork matrix & research by [riyadhHDA/wichforks](https://github.com/riyadhHDA/wichforks).
- GUI designed and developed with ❤️ for the Switch emulation community.
