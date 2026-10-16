// Ported from UnicodeBasedLangIdentifierTest (languagetool-core).
import { describe, it, expect } from 'vitest';
import { UnicodeBasedDetector } from '../../../../src/core/language/identifier/detector/UnicodeBasedDetector.js';
import { abstractCollectionToString } from '../../../../src/lib/java/toString.js';

const ident = new UnicodeBasedDetector(100);

// Java: UnicodeBasedLangIdentifierTest#codes(String)
const codes = (s) => abstractCollectionToString(ident.getDominantLangCodes(s));

describe('UnicodeBasedLangIdentifierTest', () => {
  // Java: UnicodeBasedLangIdentifierTest#testGetDominantLangCodes
  it('testGetDominantLangCodes', () => {
    const arabic = '[ar, fa]';
    const cyrillic = '[ru, uk, be]';
    const cjk = '[zh, ja]';
    const devanagari = '[hi, mr]';
    const thai = '[th]';
    const hebrew = '[he]';
    const korean = '[ko]';

expect(codes("")).toBe("[]");
    expect(codes(" ")).toBe("[]");
    expect(codes("hallo")).toBe("[]");
    expect(codes("hallo this is a text")).toBe("[]");
    expect(codes("hallo this is a text стиль")).toBe("[]");

    expect(codes("Грамматика, стиль и орфография LanguageTool проверяет ваше правописание на более чем 20 языках")).toBe(cyrillic);
    expect(codes("проверяет ваше правописание на более чем 20 языках")).toBe(cyrillic);
    expect(codes("Програма перевірки граматики, стилю та орфографії. LanguageTool перевіряє ваші тексти більш ніж 20-ма мовами")).toBe(cyrillic);
    expect(codes("Сучасная беларуская мова існуе ў літаратурнай і дыялектнай формах.")).toBe(cyrillic);  // Belarusian
    expect(codes("Програма перевірки граматики, стилю та орфографії.")).toBe(cyrillic);
    expect(codes("проверяет ваше правописание на более чем 20 языках - Програма перевірки граматики, стилю та орфографії.")).toBe(cyrillic);
    expect(codes("Сучасная беларуская мова існуе ў літаратурнай і дыялектнай формах. - Програма перевірки граматики, стилю та орфографії.")).toBe(cyrillic);
    expect(codes("проверяет ваше правописание на более чем 20 языках - Сучасная беларуская мова існуе ў літаратурнай і дыялектнай формах.")).toBe(cyrillic);
    expect(codes("проверяет ваше правописание на более чем 20 языках" +
                     "Here's some short English text, but it's short")).toBe(cyrillic);
    expect(codes("Програма перевірки граматики, стилю та орфографії." +
                     "Here's some short English text, but it's short")).toBe(cyrillic);
    expect(codes("проверяет ваше правописание на более чем 20 языках" +
                     "Here's some English text")).toBe(cyrillic);

    // Arabic
    expect(codes("لِينُكس (بالإنجليزية: Linux)\u200F (عن هذا الملف استمع (؟·معلومات)) ويسمى أيضا")).toBe(arabic);
    expect(codes("طور لينكس في الأصل لكي يعمل على")).toBe(arabic);
    expect(codes("يعمل لينكس أيضا على")).toBe(arabic);
    expect(codes("في بادئ الأمر أراد")).toBe(arabic);

    // Chinese:
    // accept ambiguity here, we assume the actual language identifier will tell Chinese from Japanese
    expect(codes("您的意思是")).toBe(cjk);
    expect(codes("Linux嚴格來說是單指作業系統的内核")).toBe(cjk);
    expect(codes("通常情况下 but here's more text with Latin characters")).toBe("[]");
    // Japanese:
    expect(codes("Linux（リナックス、他の読みは後述）とは、Unix系オペレーティングシステムカーネル")).toBe(cjk);
    expect(codes("1990年代はFreeBSDと比較して安定性に劣ると言われてきたが")).toBe(cjk);
    expect(codes("リーナス・トーバルズはカーネル開")).toBe(cjk);

    // Khmer:
    expect(codes("ហើយដោយ​ព្រោះ​")).toBe("[km]");

    // Tamil:
    expect(codes("லேங்குவேஜ்")).toBe("[ta]");

    // Greek:
    expect(codes("Το Linux μπορεί να εγκατασταθεί και")).toBe("[el]");
    expect(codes("Δημιουργός του πυρήνα Linux είναι ο")).toBe("[el]");
    expect(codes("Ο Τόρβαλντς ξεκίνησε")).toBe("[el]");

    // Hindi:
    expect(codes("दरलैंड में कोरोनोवायरस के दर्ज मामलों की संख्या 38 से बढ़कर 82 हो गई है।\n" +
                     " मामलों में वृद्धि तब होती है जब देश उत्तरी इटली में स्कीइंग की छुट्टियों")).toBe(devanagari);  // Hindi
    expect(codes("आम्हाला उशीर होणार नाही")).toBe(devanagari);  // Marathi

    // Thai:
    expect(codes("ลินุกซ์ (อังกฤษ: Linux) และรู้จักในชื่อ กะนู/ลินุกซ์")).toBe(thai);
    expect(codes("ลินุกซ์มีสัญญาอนุญาตแบบ GPL ซึ่งเป็นสัญญาอนุญาตที่กำหนด")).toBe(thai);

    // Hebrew:
    expect(codes("לינוקס (באנגלית: Linux) היא משפחה של מערכות הפעלה המבוססות")).toBe(hebrew);
    expect(codes("לינוקס היא דוגמה")).toBe(hebrew);

    // Korean:
    expect(codes("리눅스(Linux)[4]는 1991년 9월 17일 리누스 토르발스가 처음 출시한")).toBe(korean);
    expect(codes("리눅스(Linux)[4]는 1991년 9월 17일 리누")).toBe(korean);
    expect(codes("배포판에는 리눅스 커널과 지원")).toBe(korean);
    expect(codes("저명한 리눅스 배포판")).toBe(korean);
    expect(codes("리눅스는 또한 일반적으로")).toBe(korean);
    expect(codes("리눅스는 자유-")).toBe(korean);
  });
});
