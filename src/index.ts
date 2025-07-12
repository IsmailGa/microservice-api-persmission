import { permissionsService } from './services/permissions';
import { logger } from './logger';
import dotenv from 'dotenv';

dotenv.config();

async function start() {
  try {
    await permissionsService.init();
    logger.info({ message: 'Service started' });
  } catch (error) {
    logger.error({ message: 'Failed to start service', error });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info({ message: 'Received SIGINT, shutting down gracefully' });
  await permissionsService.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info({ message: 'Received SIGTERM, shutting down gracefully' });
  await permissionsService.shutdown();
  process.exit(0);
});

start();