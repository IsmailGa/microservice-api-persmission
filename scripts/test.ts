import { natsClient } from '../src/libs/nats';
import dotenv from 'dotenv';

dotenv.config();

async function test() {
  await natsClient.connect(process.env.NATS_URL!);

  // Тест grant
  const grantResult = await natsClient.grant({
    apiKey: 'abcd-1234',
    module: 'trades',
    action: 'create',
  });
  console.log('Grant:', grantResult);

  // Тест check
  const checkResult = await natsClient.check({
    apiKey: 'abcd-1234',
    module: 'trades',
    action: 'create',
  });
  console.log('Check:', checkResult);

  // Тест list
  const listResult = await natsClient.list({ apiKey: 'abcd-1234' });
  console.log('List:', listResult);

  // Тест revoke
  const revokeResult = await natsClient.revoke({
    apiKey: 'abcd-1234',
    module: 'trades',
    action: 'create',
  });
  console.log('Revoke:', revokeResult);
}

test().catch(console.error);