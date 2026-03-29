import { readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = __dirname;

async function checkDir(dir) {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      await checkDir(fullPath);
      continue;
    }
    if (!entry.endsWith('.js')) continue;

    try {
      await import(`file://${fullPath}`);
      console.log(`✅ OK: ${entry}`);
    } catch (err) {
      console.error(`❌ FAIL: ${entry}`);
      console.error(err);
      process.exit(1);
    }
  }
}

async function run() {
  console.log('Checking commands...');
  await checkDir(join(root, 'commands'));
  console.log('Checking events...');
  await checkDir(join(root, 'events'));
  console.log('Done.');
}

run();
