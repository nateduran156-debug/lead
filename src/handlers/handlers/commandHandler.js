import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadCommands(client) {
  client.commands = new Map();
  client.aliases = new Map();
  client.prefixCommands = new Map();
  client.slashCommands = [];

  const commandsPath = join(__dirname, '..', 'commands');
  const categories = readdirSync(commandsPath);

  for (const category of categories) {
    const files = readdirSync(join(commandsPath, category)).filter(f => f.endsWith('.js'));
    for (const file of files) {
      try {
        const mod = await import(`../commands/${category}/${file}`);
        if (mod.data) {
          client.commands.set(mod.data.name, mod);
          client.slashCommands.push(mod.data.toJSON());
          if (mod.aliases) {
            for (const alias of mod.aliases) client.aliases.set(alias, mod.data.name);
          }
        }
      } catch (e) {
        console.error(`Failed to load command ${file}:`, e.message);
      }
    }
  }

  console.log(`Loaded ${client.commands.size} commands`);
}
