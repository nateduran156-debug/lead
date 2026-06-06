# Lead Bot

A professional Discord bot with vanity watching, Roblox sniping, tag management, verification, and whitelist controls.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env` and fill in the values:

```
DISCORD_TOKEN=       # Your bot token (Discord Developer Portal)
CLIENT_ID=           # Your application/client ID
GUILD_ID=            # (Optional) Leave blank to deploy commands globally
ROBLOX_COOKIE=       # .ROBLOSECURITY cookie for group rank actions
```

### 3. Deploy slash commands

```bash
node deploy-commands.js
```

### 4. Start the bot

```bash
node index.js
```

---

## Required Bot Permissions

- `Manage Channels`
- `Manage Roles`
- `View Channels`
- `Send Messages`
- `Read Message History`
- `Manage Messages`
- `Members Intent` (enabled in Developer Portal)
- `Presence Intent` (enabled in Developer Portal)
- `Message Content Intent` (enabled in Developer Portal)

---

## Required Discord Developer Portal Settings

In your application at https://discord.com/developers/applications:

- Enable **Server Members Intent**
- Enable **Presence Intent**
- Enable **Message Content Intent**

---

## Commands

### Whitelist — `/whitelist`
Controls who can use the bot. Requires `Administrator`.

| Subcommand | Description |
|---|---|
| `add <user> [category]` | Whitelist a user (default: entire bot) |
| `remove <user> [category]` | Remove a user from whitelist |
| `role <role> <category>` | Whitelist a role for a category |
| `removerole <role> [category]` | Remove a role from whitelist |
| `list` | Show the current whitelist |

**Categories:** `all`, `vanity`, `sniper`, `tags`, `tickets`, `verify`

---

### Vanity Watcher — `/vanity`
Monitors Discord statuses for registered opp vanities.

| Subcommand | Description |
|---|---|
| `add <vanity>` | Register an opp vanity to watch |
| `remove <vanity>` | Remove a vanity from the watch list |
| `list` | List all opp vanities |
| `setchannel <channel>` | Set the notification channel |
| `pingrole <role>` | Set a role to ping on alerts |
| `toggle` | Toggle pinging on/off |

---

### Roblox Sniper — `/sniper`
Alerts when a tracked Roblox user joins a game. Shows a JOIN button (server link) and Copy ID button.

| Subcommand | Description |
|---|---|
| `add <roblox_id> <server_link> [discord_user]` | Track a Roblox user |
| `remove <roblox_id>` | Stop tracking a user |
| `list` | List all tracked users |
| `setchannel <channel>` | Set the alert channel |

Polls every 30 seconds.

---

### Roblox Tags — `/tag` & `/striptag`

```
/tag <roblox_user> <tag>
```

| Tag | Group |
|---|---|
| `164` | `948951510` |
| `KITTY TAG` | `575770529` |
| `lurk tag` | `575770529` |
| `AMOR TAG` | `575770529` |
| `YinYang` | `575770529` |

```
/striptag <roblox_user|@discord|everyone>
```

Strips all tags from the target. Use `everyone` to strip all tagged users in the server.

---

### Verification — `/verify`
Links a Discord user to their Roblox account via profile description code.

---

### Ticket Panels — `/setupticket`
Creates a ticket panel in the current channel.

```
/setupticket <type> [log_channel] [category]
```

Types: `verification`, `tag`

---

## Notes

- The bot uses SQLite (`data.db` in the project root) — no external database required.
- The `ROBLOX_COOKIE` is required for `/tag`, `/striptag`, and the sniper join detection. Obtain your `.ROBLOSECURITY` cookie from your Roblox session.
- The sniper JOIN button links to the **Discord server**, not the Roblox game.
