/**
 * CloudOps OS — MCP Server
 *
 * Main entry point for the CloudOps Model Context Protocol server.
 * Uses the @McpApp decorator pattern for clean, NestJS-style architecture.
 *
 * Transport Configuration:
 * - Development (NODE_ENV=development): STDIO only
 * - Production (NODE_ENV=production): Dual transport (STDIO + HTTP SSE)
 */

import 'dotenv/config';
import { McpApplicationFactory } from '@nitrostack/core';
import { AppModule } from './app.module.js';

/**
 * Bootstrap the application and wire up graceful shutdown handlers.
 */
async function bootstrap() {
  const server = await McpApplicationFactory.create(AppModule);
  await server.start();

  // Graceful shutdown — critical for containerised deployments
  const shutdown = async (signal: string) => {
    console.log(`\n⚠️  Received ${signal}, shutting down gracefully…`);
    try {
      await server.stop();
      console.log('✅ Server stopped cleanly.');
      process.exit(0);
    } catch (err) {
      console.error('❌ Error during shutdown:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});
