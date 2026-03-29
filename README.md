# 🔥 Torque Logger

Enterprise-grade Discord logging and anti-nuke bot built with discord.js v14, Firebase Firestore, and Winston.

---

## 1. Project Overview

Torque Logger monitors all activity in a **source** Discord server and delivers structured logs to a completely **separate target logging server**. It includes an intelligent anti-nuke engine that detects and responds to mass destructive actions in real time.

Key properties:
- Cross-server log delivery (source → target)
- Survives partial or full server nukes
- One-command automated setup
- Firebase Firestore backend (serverless, no DB to manage)
- Modular, scalable architecture

---

## 2. Features Breakdown

### Logging Coverage
| Category     | Events Covered                                              |
|--------------|-------------------------------------------------------------|
| Moderation   | Ban, Unban, Kick, Timeout add/remove                        |
| User         | Join, Leave                                                 |
| Message      | Delete, Edit (before/after), Bulk delete                    |
| Voice        | Join, Leave, Move, Server mute/deafen                       |
| AutoMod      | Rule trigger, Blocked message                               |
| Webhook      | Create, Delete, Update                                      |
| Anti-Nuke    | All security alerts and automated responses                 |

### Anti-Nuke Detection
| Trigger              | Default Threshold | Window  |
|----------------------|-------------------|---------|
| Channel deletions    | 3                 | 10s     |
| Role deletions       | 3                 | 10s     |
| Mass bans            | 3                 | 10s     |
| Mass kicks           | 5                 | 10s     |
| Webhook spam         | 3                 | 10s     |
| Admin role creation  | 1 (immediate)     | N/A     |

### Commands
| Command  | Description                              | Permission     |
|----------|------------------------------------------|----------------|
| /setup   | Configure logging for this server        | Administrator  |
| /status  | View current bot configuration           | Manage Server  |

---

## 3. Architecture Diagram

```
Discord Source Server
        │
        │ (Events via Gateway)
        ▼
┌───────────────────────────────────────────────────┐
│                  Event Handlers                    │
│  guild/ member/ message/ voice/ automod/ webhook/ │
└───────────────────┬───────────────────────────────┘
                    │
          ┌─────────┴──────────┐
          ▼                    ▼
  ┌───────────────┐   ┌─────────────────────┐
  │ logDispatcher │   │  antiNukeService    │
  │               │   │  (in-memory tracker)|
  └───────┬───────┘   └──────────┬──────────┘
          │                      │
          │              ┌───────┴────────────┐
          │              │  firebaseService    │
          │              │  (Firestore audit)  │
          │              └────────────────────┘
          ▼
┌──────────────────────┐
│  Target Logging      │
│  Server (separate)   │
│  ├ 📋 CORE LOGS      │
│  │  ├ moderation-logs│
│  │  ├ message-logs   │
│  │  ├ voice-logs     │
│  │  └ user-logs      │
│  └ 🔒 SECURITY LOGS  │
│     ├ automod-logs   │
│     ├ webhook-logs   │
│     └ anti-nuke-logs │
└──────────────────────┘
          │
          ▼
   Firebase Firestore
  ┌──────────────────┐
  │  guildConfigs    │
  │  actionLogs      │
  └──────────────────┘
```

---

## 4. Installation Guide

### Prerequisites
- Node.js v20+
- Firebase project (free Spark plan works)
- Two Discord servers (source + target)
- Bot added to **both** servers with Administrator permission

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/yourname/torque-logger.git
cd torque-logger

# 2. Install dependencies
npm install

# 3. Set up Firebase (see Section 6 below)

# 4. Configure environment
cp .env .env.local
# Edit .env with your values

# 5. Register slash commands
npm run register

# 6. Start the bot
npm start
```

---

## 5. Environment Variables

| Variable                              | Description                                      | Default  |
|---------------------------------------|--------------------------------------------------|----------|
| `DISCORD_TOKEN`                       | Your bot token from Discord Developer Portal     | Required |
| `CLIENT_ID`                           | Your bot's application/client ID                 | Required |
| `FIREBASE_SERVICE_ACCOUNT_JSON`       | Full service account JSON as a single-line string| Optional |
| `ANTINUKE_CHANNEL_DELETE_THRESHOLD`   | Max channel deletes before trigger               | 3        |
| `ANTINUKE_ROLE_DELETE_THRESHOLD`      | Max role deletes before trigger                  | 3        |
| `ANTINUKE_BAN_THRESHOLD`              | Max bans before trigger                          | 3        |
| `ANTINUKE_KICK_THRESHOLD`             | Max kicks before trigger                         | 5        |
| `ANTINUKE_WEBHOOK_THRESHOLD`          | Max webhook creates before trigger               | 3        |
| `ANTINUKE_TIME_WINDOW_MS`             | Time window for threshold checks (ms)            | 10000    |
| `LOG_LEVEL`                           | Winston log level (error/warn/info/debug)        | info     |

> **Note:** No `MONGODB_URI` needed. Firebase uses `serviceAccount.json` or the `FIREBASE_SERVICE_ACCOUNT_JSON` env variable.

---

## 6. Firebase Setup

### Step 1 — Create a Firebase Project
1. Go to https://console.firebase.google.com
2. Click **Add project** → name it (e.g. `torque-logger`) → Continue
3. Disable Google Analytics (not needed) → **Create project**

### Step 2 — Enable Firestore
1. In the left sidebar: **Build → Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode** → select a region close to your VPS → **Enable**

### Step 3 — Download Service Account Credentials
1. Go to **Project Settings** (gear icon) → **Service accounts** tab
2. Click **Generate new private key** → **Generate key**
3. A `serviceAccount.json` file downloads automatically

### Step 4 — Place Credentials

**Option A — Local development (recommended):**
```bash
# Place the downloaded file at the project root
cp ~/Downloads/your-project-firebase-adminsdk-xxxxx.json ./serviceAccount.json
```

**Option B — Production VPS (recommended for security):**
```bash
# Paste the entire JSON content as a single line in your .env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
```

> ⚠️ **SECURITY WARNING:** `serviceAccount.json` is listed in `.gitignore`. **Never commit it to version control.** It grants full admin access to your Firebase project.

### Step 5 — Firestore Security Rules
In the Firebase Console → Firestore → **Rules**, set:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Bot uses Admin SDK — these rules apply to client-side access only
    // Block all client access since we only use server-side Admin SDK
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### Firestore Collections Created Automatically

| Collection     | Document ID      | Purpose                          |
|----------------|------------------|----------------------------------|
| `guildConfigs` | `sourceGuildId`  | Bot config per server            |
| `actionLogs`   | Auto-generated   | Anti-nuke audit trail (24h TTL)  |

---

## 7. Running Locally

```bash
# Development (auto-restart on file changes)
npm run dev

# Production
npm start
```

Logs are written to:
- `logs/combined.log` — all logs
- `logs/error.log` — errors only
- Console — colorized output

---

## 8. Production Deployment (VPS)

### Using PM2 (Recommended)
```bash
npm install -g pm2

# Start with PM2
pm2 start src/index.js --name torque-logger

# Auto-restart on reboot
pm2 startup
pm2 save

# Monitor
pm2 logs torque-logger
pm2 monit
```

### Using systemd
```ini
[Unit]
Description=Torque Logger Discord Bot
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/torque-logger
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=10
EnvironmentFile=/home/ubuntu/torque-logger/.env

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable torque-logger
sudo systemctl start torque-logger
```

> For production VPS, use `FIREBASE_SERVICE_ACCOUNT_JSON` in your `.env` instead of placing `serviceAccount.json` on disk.

---

## 9. Permissions Required

### Source Server
- `View Audit Log` — Required for executor detection
- `View Channels` — Required to receive events        
- `Ban Members` — Required for anti-nuke ban response
- `Kick Members` — Required for anti-nuke kick response
- `Manage Roles` — Required for anti-nuke role strip response

**Recommended: Administrator** (simplest, most reliable)

### Target Logging Server
- `Administrator` — Required to create categories and channels during setup

---

## 10. Anti-Nuke Logic Explained

### Detection Flow
```
Event fires (e.g., channelDelete)
    │
    ▼
Fetch audit log executor (500ms delay for propagation)
    │
    ▼
Skip if: executor is bot, executor is guild owner, executor is whitelisted
    │
    ▼
trackAction(guildId, userId, actionType)  ← in-memory sliding window
    │
    ├── logAction() → Firestore (fire-and-forget audit trail)
    │
    ▼
count >= threshold?
  YES → executeAntiNukeResponse()
  NO  → continue normally
```

### Response Actions
Configured via `antiNukeSettings.action` in Firestore `guildConfigs`:

| Action       | Behavior                                                    |
|--------------|-------------------------------------------------------------|
| `ban`        | Bans the executor from the source server (default)          |
| `kick`       | Kicks the executor from the source server                   |
| `strip_roles`| Removes all dangerous permission roles from the executor    |

### Whitelisting Users
Update the `antiNukeSettings.whitelist` array in Firestore directly, or use the Firebase Console:
```
Collection: guildConfigs
Document:   YOUR_SOURCE_GUILD_ID
Field:      antiNukeSettings.whitelist → add USER_ID string to array
```

### Changing Anti-Nuke Action
In Firestore Console → `guildConfigs` → your guild document:
```
antiNukeSettings.action = "ban" | "kick" | "strip_roles"
```

### Action Log TTL
`actionLogs` documents are automatically purged every 6 hours by the bot (documents older than 24 hours are batch-deleted). No Firestore TTL extension required.

---

## 11. Troubleshooting Guide

### Bot not logging events
1. Verify `/status` shows correct channel IDs
2. Ensure bot is in **both** source and target servers
3. Check bot has `View Audit Log` in source server
4. Check bot can send messages in target log channels
5. Check `logs/error.log` for dispatch errors

### Setup command fails
- `Bot is not in target server` → Add bot to target server first
- `Bot needs Administrator permission` → Grant admin in target server
- `Invalid server ID` → Must be a valid 17-20 digit Discord snowflake

### Firebase initialization fails
- `serviceAccount.json not found` → Place the file at project root or set `FIREBASE_SERVICE_ACCOUNT_JSON`
- `Error: invalid_grant` → Your service account key may be revoked — generate a new one
- `PERMISSION_DENIED` → Check Firestore security rules allow Admin SDK access (they always do — rules only affect client SDK)

### Anti-nuke not triggering
1. Check `antiNukeSettings.enabled` is `true` in Firestore
2. Verify the executor is not in the whitelist array
3. Verify the executor is not the guild owner
4. Check thresholds — default is 3 actions in 10 seconds
5. Ensure bot has `Ban Members` / `Manage Roles` permissions

### Commands not appearing in Discord
```bash
npm run register
# Wait up to 1 hour for global propagation
```

### High memory usage
- The in-memory action tracker auto-cleans every 2 minutes
- The guild config cache has a 5-minute TTL
- Rate limiter buckets auto-clean every 5 minutes
- All are bounded and will not grow unboundedly

---

## License

MIT — Use freely, contribute back.
