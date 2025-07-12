import { connect, JSONCodec, NatsConnection, Msg } from 'nats';
import { logger } from '../logger';
import { postgresClient } from '../db/postgres';
import {
  GrantRequest, RevokeRequest, CheckRequest, ListRequest,
  GrantResponse, RevokeResponse, CheckResponse, ListResponse,
  ErrorResponse, ErrorCode, Permission
} from '../types';

const jc = JSONCodec();

export class PermissionsService {
  private nc!: NatsConnection;
  private kv: any;

  async init() {
    try {
      this.nc = await connect({ servers: process.env.NATS_URL || 'nats://localhost:4222' });
      this.kv = await this.nc.jetstream().views.kv('permissions_cache');
      
      // Пытаемся инициализировать PostgreSQL, но не падаем если не удалось
      try {
        await postgresClient.init();
        logger.info({ message: 'PostgreSQL initialized successfully' });
      } catch (dbError) {
        logger.warn({ message: 'PostgreSQL not available, using in-memory storage', error: dbError });
      }

      // Подписка на темы
      this.nc.subscribe('permissions.grant', { callback: this.handleGrant.bind(this) });
      this.nc.subscribe('permissions.revoke', { callback: this.handleRevoke.bind(this) });
      this.nc.subscribe('permissions.check', { callback: this.handleCheck.bind(this) });
      this.nc.subscribe('permissions.list', { callback: this.handleList.bind(this) });

      logger.info({ message: 'Permissions service initialized' });
    } catch (error) {
      logger.error({ message: 'Failed to initialize permissions service', error });
      throw error;
    }
  }

  private async handleGrant(_err: any, msg: Msg) {
    try {
      const request = jc.decode(msg.data) as GrantRequest;
      if (!request.apiKey || !request.module || !request.action) {
        return msg.respond(jc.encode({
          error: { code: ErrorCode.INVALID_PAYLOAD, message: 'Invalid request payload' }
        }));
      }

      await postgresClient.grant(request.apiKey, request.module, request.action);
      await this.updateCache(request.apiKey);
      logger.info({ message: 'Permission granted', request });

      msg.respond(jc.encode({ status: 'ok' }));
    } catch (error) {
      logger.error({ message: 'Error in grant', error });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      msg.respond(jc.encode({
        error: { code: ErrorCode.DB_ERROR, message: errorMessage }
      }));
    }
  }

  private async handleRevoke(_err: any, msg: Msg) {
    try {
      const request = jc.decode(msg.data) as RevokeRequest;
      if (!request.apiKey || !request.module || !request.action) {
        return msg.respond(jc.encode({
          error: { code: ErrorCode.INVALID_PAYLOAD, message: 'Invalid request payload' }
        }));
      }

      await postgresClient.revoke(request.apiKey, request.module, request.action);
      await this.updateCache(request.apiKey);
      logger.info({ message: 'Permission revoked', request });

      msg.respond(jc.encode({ status: 'ok' }));
    } catch (error) {
      logger.error({ message: 'Error in revoke', error });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      msg.respond(jc.encode({
        error: { code: ErrorCode.DB_ERROR, message: errorMessage }
      }));
    }
  }

  private async handleCheck(_err: any, msg: Msg) {
    try {
      const request = jc.decode(msg.data) as CheckRequest;
      if (!request.apiKey || !request.module || !request.action) {
        return msg.respond(jc.encode({
          error: { code: ErrorCode.INVALID_PAYLOAD, message: 'Invalid request payload' }
        }));
      }

      let allowed = false;
      const cacheKey = request.apiKey;
      const cached = await this.kv.get(cacheKey);

      if (cached) {
        const permissions = jc.decode(cached.value) as Permission[];
        allowed = permissions.some(
          p => p.module === request.module && p.action === request.action
        );
      } else {
        allowed = await postgresClient.check(request.apiKey, request.module, request.action);
        await this.updateCache(request.apiKey);
      }

      logger.info({ message: 'Permission checked', request, allowed });
      msg.respond(jc.encode({ allowed }));
    } catch (error) {
      logger.error({ message: 'Error in check', error });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      msg.respond(jc.encode({
        error: { code: ErrorCode.DB_ERROR, message: errorMessage }
      }));
    }
  }

  private async handleList(_err: any, msg: Msg) {
    try {
      const request = jc.decode(msg.data) as ListRequest;
      if (!request.apiKey) {
        return msg.respond(jc.encode({
          error: { code: ErrorCode.INVALID_PAYLOAD, message: 'Invalid request payload' }
        }));
      }

      const cacheKey = request.apiKey;
      const cached = await this.kv.get(cacheKey);

      let permissions: Permission[];
      if (cached) {
        permissions = jc.decode(cached.value) as Permission[];
      } else {
        permissions = await postgresClient.list(request.apiKey);
        await this.kv.put(cacheKey, jc.encode(permissions));
      }

      logger.info({ message: 'Permissions listed', request, permissions });
      msg.respond(jc.encode({ permissions }));
    } catch (error) {
      logger.error({ message: 'Error in list', error });
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      msg.respond(jc.encode({
        error: { code: ErrorCode.DB_ERROR, message: errorMessage }
      }));
    }
  }

  private async updateCache(apiKey: string) {
    try {
      const permissions = await postgresClient.list(apiKey);
      await this.kv.put(apiKey, jc.encode(permissions));
      logger.info({ message: 'Cache updated', apiKey });
    } catch (error) {
      logger.error({ message: 'Error updating cache', error });
    }
  }

  async shutdown() {
    try {
      await this.nc.drain();
      await this.nc.close();
      logger.info({ message: 'Permissions service shutdown complete' });
    } catch (error) {
      logger.error({ message: 'Error during shutdown', error });
    }
  }
}

export const permissionsService = new PermissionsService();