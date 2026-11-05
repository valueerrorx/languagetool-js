// Browser/Web Worker entry (WKWebView): the check path on the memory resource backend, without the server surface.
// Preload the language resources with preloadResources() before the first check(); registerLanguage() adds custom
// languages. Contains no node: imports and no require('fs').
import './lang/register.js'; // registers the core classes and every installed language package (top-level await)
import { check, listLanguages, registerLanguage, setMemoryLimits } from './core/check.js';
import { preloadResources } from './core/resources/ResourceDataBroker.js';
import { VERSION } from './core/LtBuildInfo.js';

export { VERSION, check, listLanguages, preloadResources, registerLanguage, setMemoryLimits };
