import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadEvents(client) {
  const eventsPath = join(__dirname, '..', 'events');
  const files = readdirSync(eventsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const event = await import(`../events/${file}`);
    const name = event.name ?? file.replace('.js', '');
    if (event.once) {
      client.once(name, (...args) => event.execute(...args, client));
    } else {
      client.on(name, (...args) => event.execute(...args, client));
    }
  }

  console.log(`Loaded ${files.length} events`);
}
