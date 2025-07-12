"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const permissions_1 = require("./services/permissions");
const logger_1 = require("./logger");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function start() {
    try {
        await permissions_1.permissionsService.init();
        logger_1.logger.info({ message: 'Service started' });
    }
    catch (error) {
        logger_1.logger.error({ message: 'Failed to start service', error });
        process.exit(1);
    }
}
// Graceful shutdown
process.on('SIGINT', async () => {
    logger_1.logger.info({ message: 'Received SIGINT, shutting down gracefully' });
    await permissions_1.permissionsService.shutdown();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    logger_1.logger.info({ message: 'Received SIGTERM, shutting down gracefully' });
    await permissions_1.permissionsService.shutdown();
    process.exit(0);
});
start();
