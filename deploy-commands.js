import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const commands = [];
const commandsPath = join(__dirname, 'commands');
const categories = readdirSync(commandsPath);

for (const category of categories) {
  const files = readdirSync(join(commandsPath, category)).filter(f => f.endsWith('.js'));
  for (const file of files) {
    try {
      const mod = await import(`./commands/${category}/${file}`);
      if (mod.data) commands.push(mod.data.toJSON());
    } catch (e) {
      console.warn(`⚠️  Skipped ${category}/${file}: ${e.message}`);
    }
  }
}

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

console.log(`📦 Deploying ${commands.length} slash commands...`);

try {
  let data;
  if (process.env.GUILD_ID) {
    data = await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );
    console.log(`✅ Deployed ${data.length} commands to guild ${process.env.GUILD_ID} (instant)`);
  } else {
    data = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands },
    );
    console.log(`✅ Deployed ${data.length} commands globally (up to 1hr propagation)`);
  }
} catch (e) {
  console.error('❌ Deploy failed:', e);
  process.exit(1);
}
