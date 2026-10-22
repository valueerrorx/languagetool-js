// Ported from MorfologikSpanishSpellerRuleTest (es module)
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { JLanguageTool } from '../../../../src/core/JLanguageTool.js';
import { Spanish } from '../../../../src/lang/es/language/Spanish.js';
import { MorfologikSpanishSpellerRule } from '../../../../src/lang/es/rules/MorfologikSpanishSpellerRule.js';
import { messagesFor } from '../../../support/ruleTestSupport.js';
import { simulateNoEnglishModule } from '../../../support/NoEnglishModule.js';

simulateNoEnglishModule();

describe('MorfologikSpanishSpellerRuleTest', () => {
  // Java: MorfologikSpanishSpellerRuleTest#testMorfologikSpeller
  it('testMorfologikSpeller', () => {
    const language = Spanish.getInstance();
    const rule = new MorfologikSpanishSpellerRule(messagesFor(language), language, null, []);
    const lt = new JLanguageTool(language);
    const n = (s) => rule.match(lt.getAnalyzedSentence(s)).length;

    expect(n("Escriba un texto aquí. LanguageTool le ayudará a afrontar algunas dificultades propias de la escritura.")).toBe(0);
    expect(n("Hagámosle, deme, démelo, europeízate, homogenéizalo. Anúnciate. Desáhucialos.")).toBe(0);
    expect(n("Veíanse")).toBe(1); // This is archaic
    expect(n("En la p. 25, pp. 33-45. Ctrl+A")).toBe(0);
    // ignore tagged words not in the speller dictionary ("anillos")
    expect(n("Del libro de los cinco anillos")).toBe(0);
    let matches = rule.match(lt.getAnalyzedSentence("Se a hecho un esfuerzo para detectar errores tipográficos, ortograficos y incluso gramaticales."));
    expect(matches.length).toBe(1);
    expect(matches[0].getFromPos()).toBe(59);
    expect(matches[0].getToPos()).toBe(71);
    expect(matches[0].getSuggestedReplacements()[0]).toBe("ortográficos");
    matches = rule.match(lt.getAnalyzedSentence("Se a 😂 hecho un esfuerzo para detectar errores tipográficos, ortograficos y incluso gramaticales."));
    expect(matches.length).toBe(1);
    expect(matches[0].getFromPos()).toBe(62);
    expect(matches[0].getToPos()).toBe(74);
    expect(matches[0].getSuggestedReplacements()[0]).toBe("ortográficos");
    matches = rule.match(lt.getAnalyzedSentence("Se a 😂😂 hecho un esfuerzo para detectar errores tipográficos, ortograficos y incluso gramaticales."));
    expect(matches.length).toBe(1);
    expect(matches[0].getFromPos()).toBe(64);
    expect(matches[0].getToPos()).toBe(76);
    expect(matches[0].getSuggestedReplacements()[0]).toBe("ortográficos");
    matches = rule.match(lt.getAnalyzedSentence("Juan -el menor- jugó a la pelota."));
    expect(matches.length).toBe(0);
    matches = rule.match(lt.getAnalyzedSentence("vilbaino."));
    expect(matches[0].getSuggestedReplacements()[0]).toBe("Bilbaíno");
    // This needs to be handled with rules for different variants.
    // In Spain is a spelling error, but not in other countries.
    // matches = rule.match(langTool.getAnalyzedSentence("confirmame."));
    // assertEquals("confírmame", matches[0].getSuggestedReplacements().get(0));
    matches = rule.match(lt.getAnalyzedSentence("confirmame."));
    expect(matches.length).toBe(0);
    matches = rule.match(lt.getAnalyzedSentence("confírmame."));
    expect(matches.length).toBe(0);
    matches = rule.match(lt.getAnalyzedSentence("DECANTACION."));
    expect(matches[0].getSuggestedReplacements()[0]).toBe("DECANTACIÓN");
    matches = rule.match(lt.getAnalyzedSentence("distopia"));
    expect(matches[0].getSuggestedReplacements()[0]).toBe("distopía");
    matches = rule.match(lt.getAnalyzedSentence("Aministraciones"));
    expect(matches[0].getSuggestedReplacements()[0]).toBe("Administraciones");
    matches = rule.match(lt.getAnalyzedSentence("respostas"));
    expect(matches[0].getSuggestedReplacements()[0]).toBe("respuestas");
    matches = rule.match(lt.getAnalyzedSentence("mui"));
    expect(matches[0].getSuggestedReplacements()[0]).toBe("muy");
    matches = rule.match(lt.getAnalyzedSentence("finga"));
    expect(matches[0].getSuggestedReplacements()[0]).toBe("finja");
    matches = rule.match(lt.getAnalyzedSentence("esque"));
    expect(matches[0].getSuggestedReplacements()[0]).toBe("es que");
    matches = rule.match(lt.getAnalyzedSentence("hicistes"));
    expect(`[${matches[0].getSuggestedReplacements().join(', ')}]`).toBe("[hiciste, hicisteis]");
    matches = rule.match(lt.getAnalyzedSentence("Windows10"));
    expect(matches[0].getSuggestedReplacements()[0]).toBe("Windows 10");
    matches = rule.match(lt.getAnalyzedSentence("windows10"));
    expect(matches[0].getSuggestedReplacements()[0]).toBe("Windows 10");
    matches = rule.match(lt.getAnalyzedSentence("Windows1995"));
    expect(matches[0].getSuggestedReplacements()[0]).toBe("Windows 1995");
    //FIXME
    //matches = rule.match(lt.getAnalyzedSentence("windows1995"));
    //assertEquals("Windows 1995", matches[0].getSuggestedReplacements().get(0));
    matches = rule.match(lt.getAnalyzedSentence("windows95"));
    expect(matches[0].getSuggestedReplacements()[0]).toBe("Windows 95");
    matches = rule.match(lt.getAnalyzedSentence("en1995"));
    expect(matches[0].getSuggestedReplacements()[0]).toBe("en 1995");
    matches = rule.match(lt.getAnalyzedSentence("BretañaItinerante"));
    expect(matches[0].getSuggestedReplacements()[0]).toBe("Bretaña Itinerante");
    matches = rule.match(lt.getAnalyzedSentence("sigloXXI"));
    expect(matches[0].getSuggestedReplacements()[0]).toBe("siglo XXI");
    matches = rule.match(lt.getAnalyzedSentence("gustarÃ\u00ADa"));
    expect(matches[0].getSuggestedReplacements()[0]).toBe("gustaría");
    // currencies
    matches = rule.match(lt.getAnalyzedSentence("$100"));
    expect(matches.length).toBe(0);
    matches = rule.match(lt.getAnalyzedSentence("$10,000"));
    expect(matches.length).toBe(0);
    matches = rule.match(lt.getAnalyzedSentence("10,000 USD"));
    expect(matches.length).toBe(0);
    matches = rule.match(lt.getAnalyzedSentence("10,000 EUR"));
    expect(matches.length).toBe(0);
    // emojis
    matches = rule.match(lt.getAnalyzedSentence("🧡"));
    expect(matches.length).toBe(0);
    matches = rule.match(lt.getAnalyzedSentence("🚴"));
    expect(matches.length).toBe(0);
    matches = rule.match(lt.getAnalyzedSentence("🏽"));
    expect(matches.length).toBe(0);
    matches = rule.match(lt.getAnalyzedSentence("♂️"));
    expect(matches.length).toBe(0);
    matches = rule.match(lt.getAnalyzedSentence("🎉"));
    expect(matches.length).toBe(0);
    matches = rule.match(lt.getAnalyzedSentence("💛"));
    expect(matches.length).toBe(0);
    matches = rule.match(lt.getAnalyzedSentence("✈️"));
    expect(matches.length).toBe(0);
    matches = rule.match(lt.getAnalyzedSentence("🧡🚴"));
    expect(matches.length).toBe(0);
    matches = rule.match(lt.getAnalyzedSentence("🧡🚴🏽♂️ , 🎉💛✈️"));
    expect(matches.length).toBe(0);
    matches = rule.match(lt.getAnalyzedSentence("- Prueva"));
    expect(matches.length).toBe(1);
    expect(matches[0].getFromPos()).toBe(2);
    expect(matches[0].getToPos()).toBe(8);
    matches = rule.match(lt.getAnalyzedSentence("🧡 Prueva"));
    expect(matches.length).toBe(1);
    expect(matches[0].getFromPos()).toBe(3);
    expect(matches[0].getToPos()).toBe(9);
    // Combining diacritics
    matches = rule.match(lt.getAnalyzedSentence("publicacio\u0301n"));
    expect(matches[0].getSuggestedReplacements()[0]).toBe("publicación");
    // Other rare characters
    // special chars
    expect(n("33° 5′ 40″ N; 32° 59′ 0″ E.")).toBe(0);
    expect(n("33°5′40″N i 32°59′0″E.")).toBe(0);
    expect(n("5·10-³ metros.")).toBe(0);
    // hashtags, domain names, mentions
    expect(n("Una #mecion de @algunamigo en es.wikipedia.org")).toBe(0);
    expect(n("documentos publicados en ADSLZone.net")).toBe(0);
    expect(n("Europa-Agricola.es es una página web dedicada a los anuncios")).toBe(0);
    expect(n("LANGUAGETOOL.ORG")).toBe(0);
    matches = rule.match(lt.getAnalyzedSentence("Martin Scorsese"));
    expect(matches.length).toBe(0);
    matches = rule.match(lt.getAnalyzedSentence("Chris Martin"));
    expect(matches.length).toBe(0);
    matches = rule.match(lt.getAnalyzedSentence("Chris Martin. Johann Martin Schleyer. Martin Beck. Bob Martin. Gooey Martin. Skip Martin. " + "Martin Chivers. Dora Martin. Vincent Martin. George R. Martin. Martin Schulz. " + "Martin Rütter. Martin Walser. Rudolph Martin. Martin Blank. Martin Luther King. " + "Gregor Martin. Martin Bishop. Ricky Martin. Martin Fierro. Chris Martin."));
    expect(matches.length).toBe(0);
    // Martin van Heemskerck. Martin von Klaus. Martin Sylvester Huggins.
    matches = rule.match(lt.getAnalyzedSentence("Martin"));
    expect(matches.length).toBe(1);
    expect(`[${matches[0].getSuggestedReplacements().join(', ')}]`).toBe("[Martín, Mártir, Martina, Mastín, Marin, Marlín, Marti, Martins, Martinů, Martiño, Martí, Marvin, Marín, Martini]");
    matches = rule.match(lt.getAnalyzedSentence("Dnipro"));
    expect(matches.length).toBe(1);
    expect(`[${matches[0].getSuggestedReplacements().join(', ')}]`).toBe("[Dnipró]");
    matches = rule.match(lt.getAnalyzedSentence("Dnepr"));
    expect(matches.length).toBe(1);
    expect(matches[0].getSuggestedReplacements()[0]).toBe("Dniéper");
    matches = rule.match(lt.getAnalyzedSentence("don't, doesn't, don’t, doesn’t"));
    expect(matches.length).toBe(0);
    matches = rule.match(lt.getAnalyzedSentence("l'Alacantí, l’Alacantí"));
    expect(matches.length).toBe(0);
    matches = rule.match(lt.getAnalyzedSentence("medices algo"));
    expect(matches.length).toBe(1);
    expect(matches[0].getSuggestedReplacements()[0]).toBe("Me dices");
    // coloquialism allowed, but not suggested
    matches = rule.match(lt.getAnalyzedSentence("El munipa"));
    expect(matches.length).toBe(0);
    matches = rule.match(lt.getAnalyzedSentence("El munipe"));
    expect(matches.length).toBe(1);
    expect(matches[0].getSuggestedReplacements().includes("munipa")).toBe(false);
  }, 3600000);
});
