// Fake checker for lt-client tests: answers, hangs ("hang") or crashes ("crash") on command.
const send = (m) => process.send(m);
process.on('message', (data) => {
  if (data.type === 'ping') return send({ type: 'pong' });
  if (data.text === 'hang') return undefined;
  if (data.text === 'crash') process.exit(1);
  return send({ id: data.id, result: { matches: [], text: data.text, pid: process.pid } });
});
setTimeout(() => send({ type: 'ready', languages: (process.env.LTJS_WARMUP ?? '').split(',') }), Number(process.env.LTJS_FAKE_WARMUP_MS ?? 20));
