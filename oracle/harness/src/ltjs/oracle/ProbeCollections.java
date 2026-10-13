package ltjs.oracle;

import com.fasterxml.jackson.databind.JsonNode;

import java.io.*;
import java.nio.charset.Charset;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/** X-PROBE-COLLECTIONS: hash/tree ordering, Properties.load, sort, Random, Scanner, PriorityQueue, lists. */
final class ProbeCollections {
  private ProbeCollections() {}

  static Object run(JsonNode a) throws Exception {
    String fn = a.get("fn").asText();
    switch (fn) {
      case "map": return map(a);
      case "properties": return properties(a);
      case "sort": return sort(a);
      case "random": return random(a);
      case "shuffle": return shuffle(a);
      case "scanner": return scanner(a);
      case "pq": return pq(a);
      case "list": return list(a);
      default: throw new IllegalArgumentException("unknown fn: " + fn);
    }
  }

  private static Object key(String type, JsonNode n) {
    if (n.isNull()) return null;
    String v = n.asText();
    switch (type) {
      case "string": return v;
      case "int": return Integer.valueOf(v);
      case "long": return Long.valueOf(v);
      case "double": return Double.valueOf(v);
      case "char": return v.charAt(0);
      case "bool": return Boolean.valueOf(v);
      default: throw new IllegalArgumentException("unknown key type: " + type);
    }
  }

  @SuppressWarnings("unchecked")
  private static Comparator<Object> cmp(String name) {
    if (name == null || name.equals("natural")) return null;
    switch (name) {
      case "ci": return (x, y) -> String.CASE_INSENSITIVE_ORDER.compare((String) x, (String) y);
      case "reverse": return Collections.reverseOrder();
      case "len": return Comparator.comparingInt(o -> ((String) o).length());
      case "nullsFirst": return (x, y) -> x == null ? (y == null ? 0 : -1) : y == null ? 1 : ((Comparable<Object>) x).compareTo(y);
      case "keyPrefix": return Comparator.comparing(o -> ((String) o).split(":")[0]);
      default: throw new IllegalArgumentException("unknown comparator: " + name);
    }
  }

  @SuppressWarnings({"unchecked", "rawtypes"})
  private static Object map(JsonNode a) {
    String kind = a.get("kind").asText();
    String kt = a.has("keyType") ? a.get("keyType").asText() : "string";
    String ctor = a.has("ctor") ? a.get("ctor").asText() : "default";
    Comparator<Object> c = cmp(Probe.str(a, "cmp"));
    boolean isMap = !kind.endsWith("Set");
    Object coll;
    if (ctor.startsWith("copy")) {
      // copy constructor from a pre-filled source (sizing differs from incremental puts)
      List<Object> src = new ArrayList<>();
      for (JsonNode k : a.get("keys")) src.add(key(kt, k));
      if (isMap) {
        Map<Object, Object> m = new LinkedHashMap<>();
        for (Object k : src) m.put(k, k);
        coll = kind.equals("HashMap") ? new HashMap<>(m) : kind.equals("LinkedHashMap") ? new LinkedHashMap<>(m)
            : kind.equals("Hashtable") ? new Hashtable<>(m) : kind.equals("TreeMap") ? new TreeMap<>(m) : new ConcurrentHashMap<>(m);
      } else {
        coll = kind.equals("HashSet") ? new HashSet<>(src) : kind.equals("LinkedHashSet") ? new LinkedHashSet<>(src) : new TreeSet<>(src);
      }
    } else {
      int cap = ctor.startsWith("cap:") ? Integer.parseInt(ctor.substring(4).split(":")[0]) : -1;
      float lf = ctor.contains(":lf:") ? Float.parseFloat(ctor.substring(ctor.indexOf(":lf:") + 4)) : 0.75f;
      switch (kind) {
        case "HashMap": coll = cap < 0 ? new HashMap<>() : new HashMap<>(cap, lf); break;
        case "LinkedHashMap": coll = cap < 0 ? new LinkedHashMap<>() : new LinkedHashMap<>(cap, lf); break;
        case "Hashtable": coll = cap < 0 ? new Hashtable<>() : new Hashtable<>(cap, lf); break;
        case "TreeMap": coll = c == null ? new TreeMap<>() : new TreeMap<>(c); break;
        case "ConcurrentHashMap": coll = cap < 0 ? new ConcurrentHashMap<>() : new ConcurrentHashMap<>(cap); break;
        case "HashSet": coll = cap < 0 ? new HashSet<>() : new HashSet<>(cap, lf); break;
        case "LinkedHashSet": coll = cap < 0 ? new LinkedHashSet<>() : new LinkedHashSet<>(cap, lf); break;
        case "TreeSet": coll = c == null ? new TreeSet<>() : new TreeSet<>(c); break;
        default: throw new IllegalArgumentException("unknown kind: " + kind);
      }
    }
    List<Object> trace = new ArrayList<>();
    if (a.has("ops")) {
      for (JsonNode op : a.get("ops")) {
        String name = op.get(0).asText();
        Map<String, Object> step = new LinkedHashMap<>();
        step.put("op", op.toString());
        try {
          Object k = op.size() > 1 ? key(kt, op.get(1)) : null;
          Object r;
          switch (name) {
            case "put": r = isMap ? ((Map) coll).put(k, op.size() > 2 ? op.get(2).asText() : "v") : (Object) ((Collection) coll).add(k); break;
            case "putIfAbsent": r = ((Map) coll).putIfAbsent(k, "w"); break;
            case "remove": r = isMap ? ((Map) coll).remove(k) : (Object) ((Collection) coll).remove(k); break;
            case "get": r = ((Map) coll).get(k); break;
            case "contains": r = isMap ? ((Map) coll).containsKey(k) : (Object) ((Collection) coll).contains(k); break;
            case "clear": if (isMap) ((Map) coll).clear(); else ((Collection) coll).clear(); r = null; break;
            case "firstKey": r = ((TreeMap) coll).firstKey(); break;
            case "first": r = ((TreeSet) coll).first(); break;
            case "floor": r = isMap ? ((TreeMap) coll).floorKey(k) : ((TreeSet) coll).floor(k); break;
            case "ceiling": r = isMap ? ((TreeMap) coll).ceilingKey(k) : ((TreeSet) coll).ceiling(k); break;
            case "size": r = isMap ? ((Map) coll).size() : ((Collection) coll).size(); break;
            default: throw new IllegalArgumentException("unknown op: " + name);
          }
          step.put("result", Probe.repr(r));
        } catch (Throwable e) {
          step.put("error", e.getClass().getName() + ": " + e.getMessage());
        }
        trace.add(step);
      }
    } else {
      for (JsonNode k : a.get("keys")) {
        if (isMap) ((Map) coll).put(key(kt, k), "v" + trace.size());
        else ((Collection) coll).add(key(kt, k));
        trace.add(null);
      }
    }
    Map<String, Object> m = new LinkedHashMap<>();
    if (a.has("ops")) m.put("trace", trace);
    if (isMap) {
      Map<Object, Object> mm = (Map<Object, Object>) coll;
      m.put("keys", Probe.repr(new ArrayList<>(mm.keySet())));
      m.put("values", Probe.repr(new ArrayList<>(mm.values())));
      m.put("toString", mm.toString());
      m.put("size", mm.size());
      m.put("hashCode", mm.hashCode());
      if (mm instanceof Hashtable) {
        List<Object> en = new ArrayList<>();
        for (Enumeration<?> e = ((Hashtable<Object, Object>) mm).keys(); e.hasMoreElements();) en.add(Probe.repr(e.nextElement()));
        m.put("keysEnumeration", en);
      }
    } else {
      Set<Object> ss = (Set<Object>) coll;
      m.put("keys", Probe.repr(new ArrayList<>(ss)));
      m.put("toString", ss.toString());
      m.put("size", ss.size());
      m.put("hashCode", ss.hashCode());
    }
    return m;
  }

  private static Object properties(JsonNode a) throws Exception {
    Charset cs = Charset.forName(a.has("charset") ? a.get("charset").asText() : "ISO-8859-1");
    String text = a.get("text").asText();
    Properties p = new Properties();
    boolean reader = a.has("reader") && a.get("reader").asBoolean();
    if (reader) p.load(new StringReader(text));
    else p.load(new ByteArrayInputStream(text.getBytes(cs)));
    Map<String, Object> m = new LinkedHashMap<>();
    List<Object> keys = new ArrayList<>();
    for (Object k : p.keySet()) keys.add(k);
    m.put("keys", keys.stream().map(k -> Probe.units2((String) k)).toArray());
    List<Object> entries = new ArrayList<>();
    for (Map.Entry<Object, Object> e : p.entrySet()) {
      entries.add(Arrays.asList(Probe.units2((String) e.getKey()), Probe.units2((String) e.getValue())));
    }
    m.put("entries", entries);
    List<Object> names = new ArrayList<>(new TreeSet<>(p.stringPropertyNames()));
    m.put("stringPropertyNames", names);
    List<Object> en = new ArrayList<>();
    for (Enumeration<?> e = p.propertyNames(); e.hasMoreElements();) en.add(e.nextElement());
    m.put("propertyNames", en);
    m.put("size", p.size());
    if (a.has("get")) {
      List<Object> g = new ArrayList<>();
      for (JsonNode k : a.get("get")) g.add(p.getProperty(k.asText()));
      m.put("get", g);
    }
    return m;
  }

  @SuppressWarnings({"unchecked", "rawtypes"})
  private static Object sort(JsonNode a) {
    String type = a.get("type").asText();
    String how = a.has("how") ? a.get("how").asText() : "list";
    Map<String, Object> m = new LinkedHashMap<>();
    if (type.equals("doublePrim")) {
      double[] d = new double[a.get("values").size()];
      for (int i = 0; i < d.length; i++) d[i] = Double.parseDouble(a.get("values").get(i).asText());
      Arrays.sort(d);
      m.put("sorted", Probe.repr(d));
      return m;
    }
    List<Object> l = new ArrayList<>();
    for (JsonNode v : a.get("values")) l.add(key(type, v));
    Comparator<Object> c = cmp(Probe.str(a, "cmp"));
    switch (how) {
      case "list": if (c == null) Collections.sort((List) l); else l.sort(c); break;
      case "array": { Object[] arr = l.toArray(); if (c == null) Arrays.sort(arr); else Arrays.sort(arr, c); l = Arrays.asList(arr); break; }
      case "stream": l = new ArrayList<>(c == null ? l.stream().sorted().toList() : l.stream().sorted(c).toList()); break;
      case "max": { Map<String, Object> r = new LinkedHashMap<>(); r.put("max", Probe.repr(c == null ? Collections.max((Collection) l) : Collections.max(l, c))); r.put("min", Probe.repr(c == null ? Collections.min((Collection) l) : Collections.min(l, c))); return r; }
      default: throw new IllegalArgumentException("unknown how: " + how);
    }
    m.put("sorted", Probe.repr(l));
    return m;
  }

  private static Object random(JsonNode a) {
    Random r = new Random(Long.parseLong(a.get("seed").asText()));
    List<Object> out = new ArrayList<>();
    for (JsonNode cn : a.get("calls")) {
      String[] p = cn.asText().split(":");
      Map<String, Object> step = new LinkedHashMap<>();
      step.put("call", cn.asText());
      try {
        Object v;
        switch (p[0]) {
          case "nextInt":
            v = p.length == 1 ? r.nextInt() : p.length == 2 ? r.nextInt(Integer.parseInt(p[1])) : r.nextInt(Integer.parseInt(p[1]), Integer.parseInt(p[2]));
            break;
          case "nextLong": v = p.length == 1 ? r.nextLong() : r.nextLong(Long.parseLong(p[1])); break;
          case "nextDouble": v = r.nextDouble(); break;
          case "nextFloat": v = r.nextFloat(); break;
          case "nextBoolean": v = r.nextBoolean(); break;
          case "nextGaussian": v = r.nextGaussian(); break;
          case "nextBytes": { byte[] b = new byte[Integer.parseInt(p[1])]; r.nextBytes(b); v = b; break; }
          case "setSeed": r.setSeed(Long.parseLong(p[1])); v = null; break;
          case "ints": v = r.ints(Long.parseLong(p[1]), Integer.parseInt(p[2]), Integer.parseInt(p[3])).boxed().toList(); break;
          case "doubles": v = r.doubles(Long.parseLong(p[1])).boxed().toList(); break;
          default: throw new IllegalArgumentException("unknown call: " + p[0]);
        }
        step.put("value", Probe.repr(v));
      } catch (Throwable e) {
        step.put("error", e.getClass().getName() + ": " + e.getMessage());
      }
      out.add(step);
    }
    return out;
  }

  private static Object shuffle(JsonNode a) {
    List<String> l = Probe.strings(a.get("list"));
    Collections.shuffle(l, new Random(Long.parseLong(a.get("seed").asText())));
    return l;
  }

  private static Object scanner(JsonNode a) throws Exception {
    String text = a.get("text").asText();
    String mode = a.has("mode") ? a.get("mode").asText() : "lines";
    Map<String, Object> m = new LinkedHashMap<>();
    Charset cs = Charset.forName("UTF-8");
    if (mode.equals("lines")) {
      List<Object> lines = new ArrayList<>();
      try (Scanner sc = new Scanner(new ByteArrayInputStream(text.getBytes(cs)))) {
        while (sc.hasNextLine()) lines.add(Probe.units2(sc.nextLine()));
      }
      m.put("scannerLines", lines);
      List<Object> rl = new ArrayList<>();
      try (BufferedReader br = new BufferedReader(new StringReader(text))) {
        String s;
        while ((s = br.readLine()) != null) rl.add(Probe.units2(s));
      }
      m.put("readerLines", rl);
      List<Object> sl = new ArrayList<>();
      text.lines().forEach(s -> sl.add(Probe.units2(s)));
      m.put("stringLines", sl);
    } else if (mode.equals("tokens")) {
      List<Object> toks = new ArrayList<>();
      try (Scanner sc = new Scanner(text)) {
        while (sc.hasNext()) toks.add(Probe.units2(sc.next()));
      }
      m.put("tokens", toks);
    } else if (mode.equals("intThenLine")) {
      try (Scanner sc = new Scanner(text)) {
        m.put("int", sc.nextInt());
        m.put("restOfLine", Probe.units2(sc.nextLine()));
        m.put("hasNextLine", sc.hasNextLine());
        m.put("nextLine", sc.hasNextLine() ? Probe.units2(sc.nextLine()) : null);
      }
    } else {
      throw new IllegalArgumentException("unknown mode: " + mode);
    }
    return m;
  }

  @SuppressWarnings({"unchecked", "rawtypes"})
  private static Object pq(JsonNode a) {
    String type = a.has("type") ? a.get("type").asText() : "int";
    Comparator<Object> c = cmp(Probe.str(a, "cmp"));
    PriorityQueue<Object> q = c == null ? new PriorityQueue<>() : new PriorityQueue<>(c);
    List<Object> trace = new ArrayList<>();
    for (JsonNode op : a.get("ops")) {
      String name = op.get(0).asText();
      Map<String, Object> step = new LinkedHashMap<>();
      step.put("op", op.toString());
      try {
        switch (name) {
          case "offer": q.offer(key(type, op.get(1))); break;
          case "poll": step.put("value", Probe.repr(q.poll())); break;
          case "remove": step.put("value", q.remove(key(type, op.get(1)))); break;
          case "peek": step.put("value", Probe.repr(q.peek())); break;
          default: throw new IllegalArgumentException("unknown op: " + name);
        }
        step.put("order", Probe.repr(new ArrayList<>(q)));
      } catch (Throwable e) {
        step.put("error", e.getClass().getName() + ": " + e.getMessage());
      }
      trace.add(step);
    }
    return trace;
  }

  @SuppressWarnings({"unchecked", "rawtypes"})
  private static Object list(JsonNode a) {
    String kind = a.has("kind") ? a.get("kind").asText() : "ArrayList";
    List<String> init = a.has("init") ? Probe.strings(a.get("init")) : new ArrayList<>();
    List<String> l;
    switch (kind) {
      case "ArrayList": l = new ArrayList<>(init); break;
      case "LinkedList": l = new LinkedList<>(init); break;
      case "Arrays.asList": l = Arrays.asList(init.toArray(new String[0])); break;
      case "List.of": l = List.of(init.toArray(new String[0])); break;
      case "unmodifiable": l = Collections.unmodifiableList(new ArrayList<>(init)); break;
      case "emptyList": l = Collections.emptyList(); break;
      case "singletonList": l = Collections.singletonList(init.get(0)); break;
      default: throw new IllegalArgumentException("unknown kind: " + kind);
    }
    List<Object> trace = new ArrayList<>();
    for (JsonNode op : a.get("ops")) {
      String name = op.get(0).asText();
      Map<String, Object> step = new LinkedHashMap<>();
      step.put("op", op.toString());
      try {
        Object r = null;
        switch (name) {
          case "add": r = l.add(op.get(1).isNull() ? null : op.get(1).asText()); break;
          case "addAt": l.add(op.get(1).asInt(), op.get(2).asText()); break;
          case "get": r = l.get(op.get(1).asInt()); break;
          case "set": r = l.set(op.get(1).asInt(), op.get(2).asText()); break;
          case "removeAt": r = l.remove(op.get(1).asInt()); break;
          case "removeObj": r = l.remove(op.get(1).asText()); break;
          case "indexOf": r = l.indexOf(op.get(1).isNull() ? null : op.get(1).asText()); break;
          case "contains": r = l.contains(op.get(1).isNull() ? null : op.get(1).asText()); break;
          case "subList": r = new ArrayList<>(l.subList(op.get(1).asInt(), op.get(2).asInt())); break;
          case "clear": l.clear(); break;
          case "sortNatural": l.sort(null); break;
          case "iterRemove": for (String s : l) if (s.equals(op.get(1).asText())) l.remove(s); break;
          case "addAll": r = l.addAll(Probe.strings(op.get(1))); break;
          case "removeIf": r = l.removeIf(s -> s != null && s.equals(op.get(1).asText())); break;
          case "toArray": r = Arrays.asList(l.toArray()); break;
          default: throw new IllegalArgumentException("unknown op: " + name);
        }
        step.put("result", Probe.repr(r));
        step.put("toString", l.toString());
        step.put("hashCode", l.hashCode());
      } catch (Throwable e) {
        step.put("error", e.getClass().getName() + ": " + e.getMessage());
      }
      trace.add(step);
    }
    return trace;
  }
}
