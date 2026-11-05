// org.languagetool.rules.patterns.FalseFriendRuleLoader (loads false-friends.xml for a text language / mother tongue pair)
import { FileNotFoundException, IOException, NullPointerException, SAXException } from '../../lib/java/errors.js';
import { equalsIgnoreCase } from '../../lib/java/strings.js';
import { MessageFormat } from '../../lib/java/MessageFormat.js';
import { Objects } from '../../lib/java/Objects.js';
import { File } from '../../lib/java/io/File.js';
import { registerComponent } from '../language/components.js';
import { getResourceAsStream, getResourceRoots } from '../resources/ResourceDataBroker.js';
import { getDataBroker } from '../resources/LtStatics.js';
import { parseXml, parserOptions } from '../resources/xml.js';
import { MESSAGE_BUNDLE } from '../resources/ResourceBundleTools.js';
import { ShortDescriptionProvider } from '../ShortDescriptionProvider.js';
import { FalseFriendRuleHandler } from './FalseFriendRuleHandler.js';

// fs path of a broker resource (absolute below a root) -> class-path name with a leading slash
function resourceName(path) {
  for (const root of getResourceRoots()) {
    const prefix = root.endsWith('/') ? root : root + '/';
    if (path.startsWith(prefix)) return `/${path.slice(prefix.length)}`;
  }
  return path.startsWith('/') ? path : `/${path}`;
}

// Java: new FileInputStream(File) + reading it
function readFile(file) {
  const path = file.getPath();
  const bytes = getResourceAsStream(resourceName(file.getAbsolutePath()));
  if (bytes === null) throw new FileNotFoundException(`${path} (No such file or directory)`);
  return bytes;
}

// Java: FalseFriendRuleLoader
export class FalseFriendRuleLoader {
  static FQCN = 'org.languagetool.rules.patterns.FalseFriendRuleLoader';

  // Java: FalseFriendRuleLoader(Language[,boolean]) / FalseFriendRuleLoader(String,String)
  constructor(a, b = false) {
    if (typeof a === 'string') {
      this.falseFriendHint = Objects.requireNonNull(a);
      this.falseFriendSugg = Objects.requireNonNull(b);
      this.inTestMode = false;
    } else {
      const messages = getDataBroker().getResourceBundle(MESSAGE_BUNDLE, a.getLocale());
      this.falseFriendHint = messages.getString('false_friend_hint');
      this.falseFriendSugg = messages.getString('false_friend_suggestion');
      this.inTestMode = b;
    }
  }

  // Java: FalseFriendRuleLoader#getRules(File,Language,Language) / getRules(InputStream,Language,Language); stream = bytes
  getRules(src, language, motherTongue) {
    if (src instanceof File) {
      const stream = readFile(src);
      try {
        return this.getRulesFromStream(stream, language, motherTongue);
      } catch (e) {
        if (e instanceof SAXException) throw new IOException('Could not load false friend rules from ' + src, e);
        throw e;
      }
    }
    return this.getRulesFromStream(src, language, motherTongue);
  }

  // Java: FalseFriendRuleLoader#getRules(InputStream,Language,Language)
  getRulesFromStream(stream, textLanguage, motherTongue) {
    const handler = new FalseFriendRuleHandler(textLanguage, motherTongue, this.falseFriendHint, this.inTestMode);
    try {
      parseXml(stream, handler, parserOptions('plain'));
    } catch (e) {
      if (e instanceof TypeError) throw new NullPointerException(); // JS TypeError stands for a Java NPE
      throw e;
    }
    const rules = handler.getRules();
    const filteredRules = [];
    // Add suggestions to each rule:
    const msgFormat = new MessageFormat(this.falseFriendSugg);
    const descProvider = new ShortDescriptionProvider();
    for (const rule of rules) {
      const patternStr = rule.getPatternTokens().map((k) => k.getString()).join(' ');
      const suggestions = handler.getSuggestionMap().get(rule.getId());
      if (suggestions !== undefined) {
        const formattedSuggestions = [];
        for (const suggestion of suggestions) {
          if (equalsIgnoreCase(patternStr, suggestion)) {
            continue;
          }
          const desc = descProvider.getShortDescription(suggestion, textLanguage);
          if (desc !== null) {
            formattedSuggestions.push('<suggestion>' + suggestion + '</suggestion> (' + desc + ')');
          } else {
            formattedSuggestions.push('<suggestion>' + suggestion + '</suggestion>');
          }
        }
        if (formattedSuggestions.length > 0) {
          const joined = formattedSuggestions.join(', ');
          rule.setMessage(rule.getMessage() + ' ' + msgFormat.format([joined]));
          filteredRules.push(rule);
        }
      }
    }
    return filteredRules;
  }
}

registerComponent(FalseFriendRuleLoader.FQCN, (...args) => new FalseFriendRuleLoader(...args));
