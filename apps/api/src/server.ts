import { buildApp } from "./app";
import { env } from "./env";

const app = buildApp();

async function main() {
  try {
    await app.listen({ host: env.API_HOST, port: env.API_PORT });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
}

void main();
