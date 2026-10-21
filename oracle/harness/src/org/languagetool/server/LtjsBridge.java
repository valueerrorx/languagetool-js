package org.languagetool.server;

import com.fasterxml.jackson.databind.JsonNode;
import org.apache.commons.lang3.exception.ExceptionUtils;
import org.languagetool.*;
import org.languagetool.rules.CategoryId;
import org.languagetool.tools.LtThreadPoolFactory;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import java.io.IOException;

/**
 * Oracle bridge into package-private server classes (X-SRV-EXEC): UserLimits, LimitEnforcementMode,
 * PipelineSettings, PipelinePool/Pipeline, LtThreadPoolFactory. Lives outside the original sources.
 */
public class LtjsBridge {

  private static Map<String, Object> err(Throwable t) {
    Map<String, Object> e = new LinkedHashMap<>();
    e.put("class", t.getClass().getName());
    e.put("message", t.getMessage());
    return e;
  }

  /** config: {props:{k:v}, args:[...]} -> HTTPServerConfig parsed from a temporary properties file (like --config). */
  static HTTPServerConfig config(JsonNode c) throws Exception {
    File f = File.createTempFile("ltjs-srv", ".properties");
    f.deleteOnExit();
    StringBuilder sb = new StringBuilder();
    if (c != null && c.has("props")) {
      Iterator<Map.Entry<String, JsonNode>> it = c.get("props").fields();
      while (it.hasNext()) { Map.Entry<String, JsonNode> e = it.next(); sb.append(e.getKey()).append('=').append(e.getValue().asText()).append('\n'); }
    }
    try (Writer w = new OutputStreamWriter(new FileOutputStream(f), StandardCharsets.UTF_8)) { w.write(sb.toString()); }
    List<String> args = new ArrayList<>(Arrays.asList("--config", f.getAbsolutePath()));
    if (c != null && c.has("args")) for (JsonNode n : c.get("args")) args.add(n.asText());
    HTTPServerConfig cfg = new HTTPServerConfig(args.toArray(new String[0]));
    DatabaseAccess.init(cfg); // like HTTPServer.main
    return cfg;
  }

  /** {config, cases:[{params:{}, authHeader?}]} -> per case limits or error */
  public static Object userLimits(JsonNode a) throws Exception {
    HTTPServerConfig cfg = config(a.get("config"));
    List<Object> out = new ArrayList<>();
    for (JsonNode c : a.get("cases")) {
      Map<String, String> params = new LinkedHashMap<>();
      Iterator<Map.Entry<String, JsonNode>> it = c.get("params").fields();
      while (it.hasNext()) { Map.Entry<String, JsonNode> e = it.next(); params.put(e.getKey(), e.getValue().asText()); }
      String auth = c.has("authHeader") ? c.get("authHeader").asText() : null;
      Map<String, Object> r = new LinkedHashMap<>();
      try {
        UserLimits l;
        if (c.path("direct").asText("").equals("whitelist")) {
          // private fallback of the DB lookups (unreachable over HTTP in the open-source build): invoked by reflection
          java.lang.reflect.Method m = UserLimits.class.getDeclaredMethod("getUserLimitsFromWhitelistOrDefault", HTTPServerConfig.class, String.class);
          m.setAccessible(true);
          try { l = (UserLimits) m.invoke(null, cfg, params.get("username")); } catch (java.lang.reflect.InvocationTargetException e) { throw e.getCause(); }
        } else {
          l = ServerTools.getUserLimits(params, cfg, auth);
        }
        r.put("maxTextLength", l.getMaxTextLength());
        r.put("maxCheckTimeMillis", l.getMaxCheckTimeMillis());
        r.put("hasPremium", l.hasPremium());
        r.put("premiumUid", l.getPremiumUid());
        r.put("skipLimits", l.getSkipLimits());
        r.put("dictCacheSize", l.getDictCacheSize());
        r.put("requestsPerDay", l.getRequestsPerDay());
        r.put("limitEnforcementMode", l.getLimitEnforcementMode().name());
        r.put("toString", l.toString());
      } catch (Throwable t) {
        r.put("error", err(t));
      }
      out.add(r);
    }
    return out;
  }

  /** {values:[null|int]} -> [{name,id,stderr}] */
  public static Object limitMode(JsonNode a) {
    List<Object> out = new ArrayList<>();
    PrintStream oldErr = System.err;
    try {
      for (JsonNode v : a.get("values")) {
        ByteArrayOutputStream bos = new ByteArrayOutputStream();
        System.setErr(new PrintStream(bos, true, "UTF-8"));
        Integer value = v.isNull() ? null : v.asInt();
        LimitEnforcementMode m = LimitEnforcementMode.parse(value);
        System.err.flush();
        Map<String, Object> r = new LinkedHashMap<>();
        r.put("input", value);
        r.put("name", m.name());
        r.put("id", m.getId());
        r.put("stderr", bos.toString("UTF-8"));
        out.add(r);
      }
    } catch (UnsupportedEncodingException e) {
      throw new RuntimeException(e);
    } finally {
      System.setErr(oldErr);
    }
    return out;
  }

  static List<String> strings(JsonNode n) {
    List<String> l = new ArrayList<>();
    if (n != null) for (JsonNode x : n) l.add(x.asText());
    return l;
  }

  static Language lang(JsonNode n) {
    return n == null || n.isNull() ? null : Languages.getLanguageForShortCode(n.asText());
  }

  static PipelineSettings settings(JsonNode s) {
    JsonNode q = s.has("query") ? s.get("query") : com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode();
    List<Language> alt = new ArrayList<>();
    if (q.has("altLanguages")) for (JsonNode n : q.get("altLanguages")) alt.add(Languages.getLanguageForShortCode(n.asText()));
    List<CategoryId> en = new ArrayList<>();
    for (String x : strings(q.get("enabledCategories"))) en.add(new CategoryId(x));
    List<CategoryId> dis = new ArrayList<>();
    for (String x : strings(q.get("disabledCategories"))) dis.add(new CategoryId(x));
    TextChecker.QueryParams qp = new TextChecker.QueryParams(alt, strings(q.get("enabledRules")), strings(q.get("disabledRules")), en, dis,
      q.path("useEnabledOnly").asBoolean(false), q.path("useQuerySettings").asBoolean(false), q.path("allowIncompleteResults").asBoolean(false),
      q.path("enableHiddenRules").asBoolean(false), q.path("premium").asBoolean(false), q.path("enableTempOffRules").asBoolean(false),
      JLanguageTool.Mode.valueOf(q.path("mode").asText("ALL")), JLanguageTool.Level.valueOf(q.path("level").asText("DEFAULT")),
      q.has("callback") && !q.get("callback").isNull() ? q.get("callback").asText() : null, q.path("inputLogging").asBoolean(true));
    JsonNode u = s.has("user") ? s.get("user") : com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode();
    Map<String, Object[]> rv = new HashMap<>();
    if (u.has("ruleValues")) {
      Iterator<Map.Entry<String, JsonNode>> it = u.get("ruleValues").fields();
      while (it.hasNext()) {
        Map.Entry<String, JsonNode> e = it.next();
        List<Object> vals = new ArrayList<>();
        for (JsonNode x : e.getValue()) vals.add(x.isInt() ? (Object) x.asInt() : x.isBoolean() ? (Object) x.asBoolean() : x.asText());
        rv.put(e.getKey(), vals.toArray());
      }
    }
    UserConfig uc = new UserConfig(strings(u.get("words")), Collections.emptyList(), rv, u.path("maxSpellingSuggestions").asInt(0),
      u.has("premiumUid") && !u.get("premiumUid").isNull() ? u.get("premiumUid").asLong() : null,
      u.has("dictName") && !u.get("dictName").isNull() ? u.get("dictName").asText() : null, null, null,
      u.path("filterDictionaryMatches").asBoolean(false), u.has("abTest") ? strings(u.get("abTest")) : null, null,
      u.path("hidePremiumMatches").asBoolean(false), strings(u.get("preferredLanguages")), u.path("trustedSource").asBoolean(false),
      u.path("optInThirdPartyAI").asBoolean(false), u.path("isPremium").asBoolean(false), UserConfig.TokenType.valueOf(u.path("tokenType").asText("NO_TOKEN")));
    GlobalConfig gc = new GlobalConfig();
    if (s.has("global") && s.get("global").has("grammalecteServer")) gc.setGrammalecteServer(s.get("global").get("grammalecteServer").asText());
    return new PipelineSettings(lang(s.get("lang")), lang(s.get("motherTongue")), qp, gc, uc);
  }

  /** {settings:[...]} -> equals/hashCode matrices (hashCode compared for equality only) */
  public static Object pipelineSettings(JsonNode a) {
    List<PipelineSettings> ss = new ArrayList<>();
    for (JsonNode s : a.get("settings")) ss.add(settings(s));
    List<Object> eq = new ArrayList<>();
    List<Object> hc = new ArrayList<>();
    for (PipelineSettings x : ss) {
      List<Boolean> er = new ArrayList<>();
      List<Boolean> hr = new ArrayList<>();
      for (PipelineSettings y : ss) { er.add(x.equals(y)); hr.add(x.hashCode() == y.hashCode()); }
      eq.add(er); hc.add(hr);
    }
    Map<String, Object> r = new LinkedHashMap<>();
    r.put("equals", eq);
    r.put("hashEqual", hc);
    return r;
  }

  /**
   * {config, steps:[{op:get|return|mutate|view|check|sleep, name, settings, method, text, ms}]}
   * Pipeline identity is reported as the names of earlier pipelines that are the same object.
   */
  public static Object pipelinePool(JsonNode a) throws Exception {
    HTTPServerConfig cfg = config(a.get("config"));
    PipelinePool pool = new PipelinePool(cfg, null, false);
    Map<String, Pipeline> named = new LinkedHashMap<>();
    Map<String, PipelineSettings> settingsOf = new HashMap<>();
    List<Object> out = new ArrayList<>();
    for (JsonNode st : a.get("steps")) {
      String op = st.get("op").asText();
      String name = st.has("name") ? st.get("name").asText() : null;
      Map<String, Object> r = new LinkedHashMap<>();
      r.put("op", op);
      if (name != null) r.put("name", name);
      try {
        switch (op) {
          case "get": {
            PipelineSettings s = settings(st.get("settings"));
            Pipeline p = pool.getPipeline(s);
            List<String> same = new ArrayList<>();
            for (Map.Entry<String, Pipeline> e : named.entrySet()) if (e.getValue() == p) same.add(e.getKey());
            named.put(name, p);
            settingsOf.put(name, s);
            r.put("sameAs", same);
            try { p.setMaxErrorsPerWordRate(0f); r.put("frozen", false); } catch (Pipeline.IllegalPipelineMutationException e) { r.put("frozen", true); r.put("message", e.getMessage()); }
            break;
          }
          case "return":
            pool.returnPipeline(settingsOf.get(name), named.get(name));
            r.put("returned", true);
            break;
          case "mutate": {
            Pipeline p = named.get(name);
            String m = st.get("method").asText();
            switch (m) {
              case "setCleanOverlappingMatches": p.setCleanOverlappingMatches(true); break;
              case "setMaxErrorsPerWordRate": p.setMaxErrorsPerWordRate(0.5f); break;
              case "disableRule": p.disableRule("X_RULE"); break;
              case "disableRules": p.disableRules(Arrays.asList("X_RULE", "Y_RULE")); break;
              case "disableCategory": p.disableCategory(new CategoryId("X_CAT")); break;
              case "enableRule": p.enableRule("X_RULE"); break;
              case "enableRuleCategory": p.enableRuleCategory(new CategoryId("X_CAT")); break;
              case "addRule": p.addRule(null); break;
              case "setOutput": p.setOutput(System.err); break;
              case "addMatchFilter": p.addMatchFilter(new org.languagetool.rules.RuleMatchFilter() { @Override public List<org.languagetool.rules.RuleMatch> filter(List<org.languagetool.rules.RuleMatch> ms, org.languagetool.markup.AnnotatedText t) { return ms; } }); break;
              default: throw new IllegalArgumentException("unknown mutator " + m);
            }
            r.put("method", m);
            r.put("mutated", true);
            break;
          }
          case "view": {
            Pipeline p = named.get(name);
            String m = st.get("method").asText();
            r.put("method", m);
            switch (m) {
              case "getDisabledRules.add": p.getDisabledRules().add("Z"); break;
              case "getAllRules.clear": p.getAllRules().clear(); break;
              case "getAllActiveRules.clear": p.getAllActiveRules().clear(); break;
              case "getCategories.clear": p.getCategories().clear(); break;
              case "getUnknownWords.clear": p.getUnknownWords().clear(); break;
              default: throw new IllegalArgumentException("unknown view " + m);
            }
            r.put("modified", true);
            break;
          }
          case "check": {
            Pipeline p = named.get(name);
            List<Object> ms = new ArrayList<>();
            for (org.languagetool.rules.RuleMatch rm : p.check(st.get("text").asText())) {
              Map<String, Object> m = new LinkedHashMap<>();
              m.put("rule", rm.getRule().getFullId()); m.put("from", rm.getFromPos()); m.put("to", rm.getToPos());
              ms.add(m);
            }
            r.put("matches", ms);
            break;
          }
          case "sleep": Thread.sleep(st.get("ms").asLong()); break;
          default: throw new IllegalArgumentException("unknown step " + op);
        }
      } catch (Throwable t) {
        r.put("error", err(t));
      }
      out.add(r);
    }
    return out;
  }

  /**
   * {pool:{identifier, corePool, maxThreads, queue, keepAlive, short?, reuse?}, tasks:n}
   * n blocking tasks are submitted, the pool state is read while all are blocked, then released.
   */
  public static Object threadPool(JsonNode a) throws Exception {
    JsonNode p = a.get("pool");
    String id = p.get("identifier").asText();
    Thread.UncaughtExceptionHandler h = (t, e) -> { };
    ThreadPoolExecutor ex;
    if (p.path("short").asBoolean(false)) {
      ex = LtThreadPoolFactory.createFixedThreadPoolExecutor(id, p.get("maxThreads").asInt(), p.get("queue").asInt(), false, h, p.path("reuse").asBoolean(false));
    } else {
      ex = LtThreadPoolFactory.createFixedThreadPoolExecutor(id, p.get("corePool").asInt(), p.get("maxThreads").asInt(), p.get("queue").asInt(),
        p.path("keepAlive").asLong(60), false, h, p.path("reuse").asBoolean(false));
    }
    Map<String, Object> r = new LinkedHashMap<>();
    int n = a.get("tasks").asInt();
    CountDownLatch gate = new CountDownLatch(1);
    CountDownLatch started = new CountDownLatch(Math.min(n, ex.getMaximumPoolSize()));
    Set<String> threadNames = ConcurrentHashMap.newKeySet();
    List<Object> submits = new ArrayList<>();
    List<Future<?>> futures = new ArrayList<>();
    for (int i = 0; i < n; i++) {
      Map<String, Object> s = new LinkedHashMap<>();
      s.put("task", i);
      try {
        futures.add(ex.submit(() -> {
          threadNames.add(Thread.currentThread().getName());
          started.countDown();
          try { gate.await(30, TimeUnit.SECONDS); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
        }));
        s.put("accepted", true);
      } catch (RejectedExecutionException e) {
        s.put("accepted", false);
        Map<String, Object> er = err(e);
        // identity hashes and the harness lambda name are not stable: keep the pool state part of the message
        er.put("message", String.valueOf(e.getMessage()).replaceAll("^Task .*? rejected from ", "Task <T> rejected from ").replaceAll("@[0-9a-f]+", "@<H>"));
        s.put("error", er);
      }
      submits.add(s);
      // let a started task occupy its thread before the next submit so that thread creation vs queueing is deterministic
      if (i < ex.getCorePoolSize()) { long t0 = System.currentTimeMillis(); while (threadNames.size() < i + 1 && System.currentTimeMillis() - t0 < 5000) Thread.sleep(5); }
    }
    r.put("submits", submits);
    r.put("poolSize", ex.getPoolSize());
    r.put("activeCount", ex.getActiveCount());
    r.put("queueSize", ex.getQueue().size());
    r.put("queueRemainingCapacity", ex.getQueue().remainingCapacity());
    r.put("queueClass", ex.getQueue().getClass().getName());
    r.put("corePoolSize", ex.getCorePoolSize());
    r.put("maximumPoolSize", ex.getMaximumPoolSize());
    r.put("keepAliveSeconds", ex.getKeepAliveTime(TimeUnit.SECONDS));
    r.put("poolClass", ex.getClass().getName());
    Optional<ThreadPoolExecutor> again = LtThreadPoolFactory.getFixedThreadPoolExecutor(id);
    r.put("lookupSame", again.isPresent() && again.get() == ex);
    gate.countDown();
    for (Future<?> f : futures) f.get(30, TimeUnit.SECONDS);
    ex.shutdown();
    r.put("terminated", ex.awaitTermination(30, TimeUnit.SECONDS));
    r.put("completedTaskCount", ex.getCompletedTaskCount());
    r.put("threadNames", new TreeSet<>(threadNames));
    Optional<ThreadPoolExecutor> unknown = LtThreadPoolFactory.getFixedThreadPoolExecutor("no-such-pool-" + id);
    r.put("unknownPoolFirstThreadName", unknown.isPresent() ? "default" : "none");
    return r;
  }

  /** Pipeline pool whose pipeline creation fails inside the check task (fault injection for the crash mapping, SRV-0139). */
  static class FaultyPool extends PipelinePool {
    private final String fault;
    private final String msg;
    private int calls = 0;

    FaultyPool(HTTPServerConfig config, String fault, String msg) {
      super(config, null, false);
      this.fault = fault;
      this.msg = msg;
    }

    @Override
    Pipeline createPipeline(Language lang, Language motherTongue, TextChecker.QueryParams params, GlobalConfig globalConfig,
                            UserConfig userConfig, List<String> disabledRuleIds) throws Exception {
      calls++;
      switch (fault) {
        case "runtime": throw new RuntimeException(msg);
        case "illegalArgument": throw new IllegalArgumentException(msg);
        case "io": throw new IOException(msg);
        case "npe": throw new NullPointerException();
        case "error": throw new AssertionError(msg);
        case "stackOverflow": throw new StackOverflowError();
        case "badRequest": throw new BadRequestException(msg);
        case "textTooLong": throw new TextTooLongException(msg);
        case "auth": throw new AuthException(msg);
        case "timeout": throw new TimeoutException(msg);
        case "unavailable": throw new UnavailableException(msg);
        case "pathNotFound": throw new PathNotFoundException(msg);
        case "errorRate": throw errorRate(msg);
        case "nestedBadRequest": throw new RuntimeException("outer", new BadRequestException(msg));
        case "nestedErrorRate": throw new RuntimeException("outer", errorRate(msg));
        case "nestedTimeout": throw new RuntimeException("outer", new TimeoutException(msg));
        case "nestedAuth": throw new RuntimeException("outer", new AuthException(msg));
        case "failOnce": if (calls == 1) throw new RuntimeException(msg); return super.createPipeline(lang, motherTongue, params, globalConfig, userConfig, disabledRuleIds);
        default: return super.createPipeline(lang, motherTongue, params, globalConfig, userConfig, disabledRuleIds);
      }
    }

    private static RuntimeException errorRate(String m) throws Exception {
      java.lang.reflect.Constructor<ErrorRateTooHighException> c = ErrorRateTooHighException.class.getDeclaredConstructor(String.class);
      c.setAccessible(true);
      return c.newInstance(m);
    }
  }

  /**
   * {config:{props,args:[--port N]}, fault, message, requests:[{params:{}}]}: a real HTTPServer inside the harness JVM whose pipeline
   * creation fails; the real request handler maps the exception to status/text. Response per request {status, body}.
   */
  public static Object crashServer(JsonNode a) throws Exception {
    HTTPServerConfig cfg = config(a.get("config"));
    HTTPServer server = new HTTPServer(cfg);
    java.lang.reflect.Field f = LanguageToolHttpHandler.class.getDeclaredField("textCheckerV2");
    f.setAccessible(true);
    TextChecker tc = (TextChecker) f.get(server.httpHandler);
    tc.pipelinePool = new FaultyPool(cfg, a.get("fault").asText(), a.path("message").asText("injected failure"));
    server.run();
    List<Object> out = new ArrayList<>();
    try {
      java.net.http.HttpClient client = java.net.http.HttpClient.newHttpClient();
      for (JsonNode r : a.get("requests")) {
        StringBuilder body = new StringBuilder();
        Iterator<Map.Entry<String, JsonNode>> it = r.get("params").fields();
        while (it.hasNext()) {
          Map.Entry<String, JsonNode> e = it.next();
          if (body.length() > 0) body.append('&');
          body.append(java.net.URLEncoder.encode(e.getKey(), "UTF-8")).append('=').append(java.net.URLEncoder.encode(e.getValue().asText(), "UTF-8"));
        }
        java.net.http.HttpRequest req = java.net.http.HttpRequest.newBuilder(java.net.URI.create("http://127.0.0.1:" + cfg.getPort() + r.path("path").asText("/v2/check")))
          .header("Content-Type", "application/x-www-form-urlencoded; charset=utf-8").POST(java.net.http.HttpRequest.BodyPublishers.ofString(body.toString())).build();
        Map<String, Object> res = new LinkedHashMap<>();
        try {
          java.net.http.HttpResponse<String> resp = client.send(req, java.net.http.HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
          res.put("status", resp.statusCode());
          String b = resp.body();
          if (b.startsWith("{")) res.put("json", new com.fasterxml.jackson.databind.ObjectMapper().readValue(b, Object.class)); // formatting of the JSON text is free
          else res.put("body", b);
        } catch (Throwable t) {
          res.put("error", err(t));
        }
        out.add(res);
      }
    } finally {
      server.stop();
    }
    return out;
  }
}
