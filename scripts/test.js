"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nats_1 = require("../src/lib/nats");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
async function test() {
    await nats_1.natsClient.connect(process.env.NATS_URL);
    // Тест grant
    const grantResult = await nats_1.natsClient.grant({
        apiKey: 'abcd-1234',
        module: 'trades',
        action: 'create',
    });
    console.log('Grant:', grantResult);
    // Тест check
    const checkResult = await nats_1.natsClient.check({
        apiKey: 'abcd-1234',
        module: 'trades',
        action: 'create',
    });
    console.log('Check:', checkResult);
    // Тест list
    const listResult = await nats_1.natsClient.list({ apiKey: 'abcd-1234' });
    console.log('List:', listResult);
    // Тест revoke
    const revokeResult = await nats_1.natsClient.revoke({
        apiKey: 'abcd-1234',
        module: 'trades',
        action: 'create',
    });
    console.log('Revoke:', revokeResult);
}
test().catch(console.error);
