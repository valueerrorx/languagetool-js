// org.languagetool.tools.Tools (message formatting part; the rest follows in later steps).
import { MessageFormat } from '../lib/java/MessageFormat.js';

// Java: Tools#i18n(ResourceBundle,String,Object...)
export function i18n(messages, key, ...messageArguments) {
  const formatter = new MessageFormat('');
  formatter.applyPattern(messages.getString(key));
  return formatter.format(messageArguments);
}
