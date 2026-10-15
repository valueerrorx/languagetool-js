// JS twin of harness op "context-tools" (TextOps#contextTools).
import { ContextTools } from '../../src/core/text/ContextTools.js';
import { safe, str } from './_text-common.mjs';

// Java: TextOps#contextTools(JsonNode)
export function run(a) {
  return a.calls.map((c) => safe(() => {
    const ct = new ContextTools();
    if ('contextSize' in c) ct.setContextSize(c.contextSize);
    if ('escapeHtml' in c) ct.setEscapeHtml(c.escapeHtml);
    if ('marker' in c) ct.setErrorMarker(str(c.marker[0]), str(c.marker[1]));
    if ('markerStart' in c) ct.setErrorMarkerStart(str(c.markerStart));
    if ('markerEnd' in c) ct.setErrorMarkerEnd(str(c.markerEnd));
    const { from, to } = c;
    const text = str(c.text);
    return {
      context: safe(() => ct.getContext(from, to, text)),
      plain: safe(() => ct.getPlainTextContext(from, to, text)),
    };
  }));
}
