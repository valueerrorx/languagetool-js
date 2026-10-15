package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;
import org.languagetool.JLanguageTool;
import org.languagetool.RuleEntityResolver;
import org.languagetool.XMLValidator;
import org.xml.sax.*;
import org.xml.sax.helpers.DefaultHandler;

import javax.xml.parsers.SAXParser;
import javax.xml.parsers.SAXParserFactory;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

/** Ops for X-XML: sax-dump (canonical event stream digest) and xml-validate (XMLValidator results). Format: docs/review/F07-oracle.md. */
final class XmlOps {
  private XmlOps() {}

  private static Map<String, Object> err(Throwable t) {
    Map<String, Object> e = new LinkedHashMap<>();
    e.put("class", t.getClass().getName());
    e.put("message", t.getMessage());
    if (t instanceof SAXParseException) {
      SAXParseException s = (SAXParseException) t;
      e.put("line", s.getLineNumber());
      e.put("column", s.getColumnNumber());
    }
    List<Object> causes = new ArrayList<>();
    for (Throwable c = t.getCause(); c != null && causes.size() < 10; c = c.getCause()) causes.add(err(c));
    if (!causes.isEmpty()) e.put("causes", causes);
    return e;
  }

  static String esc(String s) {
    StringBuilder b = new StringBuilder(s.length() + 8);
    for (int i = 0; i < s.length(); i++) {
      char c = s.charAt(i);
      switch (c) {
        case '\\': b.append("\\\\"); break;
        case '\t': b.append("\\t"); break;
        case '\n': b.append("\\n"); break;
        case '\r': b.append("\\r"); break;
        default: b.append(c);
      }
    }
    return b.toString();
  }

  /** Collects the canonical event stream. */
  static final class Digester extends DefaultHandler {
    final MessageDigest md;
    final List<String> first = new ArrayList<>();
    final TreeMap<String, Integer> elements = new TreeMap<>();
    final TreeMap<String, Integer> attrNames = new TreeMap<>();
    final StringBuilder text = new StringBuilder();
    final RuleEntityResolver resolver;
    long events, attrs, textNodes, textChars;
    int depth, maxDepth;

    Digester(boolean useResolver) throws Exception {
      md = MessageDigest.getInstance("SHA-256");
      resolver = useResolver ? new RuleEntityResolver() : null;
    }

    @Override public InputSource resolveEntity(String publicId, String systemId) throws IOException, SAXException {
      return resolver == null ? null : resolver.resolveEntity(publicId, systemId);
    }

    private void emit(String line) {
      events++;
      if (first.size() < 200) first.add(line.length() > 300 ? line.substring(0, 300) + "...[len=" + line.length() + "]" : line);
      md.update(line.getBytes(StandardCharsets.UTF_8));
      md.update((byte) '\n');
    }

    private void flush() {
      if (text.length() > 0) {
        textNodes++;
        textChars += text.length();
        emit("T\t" + esc(text.toString()));
        text.setLength(0);
      }
    }

    @Override public void startElement(String uri, String localName, String qName, Attributes atts) {
      flush();
      TreeMap<String, String> sorted = new TreeMap<>();
      for (int i = 0; i < atts.getLength(); i++) sorted.put(atts.getQName(i), atts.getValue(i));
      StringBuilder b = new StringBuilder("S\t").append(qName);
      for (Map.Entry<String, String> e : sorted.entrySet()) {
        b.append('\t').append(e.getKey()).append('=').append(esc(e.getValue()));
        attrNames.merge(e.getKey(), 1, Integer::sum);
      }
      attrs += sorted.size();
      elements.merge(qName, 1, Integer::sum);
      if (++depth > maxDepth) maxDepth = depth;
      emit(b.toString());
    }

    @Override public void endElement(String uri, String localName, String qName) {
      flush();
      depth--;
      emit("E\t" + qName);
    }

    @Override public void characters(char[] ch, int start, int length) { text.append(ch, start, length); }
    @Override public void ignorableWhitespace(char[] ch, int start, int length) { text.append(ch, start, length); }

    String hex() {
      StringBuilder h = new StringBuilder();
      for (byte x : md.digest()) h.append(String.format("%02x", x & 0xff));
      return h.toString();
    }
  }

  private static InputStream open(JsonNode a) throws IOException {
    if (a.has("bytesBase64")) return new ByteArrayInputStream(Base64.getDecoder().decode(a.get("bytesBase64").asText()));
    if (a.has("xml")) return new ByteArrayInputStream(a.get("xml").asText().getBytes(StandardCharsets.UTF_8));
    String path = a.get("path").asText();
    InputStream is = JLanguageTool.getDataBroker().getAsStream(path);
    if (is == null) throw new FileNotFoundException("Not found in classpath: " + path);
    return is;
  }

  /**
   * sax-dump {path|xml|bytesBase64, profile} -> digest of the canonical event stream.
   * Profiles: pattern/disambiguation (PatternRuleLoader/DisambiguationRuleLoader settings + RuleEntityResolver),
   * falsefriends/bitext (load-external-dtd=false only), plain (JAXP defaults, load-external-dtd=false, no resolver).
   */
  static Object saxDump(JsonNode a) throws Exception {
    String profile = a.has("profile") ? a.get("profile").asText() : "plain";
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("profile", profile);
    try (InputStream is = open(a)) {
      SAXParserFactory factory = SAXParserFactory.newInstance();
      SAXParser p = factory.newSAXParser();
      p.getXMLReader().setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
      boolean limits = profile.equals("pattern") || profile.equals("disambiguation");
      if (limits) {
        p.getXMLReader().setProperty("jdk.xml.maxGeneralEntitySizeLimit", 0);
        p.getXMLReader().setProperty("jdk.xml.totalEntitySizeLimit", 0);
        p.getXMLReader().setProperty("jdk.xml.entityExpansionLimit", 0);
      }
      Digester d = new Digester(limits);
      Object error = null;
      try { p.parse(is, d); } catch (Throwable t) { error = err(t); }
      out.put("error", error);
      out.put("events", d.events);
      out.put("elementTotal", d.elements.values().stream().mapToInt(i -> i).sum());
      out.put("attributeTotal", d.attrs);
      out.put("textNodes", d.textNodes);
      out.put("textChars", d.textChars);
      out.put("maxDepth", d.maxDepth);
      out.put("sha256", d.hex());
      out.put("elementCounts", d.elements);
      out.put("attributeNameCounts", d.attrNames);
      out.put("first200", d.first);
    }
    return out;
  }

  /** xml-validate {mode: dtd|xsd|xsd-merge|string-dtd|string-xsd, ...} -> {ok:true} or {ok:false,error}; stderr holds XMLValidator's own messages. */
  static Object validate(JsonNode a) throws Exception {
    String mode = a.get("mode").asText();
    Map<String, Object> out = new LinkedHashMap<>();
    out.put("mode", mode);
    try {
      XMLValidator v = new XMLValidator();
      switch (mode) {
        case "dtd": v.validateWithDtd(a.get("path").asText(), a.get("schema").asText(), a.get("docType").asText()); break;
        case "xsd": v.validateWithXmlSchema(a.get("path").asText(), a.get("schema").asText()); break;
        case "xsd-merge": v.validateWithXmlSchema(a.get("base").asText(), a.get("path").asText(), a.get("schema").asText()); break;
        case "string-dtd": v.validateXMLString(a.get("xml").asText(), a.get("schema").asText(), a.get("docType").asText()); break;
        case "string-xsd": v.validateStringWithXmlSchema(a.get("xml").asText(), a.get("schema").asText(), a.has("path") ? a.get("path").asText() : "x.xml"); break;
        default: throw new IllegalArgumentException("unknown mode: " + mode);
      }
      out.put("ok", true);
    } catch (Throwable t) {
      out.put("ok", false);
      out.put("error", err(t));
    }
    return out;
  }
}
