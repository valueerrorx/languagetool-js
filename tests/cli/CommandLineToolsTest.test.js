// Port of CommandLineToolsTest#testCheck with the ported English rules instead of the demo language (xx not registered), plus context/marker format
import { describe, it, expect } from 'vitest';
import '../../src/lang/register.js';
import { Languages } from '../../src/core/Languages.js';
import { Main } from '../../src/cli/Main.js';
import { checkText } from '../../src/cli/CommandLineTools.js';
import { setSinks } from '../../src/cli/stdio.js';
import { selectRules } from '../../src/core/Tools.js';

function capture(fn) {
  let out = '';
  const old = setSinks((s) => { out += s; }, () => {});
  try { return [fn(), out]; } finally { setSinks(old.out, old.err); }
}

describe('CommandLineToolsTest', () => {
  it('testCheck', () => {
    const lt = Main.newLanguageTool(Languages.getLanguageForShortCode('en-US'), null);
    selectRules(lt, [], [], new Set(), new Set(['ENGLISH_WORD_REPEAT_RULE']), true, false);
    let [matches, output] = capture(() => checkText('Foo.', lt));
    expect(output.indexOf('Time:')).toBe(0);
    expect(matches).toBe(0);
    [matches, output] = capture(() => checkText('This is is a problem.', lt));
    expect(output).toContain('Rule ID: ENGLISH_WORD_REPEAT_RULE');
    expect(output).toContain('This is is a problem.\n     ^^^^^           \n');
    expect(matches).toBe(1);
  });
});
