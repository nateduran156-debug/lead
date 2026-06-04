# 🤖 Discord Bot — 200+ Commands

A feature-rich Discord bot with **200+ slash AND prefix commands** covering moderation, Roblox group management, anti-nuke, giveaways, tickets, and much more.

---

## 🚀 Quick Start

### 1. Clone & Install
```bash
git clone <your-repo>
cd discord-bot
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Fill in your values
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | ✅ | Your bot token from Discord Developer Portal |
| `CLIENT_ID` | ✅ | Your application's Client ID |
| `GUILD_ID` | ❌ | Set for instant command deployment (dev only) |
| `ROBLOX_COOKIE` | ❌ | `.ROBLOSECURITY` cookie for group management |
| `WEATHER_API_KEY` | ❌ | OpenWeatherMap API key for `/weather` |
| `DB_PATH` | ❌ | SQLite path (default: `./data/bot.db`) |

### 3. Deploy Slash Commands
```bash
npm run deploy
```

### 4. Start the Bot
```bash
npm start        # Production
npm run dev      # Development (auto-restart)
```

---

## 📋 Command Categories (200+ Total)

### 🔨 Moderation (34 commands)
| Command | Description |
|---------|-------------|
| `/ban` | Ban a user (permanent or temp) |
| `/kick` | Kick a member |
| `/unban` | Unban a user by ID |
| `/timeout` | Timeout a member |
| `/untimeout` | Remove timeout |
| `/tempban` | Temporarily ban with auto-unban |
| `/warn` | Warn a member |
| `/warnings` | View warnings (paginated) |
| `/clearwarns` | Clear warnings |
| `/history` | Full mod history for a user |
| `/note` | Add/view/clear mod notes |
| `/purge` | Bulk delete messages (filter: bots/humans/links/images) |
| `/lock` / `/unlock` | Lock/unlock channels |
| `/lockall` / `/unlockall` | Lock/unlock all channels |
| `/slowmode` | Set channel slowmode |
| `/nick` | Change nickname |
| `/addrole` / `/removerole` | Add/remove roles |
| `/roleall` / `/unroleall` | Mass role operations |
| `/createrole` / `/deleterole` | Create/delete roles |
| `/createchannel` / `/deletechannel` | Create/delete channels |
| `/clonechannel` | Clone a channel |
| `/nuke` | Nuke channel (clone+delete) |
| `/setperms` | Fine-grained permission control |
| `/deafen` / `/undeafen` | Voice deafen |
| `/move` | Move to voice channel |
| `/softban` | Softban (ban+unban to delete messages) |
| `/massban` | Ban multiple users by ID |

### 🛡️ Anti-Nuke System
| Command | Description |
|---------|-------------|
| `/antinuke enable/disable` | Toggle protection |
| `/antinuke setup` | Set log channel + punishment |
| `/antinuke status` | View current config |
| `/antinuke whitelist` | Add/remove trusted users |
| `/antinuke threshold` | Set action limits (ban/kick/channel_delete/etc) |
| `/antinuke reset` | Reset all settings |

**Detects:** Mass bans, mass kicks, channel deletions, channel creates, role deletes, webhook creation.

### 🎮 Roblox (20 commands + group tools)
| Command | Description |
|---------|-------------|
| `/roblox user` | Full user profile |
| `/roblox avatar` | Full body avatar |
| `/roblox headshot` | Headshot image |
| `/roblox badges` | Badge list (paginated) |
| `/roblox games` | User's games |
| `/roblox presence` | Online status |
| `/roblox history` | Username history |
| `/roblox search` | Search users |
| `/verify` | Link Roblox account |
| `/unverify` | Unlink account |
| `/linked` | Check who someone is verified as |
| `/groupcheck` | All groups a user is in (paginated) |
| `/groupinfo` | Group details + role list |
| `/groupwall` | View group wall posts |
| `/setgroup` | Set default group for server |
| `/game` | Look up any Roblox game |
| `/presence` | Check online presence + game buttons |
| `/friends` | User's friend list |
| `/badges` | View badges (paginated) |
| `/games` | View public games |
| `/outfits` | View outfits |
| `/rap` | Limited items / RAP |
| `/catalog` | Look up catalog items |
| `/rank promote/demote/set/exile/check` | Full group rank management (requires cookie) |
| `/shout` | Post group shout |

### ⭐ Rank Points (6 subcommands)
`/rankpoints give|take|set|check|reset|top` — Per-server point system with leaderboard.

### ⚔️ Raid Points (7 subcommands)
`/raidpoints add|remove|check|top|reset|season|transfer` — Season-based raid tracking with transfers.

### 💜 Vanity Tracker (5 subcommands)
`/vanity track|untrack|list|logs|status` — Monitor Discord vanity URLs and get notified when they become available.

### 🎯 Roblox Username Sniper (5 subcommands)
`/sniper add|remove|list|clear|status` — Real-time 30-second polling for player online status. Alerts include **View Profile** + **Join Game** buttons.

### 📊 Server Info (14 commands)
`/serverinfo`, `/userinfo`, `/avatar`, `/banner`, `/roleinfo`, `/channelinfo`, `/membercount`, `/boosters`, `/roles`, `/invites`, `/emoji`, `/bots`, `/humans`, `/channels`, `/servericon`, `/serverbanner`

### 🎉 Fun & Utility (24 commands)
`/poll`, `/8ball`, `/coinflip`, `/dice`, `/say`, `/announce`, `/afk`, `/remind`, `/ship`, `/embed`, `/math`, `/random`, `/password`, `/timestamp`, `/color`, `/joke`, `/fact`, `/roast`, `/compliment`, `/meme`, `/ascii`, `/qrcode`, `/hash`

### 🎁 Giveaways (7 subcommands)
`/giveaway start|end|reroll|list|delete|pause|resume`

### 🎫 Tickets (9 subcommands)
`/ticket setup|panel|create|close|add|remove|rename|message|limit`

### 👋 Welcome System (8 subcommands)
`/welcome setup|enable|disable|test|status|dm|embed|roles`

Placeholders: `{user}`, `{username}`, `{server}`, `{membercount}`

### 📋 Logging (6 subcommands)
`/logs setup|modlogs|disable|test|status|view`

### 🤖 AutoMod (11 subcommands)
`/automod setup|status|filter|spam|invites|links|caps|mentions|disable|whitelist|phishing`

### ⚙️ Misc (20 commands)
`/help`, `/ping`, `/botinfo`, `/prefix`, `/stats`, `/uptime`, `/invite`, `/support`, `/settings`, `/status`, `/feedback`, `/changelog`, `/quote`, `/base64`, `/vote`, `/define`, `/translate`, `/weather`, `/servericon`, `/serverbanner`

---

## 🗃️ Database Schema (SQLite, WAL mode)
- `guilds` — Per-server config (prefix, channels, settings)
- `users` / `global_users` — Roblox verification
- `warnings` — Moderation warnings
- `rank_points` / `raid_points` — Points systems
- `vanity_tracks` / `vanity_logs` — Vanity tracking
- `sniper_targets` — Username sniper targets
- `tickets` — Ticket records
- `giveaways` — Giveaway state + entries
- `reminders` — User reminders
- `afk_users` — AFK records
- `antinuke_actions` — Rate-limit tracking for anti-nuke

---

## 🚂 Railway Deployment

1. Push to GitHub
2. Connect to Railway → New Project → Deploy from GitHub
3. Add environment variables in Railway dashboard
4. Railway automatically runs `npm start`
5. Run `npm run deploy` once to register slash commands

---

## 📝 Prefix Commands

Every slash command has an equivalent prefix command (`!` by default, configurable per-server):

```
!ban @user reason
!kick @user
!warn @user reason
!rankpoints give @user 100
!roblox user username
!sniper add username #channel
!giveaway start prize 1h 3
... and 200+ more
```

Change prefix: `/prefix newprefix` or `!prefix newprefix`

---

## 🔧 Architecture

- **discord.js v14** — Gateway intents including Presences, Members, MessageContent
- **noblox.js** — Roblox API wrapper for authenticated group operations
- **better-sqlite3** — Synchronous SQLite (WAL mode for performance)
- **Pagination** — ◄ ► buttons on all list commands (60s timeout)
- **Loading states** — Deferred replies with loading embeds
- **C2-style embeds** — Consistent color scheme across all responses
- **Sniper loop** — 30s polling interval using Presence API
- **Giveaway loop** — 15s check for expired giveaways
- **Reminder loop** — 30s check for pending reminders
- **Anti-nuke** — Event-based with 10-second rolling windows
