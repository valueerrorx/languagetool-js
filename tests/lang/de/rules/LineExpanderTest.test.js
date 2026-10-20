// Ported from LineExpanderTest (languagetool-language-modules/de)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { LineExpander } from '../../../../src/lang/de/rules/LineExpander.js';
import { RuntimeException } from '../../../../src/lib/java/errors.js';
import { javaSplit, javaTrim } from '../../../../src/lib/java/strings.js';

describe('LineExpanderTest', () => {
  const exp = new LineExpander();

  // Java: LineExpanderTest#expand(String)
  const expand = (line) => `[${exp.expandLine(line).join(', ')}]`; // Java: List#toString()

  // Java: LineExpanderTest#parseStringToSet(String)
  function parseStringToSet(bracketString) {
    // Remove brackets and split by comma
    const content = bracketString.substring(1, bracketString.length - 1);
    if (javaTrim(content).length === 0) {
      return new Set();
    }
    // Split by comma and trim each element
    return new Set(javaSplit(content, ',').map((s) => javaTrim(s)));
  }

  // Java: LineExpanderTest#assertSetsEqual(String,String)
  function assertSetsEqual(expected, actual) {
    // Convert the strings to sets by parsing the bracket notation
    expect(parseStringToSet(actual)).toEqual(parseStringToSet(expected));
  }

  // Java: LineExpanderTest#testExpansion
  it('testExpansion', () => {
    assertSetsEqual(expand(''), '[]');
    assertSetsEqual(expand('Das'), '[Das]');
    assertSetsEqual(expand('Tisch/E'), '[Tisch, Tische]');
    assertSetsEqual(expand('Tische/N'), '[Tische, Tischen]');
    assertSetsEqual(expand('Auto/S'), '[Auto, Autos]');
    assertSetsEqual(expand('klein/A'), '[klein, kleine, kleiner, kleines, kleinen, kleinem]');
    assertSetsEqual(expand('x/NSE'), '[x, xn, xs, xe]');
    assertSetsEqual(expand('x/NA'), '[x, xn, xe, xer, xes, xen, xem]');
    assertSetsEqual(expand('viertjüngste/A'), '[viertjüngste, viertjüngster, viertjüngstes, viertjüngsten, viertjüngstem]');
    assertSetsEqual(expand('Das  #foo'), '[Das]');
    assertSetsEqual(expand('Tisch/E  #bla #foo'), '[Tisch, Tische]');
    assertSetsEqual(expand('Goethestraße/T'), '[Goethestraße, Goethestr.]');
    assertSetsEqual(expand('Goethestrasse/T'), '[Goethestrasse, Goethestr.]');
    assertSetsEqual(expand('Zwingenberger Straße/T'), '[Zwingenberger Straße, Zwingenberger Str.]');
    assertSetsEqual(expand('Zwingenberger Strasse/T'), '[Zwingenberger Strasse, Zwingenberger Str.]');

    assertSetsEqual(expand('Escape\\/N'), '[Escape/N]');
    // assertThat(expand("Escape\\/N/S"), is("[Escape/N, Escape/Ns]"));  // combination of escape and flag not supported yet

    assertSetsEqual(expand('rüber_machen  #bla #foo'), '[rübermach, rübergemacht, rübermachest, rübermachst, rübermache, '
      + 'rübermachen, rübermachet, rübermachte, rübermachend, rübermachten, rübermacht, rübermachtest, '
      + 'rübermachtet, rüberzumachen, Rübermachens]');
    assertSetsEqual(expand('rüber_verschicken'), '[rüberverschickend, rüberverschickst, rüberverschick, rüberverschickest, '
      + 'rüberverschicktest, rüberverschicke, rüberverschicket, rüberverschickte, rüberverschicktet, rüberverschickten, '
      + 'rüberverschicken, rüberverschickt, rüberzuverschicken, Rüberverschickens]');
    assertSetsEqual(expand('escape\\_machen'), '[escape_machen]');

    try {
      expand('rüber/invalidword');
      throw new Error('fail');
    } catch (e) {
      if (!(e instanceof RuntimeException)) throw e; // expected
    }
  });
});
