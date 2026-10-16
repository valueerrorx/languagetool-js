// Ported from DefaultLanguageIdentifierTest + LanguageIdentifierTest#langAssert (languagetool-standalone); fastText/ngram tests are @Ignore'd in Java (DEV-001).
import { describe, it, expect } from 'vitest';
import '../../../../src/lang/register.js';
import { LanguageIdentifierService } from '../../../../src/core/language/identifier/LanguageIdentifierService.js';

const czech = 'V současné době je označením Linux míněno nejen jádro operačního systému, '
  + 'ale zahrnuje do něj též veškeré programové vybavení';

// Java: LanguageIdentifierTest#langAssert(String,String,LanguageIdentifier[,List,List])
function langAssert(expectedLangCode, text, id, noopLangCodes = [], preferredLangCodes = []) {
  const detectedLang = id.detectLanguage(text, noopLangCodes, preferredLangCodes);
  const detectedLangCode = detectedLang !== null && detectedLang.getDetectedLanguage() !== null ? detectedLang.getDetectedLanguage().getShortCode() : null;
  expect(detectedLangCode, `for '${text}' from '${detectedLang?.getDetectionSource()}'`).toBe(expectedLangCode);
}

// Java: LanguageIdentifierService.INSTANCE.clearLanguageIdentifier("default").getDefaultLanguageIdentifier(0, null, null, null)
const fresh = () => LanguageIdentifierService.INSTANCE.clearLanguageIdentifier('default').getDefaultLanguageIdentifier(0, null, null, null);

describe('DefaultLanguageIdentifierTest', () => {
  // Java: DefaultLanguageIdentifierTest#testDetection
  it('testDetection', () => {
    const identifier = fresh();
    langAssert('de', 'Das ist ein deutscher Text', identifier);
    langAssert('en', 'This is an English text', identifier);
    langAssert('fr', 'Le mont Revard est un sommet du département français ...', identifier);
    // some test sentences from the "Linux" article of Wikipedia:
    langAssert('be', "Першапачаткова Linux распрацоўваўся і выкарыстоўваўся асобнымі аматарамі на сваіх персанальных камп'ютарах.", identifier);
    langAssert('ca', 'Aquest sistema operatiu va créixer gràcies al treball col·laboratiu de programadors de tot el món ...', identifier);
    langAssert('zh', 'Linux最初是作为支持英特尔x86架构的个人电脑的一个自由操作系统。目前Linux已经被移植到更多的计算机硬件平台', identifier);
    langAssert('da', "Linux-distributionerne har traditionelt deres største udbredelse på servere, men er hastigt på vej på almindelige pc'er.", identifier);
    langAssert('nl', 'Linux is een verzameling van open source Unix-achtige besturingssystemen gebaseerd op de POSIX-standaard.', identifier);
    langAssert('el', 'Το Linux μπορεί να εγκατασταθεί και να λειτουργήσει σε μεγάλη ποικιλία υπολογιστικών συστημάτων, από μικρές συσκευές όπως κινητά τηλέφωνα ...', identifier);
    langAssert('it', "Grazie alla portabilità del kernel Linux sono stati sviluppati sistemi operativi Linux per un'ampia gamma di dispositivi:", identifier);
    langAssert('ja', 'Linuxは、狭義ではLinuxカーネルを意味し、広義ではそれをカーネルとして用いたオペレーティングシステム (OS) を意味する。', identifier);
    langAssert('km', 'បច្ចុប្បន្នគ្មានអត្ថបទក្នុងទំព័រនេះទេ។អ្នកអាច ស្វែងរក​ចំណងជើង​នៃទំព័រនេះក្នុងទំព័រដទៃទៀត​​ ឬ ស្វែង​រក​កំណត់​ហេតុ​ដែល​ពាក់ព័ន្ធ ឬ កែប្រែ​ទំព័រនេះ', identifier);
    langAssert('fa', 'این صفحه حذف شده‌است. در زیر سیاههٔ حذف و انتقال این صفحه نمایش داده شده‌است.', identifier);
    langAssert('pl', 'Linux – rodzina uniksopodobnych systemów operacyjnych opartych na jądrze Linux.', identifier);
    langAssert('pt', 'Linux é um termo utilizado para se referir a sistemas operativos ou sistemas operacionais que utilizem o núcleo Linux.', identifier);
    langAssert('ro', 'Linux este o familie de sisteme de operare de tip Unix care folosesc Nucleul Linux (în engleză kernel).', identifier);
    langAssert('ru', 'Linux, также Ли́нукс — общее название Unix-подобных операционных систем, основанных на одноимённом ядре.', identifier);
    langAssert('sk', 'Linux je počítačový operačný systém a jeho jadro.', identifier);
    langAssert('sl', 'Linux je prost operacijski sistem podoben Unixu s prosto dostopno izvorno kodo ...', identifier);
    langAssert('es', 'GNU/Linux es uno de los términos empleados para referirse a la combinación del núcleo o kernel libre ...', identifier);
    langAssert('sv', 'Linux eller GNU/Linux är ett Unix-liknande operativsystem som till största delen', identifier);
    langAssert('tl', 'Ang Linux ay isang operating system kernel para sa mga operating system na humahalintulad sa Unix.', identifier);
    langAssert('ta', 'Linux பற்றி பிற கட்டுரைகளில் தேடிப்பாருங்கள்.', identifier);
    langAssert('uk', 'Лі́нукс — загальна назва UNIX-подібних операційних систем на основі однойменного ядра.', identifier);
    langAssert('km', 'អ្នក​អាច​ជួយ​លើក​ស្ទួយ​វិគីភីឌាភាសាខ្មែរ​នេះ​ឱ្យ​មាន​លក្ខណៈ', identifier);
    // not yet in language-detector 0.5:
    langAssert('eo', 'Imperiestraj pingvenoj manĝas ĉefe krustacojn kaj malgrandajn ...', identifier);
    // detected as not supported by the unicode characters used:
    langAssert('zz', 'ลินุกซ์ (อังกฤษ: Linux)', identifier); // Thai
    langAssert('zz', 'यूएसबी (अंग्रेज़ी: Live ...)', identifier); // Hindi
    langAssert('zz', 'लिनक्स (इंग्लिश: Linux)', identifier); // Marathi
  });

  // Java: DefaultLanguageIdentifierTest#testKnownLimitations
  it('testKnownLimitations', () => {
    const identifier = fresh();
    langAssert(null, '', identifier);
    langAssert('ca', 'X', identifier);
    // not activated because it impairs detection of Spanish, so ast and gl may be mis-detected:
    langAssert('es', "L'Iberorrománicu o Iberromance ye un subgrupu de llingües romances que posiblemente ...", identifier); // ast
    langAssert('es', 'Dodro é un concello da provincia da Coruña pertencente á comarca do Sar ...', identifier); // gl
    // Somali, known by language-detector, but not by LT, so we get back something else:
    langAssert('tl', 'Dhammaan garoomada caalamka ayaa loo isticmaalaa. Ururku waxa uu qabtaa ama uu ku shaqaleeyahay '
      + 'isusocodka diyaaradaha aduunka ee iskaga gooshaya xuduudaha iyo ka hortagga wixii qalad ah iyo baaritaanka '
      + 'marka ay dhacdo dhibaato la xiriirta dulimaad.', identifier);
  });

  // Java: DefaultLanguageIdentifierTest#testIgnoreSignature
  it('testIgnoreSignature', () => {
    const identifier = fresh();
    langAssert('de', "Das ist ein deutscher Text\n-- \nBut this is an\nEnglish text in the signature, and it's much longer than the original text.", identifier);
    langAssert('en', 'This is an English text.\n-- \nDas ist ein\ndeutscher Text in der Signatur, der länger ist als der Haupttext.', identifier);
    langAssert('en', 'This is an English text.\n-- \nDas ist ein\ndeutscher Text in der Signatur, der länger ist als der Haupttext.', identifier);
  });

  // Java: DefaultLanguageIdentifierTest#testAdditionalLanguagesBuiltIn
  it('testAdditionalLanguagesBuiltIn', () => {
    const defaultIdent = fresh();
    langAssert('sk', czech, defaultIdent); // misdetected, as cz isn't supported by LT
    const csIdent = fresh();
    langAssert('sk', czech, csIdent, ['cs'], []); // no-op language only supported by fastText
  });

  // Java: cleanAndShortenText, forcePreferredLanguagesTest, fasttextReinit*, testShortAndLongText, testAdditionalLanguagesFasttext,
  // testInteractively, testShortTexts*, textObjectBugForJapanese are @Ignore'd in Java (fastText/ngram data, DEV-001)
});
