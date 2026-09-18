import { startLocal } from './local-worker.js';
const { mf } = await startLocal({ persist: true, port: 4173 });
console.log(`Local: ${await mf.ready}`);
const stop = async () => { await mf.dispose(); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
