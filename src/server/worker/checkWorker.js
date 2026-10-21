// JS: check worker thread (the Java text checker pool thread): owns its ResultCache, pipeline pool and language data
import { parentPort, workerData } from 'node:worker_threads';
import '../../lang/register.js';
import { Languages } from '../../core/Languages.js';
import { File } from '../../lib/java/io/File.js';
import { Thread } from '../../lib/java/Thread.js';
import { CheckExecutor } from '../CheckExecutor.js';
import { WorkerConfig, errorToDto } from './transport.js';

const flag = new Int32Array(workerData.flag);
Thread.useSharedFlag(flag);

let executor = null;
let initError = null;
try {
  for (const d of workerData.config.dynamicLanguages ?? []) Languages.addLanguage(d.name, d.code, new File(d.dictPath)); // JS: same dynamic languages as the main thread
  executor = new CheckExecutor(new WorkerConfig(workerData.config), false);
} catch (e) {
  initError = errorToDto(e);
}

parentPort.on('message', (msg) => {
  Atomics.store(flag, 0, 0); // a new task starts without interrupt (ThreadPoolExecutor#runWorker)
  if (initError !== null) {
    parentPort.postMessage({ t: 'done', id: msg.id, ok: false, error: initError });
    return;
  }
  try {
    const results = msg.t === 'prewarm'
      ? executor.prewarmPipelinePool(msg.preferredLanguages)
      : executor.run(msg.payload, msg.stream ? (dto) => parentPort.postMessage({ t: 'match', id: msg.id, dto }) : null);
    parentPort.postMessage({ t: 'done', id: msg.id, ok: true, results });
  } catch (e) {
    parentPort.postMessage({ t: 'done', id: msg.id, ok: false, error: errorToDto(e) });
  }
});
