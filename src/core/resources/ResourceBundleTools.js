// Message bundle resolution (UI language -> MessagesBundle).
import { MissingResourceException } from '../../lib/java/errors.js';
import { Locale } from '../../lib/java/Locale.js';
import { getDataBroker } from './LtStatics.js';
import { ResourceBundleWithFallback } from './ResourceBundleWithFallback.js';

export const MESSAGE_BUNDLE = 'org.languagetool.MessagesBundle'; // Java: JLanguageTool#MESSAGE_BUNDLE

// Java: ResourceBundleTools#getMessageBundle()
export function getMessageBundle() {
  try {
    const bundle = getDataBroker().getResourceBundle(MESSAGE_BUNDLE, Locale.getDefault());
    const fallbackBundle = getDataBroker().getResourceBundle(MESSAGE_BUNDLE, Locale.ENGLISH);
    return new ResourceBundleWithFallback(bundle, fallbackBundle);
  } catch (e) {
    if (!(e instanceof MissingResourceException)) throw e;
    return getDataBroker().getResourceBundle(MESSAGE_BUNDLE, Locale.ENGLISH);
  }
}

// Java: ResourceBundleTools#getMessageBundle(Language)
export function getMessageBundleForLanguage(lang) {
  try {
    let bundle = getDataBroker().getResourceBundle(MESSAGE_BUNDLE, lang.getLocaleWithCountryAndVariant());
    if (!isValidBundleFor(lang, bundle)) {
      bundle = getDataBroker().getResourceBundle(MESSAGE_BUNDLE, lang.getLocale());
      if (!isValidBundleFor(lang, bundle)) {
        // happens if 'xx' is requested but only a MessagesBundle_xx_YY.properties exists
        const defaultVariant = lang.getDefaultLanguageVariant();
        if (defaultVariant !== null && defaultVariant.getCountries().length > 0) {
          const locale = new Locale(defaultVariant.getShortCode(), defaultVariant.getCountries()[0]);
          bundle = getDataBroker().getResourceBundle(MESSAGE_BUNDLE, locale);
        }
      }
    }
    const fallbackBundle = getDataBroker().getResourceBundle(MESSAGE_BUNDLE, Locale.ENGLISH);
    return new ResourceBundleWithFallback(bundle, fallbackBundle);
  } catch (e) {
    if (!(e instanceof MissingResourceException)) throw e;
    return getDataBroker().getResourceBundle(MESSAGE_BUNDLE, Locale.ENGLISH);
  }
}

// Java: ResourceBundleTools#isValidBundleFor(Language,ResourceBundle)
function isValidBundleFor(lang, bundle) {
  return lang.getLocale().getLanguage() === bundle.getLocale().getLanguage();
}
