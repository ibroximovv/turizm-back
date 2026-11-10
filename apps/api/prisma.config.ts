import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { defineConfig } from 'prisma/config';

// Prisma CLI does not load .env by itself. Mirror src/config/envs.ts: ENV_FILE wins,
// otherwise the nearest .env walking up from this directory. Real env vars are never overwritten.
function loadEnvFile(): void {
  if (process.env.ENV_FILE) {
    process.loadEnvFile(resolve(process.env.ENV_FILE));
    return;
  }
  let dir = __dirname;
  for (;;) {
    const candidate = join(dir, '.env');
    if (existsSync(candidate)) {
      process.loadEnvFile(candidate);
      return;
    }
    const parent = dirname(dir);
    if (parent === dir) return;
    dir = parent;
  }
}

loadEnvFile();

export default defineConfig({
  schema: join(__dirname, 'prisma/schema.prisma'),
  migrations: { path: join(__dirname, 'prisma/migrations') },
  // Read lazily so `prisma generate` (Docker build, CI) works without a database configured;
  // migrate commands report a missing DATABASE_URL themselves.
  datasource: {
    url: process.env.DATABASE_URL,
    // Needed by `migrate dev` when the DB user cannot CREATE DATABASE (an empty, dedicated database).
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
