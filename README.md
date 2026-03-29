# TORQUE™ — Enterprise-Grade Logging & Security

![BANNER](https://img.shields.io/badge/TORQUE-LOGGER-BLUE?style=for-the-badge&labelColor=black)
![VERSION](https://img.shields.io/badge/v2.0.0-ONLINE-green?style=for-the-badge)
![LICENSE](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

**TORQUE™** is a high-performance, enterprise-grade Discord logging and security engine. It transforms raw server events into a sophisticated **Component V2** interactive experience, providing modular layouts, real-time activity tracking, and hardened anti-nuke protection.

---

## 🛠️ Tech Stack & Libraries

![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Discord.js](https://img.shields.io/badge/Discord.js-5865F2?style=for-the-badge&logo=discord&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Winston](https://img.shields.io/badge/Winston-333333?style=for-the-badge&logo=winston&logoColor=white)
![Dotenv](https://img.shields.io/badge/Dotenv-ECD53F?style=for-the-badge&logo=dotenv&logoColor=black)

---

## ✨ Core Features (v2.0.0)

*   **⚡ Component V2 Architecture**: Modular message layouts using the `IS_COMPONENTS_V2` flag (1 << 15).
*   **📊 Premium Activity Tracking**:
    *   **SectionBuilder**: Visual grouping for profile, moderation, and message events.
    *   **SessionBuilder**: Real-time duration tracking for voice, status, and activity sessions.
*   **🛡️ Enterprise Security**:
    *   **Anti-Nuke Engine**: Multi-threshold detection for ban/kick/delete spam with automatic mitigation.
    *   **Audit Log Bus**: Zero-polling, real-time listener for over 20 administrative actions.
*   **⛓️ Resilient Dispatcher**: Hardened with exponential backoff (3s → 27s) and V2-to-V1 semantic fallback ensures logs are never lost.
*   **🔘 Interactive Moderator Response**: Every log includes context-aware buttons (Ban User, View Audit Log, Jump to Message, etc.).

---

## 🚀 Getting Started

### 1. Prerequisites
*   **Node.js v20+**
*   **Firebase Project** (Google Cloud service account)
*   **Discord Bot Token** with `GuildPresences`, `GuildMembers`, and `MessageContent` intents.

### 2. Installation
```powershell
git clone https://github.com/intruder0007/Torque-Logger-.git
cd Torque-Logger-
npm install
```

### 3. Configuration
Create a `.env` file in the root directory:
```env
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id
DEV_GUILD_ID=your_setup_guild_id
# Firebase Config (Copy from project settings)
FIREBASE_PROJECT_ID=torque-logger
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

### 4. Running the Bot
```bash
npm run register  # Register slash commands
npm start         # Start the engine
```

---

## 📜 License
This project is licensed under the **MIT License**. Created with ❤️ by **Intruder0007**.
