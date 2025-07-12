"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissionsService = exports.PermissionsService = void 0;
const nats_1 = require("nats");
const logger_1 = require("../logger");
const postgres_1 = require("../db/postgres");
const types_1 = require("../types");
const jc = (0, nats_1.JSONCodec)();
class PermissionsService {
    async init() {
        try {
            this.nc = await (0, nats_1.connect)({ servers: process.env.NATS_URL || 'nats://localhost:4222' });
            this.kv = await this.nc.jetstream().views.kv('permissions_cache');
            // Пытаемся инициализировать PostgreSQL, но не падаем если не удалось
            try {
                await postgres_1.postgresClient.init();
                logger_1.logger.info({ message: 'PostgreSQL initialized successfully' });
            }
            catch (dbError) {
                logger_1.logger.warn({ message: 'PostgreSQL not available, using in-memory storage', error: dbError });
            }
            // Подписка на темы
            this.nc.subscribe('permissions.grant', { callback: this.handleGrant.bind(this) });
            this.nc.subscribe('permissions.revoke', { callback: this.handleRevoke.bind(this) });
            this.nc.subscribe('permissions.check', { callback: this.handleCheck.bind(this) });
            this.nc.subscribe('permissions.list', { callback: this.handleList.bind(this) });
            logger_1.logger.info({ message: 'Permissions service initialized' });
        }
        catch (error) {
            logger_1.logger.error({ message: 'Failed to initialize permissions service', error });
            throw error;
        }
    }
    async handleGrant(_err, msg) {
        try {
            const request = jc.decode(msg.data);
            if (!request.apiKey || !request.module || !request.action) {
                return msg.respond(jc.encode({
                    error: { code: types_1.ErrorCode.INVALID_PAYLOAD, message: 'Invalid request payload' }
                }));
            }
            await postgres_1.postgresClient.grant(request.apiKey, request.module, request.action);
            await this.updateCache(request.apiKey);
            logger_1.logger.info({ message: 'Permission granted', request });
            msg.respond(jc.encode({ status: 'ok' }));
        }
        catch (error) {
            logger_1.logger.error({ message: 'Error in grant', error });
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            msg.respond(jc.encode({
                error: { code: types_1.ErrorCode.DB_ERROR, message: errorMessage }
            }));
        }
    }
    async handleRevoke(_err, msg) {
        try {
            const request = jc.decode(msg.data);
            if (!request.apiKey || !request.module || !request.action) {
                return msg.respond(jc.encode({
                    error: { code: types_1.ErrorCode.INVALID_PAYLOAD, message: 'Invalid request payload' }
                }));
            }
            await postgres_1.postgresClient.revoke(request.apiKey, request.module, request.action);
            await this.updateCache(request.apiKey);
            logger_1.logger.info({ message: 'Permission revoked', request });
            msg.respond(jc.encode({ status: 'ok' }));
        }
        catch (error) {
            logger_1.logger.error({ message: 'Error in revoke', error });
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            msg.respond(jc.encode({
                error: { code: types_1.ErrorCode.DB_ERROR, message: errorMessage }
            }));
        }
    }
    async handleCheck(_err, msg) {
        try {
            const request = jc.decode(msg.data);
            if (!request.apiKey || !request.module || !request.action) {
                return msg.respond(jc.encode({
                    error: { code: types_1.ErrorCode.INVALID_PAYLOAD, message: 'Invalid request payload' }
                }));
            }
            let allowed = false;
            const cacheKey = request.apiKey;
            const cached = await this.kv.get(cacheKey);
            if (cached) {
                const permissions = jc.decode(cached.value);
                allowed = permissions.some(p => p.module === request.module && p.action === request.action);
            }
            else {
                allowed = await postgres_1.postgresClient.check(request.apiKey, request.module, request.action);
                await this.updateCache(request.apiKey);
            }
            logger_1.logger.info({ message: 'Permission checked', request, allowed });
            msg.respond(jc.encode({ allowed }));
        }
        catch (error) {
            logger_1.logger.error({ message: 'Error in check', error });
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            msg.respond(jc.encode({
                error: { code: types_1.ErrorCode.DB_ERROR, message: errorMessage }
            }));
        }
    }
    async handleList(_err, msg) {
        try {
            const request = jc.decode(msg.data);
            if (!request.apiKey) {
                return msg.respond(jc.encode({
                    error: { code: types_1.ErrorCode.INVALID_PAYLOAD, message: 'Invalid request payload' }
                }));
            }
            const cacheKey = request.apiKey;
            const cached = await this.kv.get(cacheKey);
            let permissions;
            if (cached) {
                permissions = jc.decode(cached.value);
            }
            else {
                permissions = await postgres_1.postgresClient.list(request.apiKey);
                await this.kv.put(cacheKey, jc.encode(permissions));
            }
            logger_1.logger.info({ message: 'Permissions listed', request, permissions });
            msg.respond(jc.encode({ permissions }));
        }
        catch (error) {
            logger_1.logger.error({ message: 'Error in list', error });
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            msg.respond(jc.encode({
                error: { code: types_1.ErrorCode.DB_ERROR, message: errorMessage }
            }));
        }
    }
    async updateCache(apiKey) {
        try {
            const permissions = await postgres_1.postgresClient.list(apiKey);
            await this.kv.put(apiKey, jc.encode(permissions));
            logger_1.logger.info({ message: 'Cache updated', apiKey });
        }
        catch (error) {
            logger_1.logger.error({ message: 'Error updating cache', error });
        }
    }
    async shutdown() {
        try {
            await this.nc.drain();
            await this.nc.close();
            logger_1.logger.info({ message: 'Permissions service shutdown complete' });
        }
        catch (error) {
            logger_1.logger.error({ message: 'Error during shutdown', error });
        }
    }
}
exports.PermissionsService = PermissionsService;
exports.permissionsService = new PermissionsService();
