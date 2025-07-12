"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.natsClient = exports.NatsClient = void 0;
const nats_1 = require("nats");
const jc = (0, nats_1.JSONCodec)();
class NatsClient {
    async connect(url) {
        try {
            this.nc = await (0, nats_1.connect)({ servers: url });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to connect to NATS: ${errorMessage}`);
        }
    }
    async grant(request) {
        const response = await this.nc.request("permissions.grant", jc.encode(request));
        return jc.decode(response.data);
    }
    async revoke(request) {
        const response = await this.nc.request("permissions.revoke", jc.encode(request));
        return jc.decode(response.data);
    }
    async check(request) {
        const response = await this.nc.request("permissions.check", jc.encode(request));
        return jc.decode(response.data);
    }
    async list(request) {
        const response = await this.nc.request("permissions.list", jc.encode(request));
        return jc.decode(response.data);
    }
    async close() {
        if (this.nc) {
            await this.nc.drain();
            await this.nc.close();
        }
    }
}
exports.NatsClient = NatsClient;
exports.natsClient = new NatsClient();
