// Electron main process: runs LanguageTool in a supervised utilityProcess so the UI thread never blocks.
import { app } from 'electron';
import { createLtClient } from './lt-client.js';

const lt = createLtClient({ languages: ['de-DE'] });
lt.on('ready', (languages) => console.log('LanguageTool ready, languages:', languages.join(', ')));
lt.on('error', (e) => console.error('LanguageTool gave up:', e.message));

// checks one German sentence and prints the matches
async function show() {
  const result = await lt.check('Das ist ein Fehlr.', { language: 'de-DE' });
  for (const m of result.matches) console.log(`${m.rule.id} at ${m.offset}: ${m.message}`, m.replacements.slice(0, 3).map((r) => r.value));
}

app.whenReady().then(async () => {
  try {
    console.log('starting the utility process (first start loads the language data)...');
    await lt.start();
    await show();
    await lt.restart(); // e.g. after updating the resources
    await show();
  } finally {
    lt.stop();
    app.quit();
  }
});
