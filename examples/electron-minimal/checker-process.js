// Utility process: loads @ltjs/core once and answers check requests from the main process.
import { check, listLanguages } from '@ltjs/core';

const port = process.parentPort;

port.on('message', async ({ data }) => {
  try {
    port.postMessage({ id: data.id, result: await check(data.text, data.options) });
  } catch (e) {
    port.postMessage({ id: data.id, error: String(e?.message ?? e) });
  }
});

port.postMessage({ type: 'ready', languages: [...new Set(listLanguages().map((l) => l.longCode))] });
