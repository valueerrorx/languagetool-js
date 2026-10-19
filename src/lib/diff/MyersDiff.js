// java-diff-utils 4.12 (io.github.java-diff-utils) subset: DiffUtils.diff with MeyersDiff, Patch#getDeltas, DiffRowGenerator splitter
import { IllegalStateException, NullPointerException } from '../java/errors.js';
import { Pattern } from '../java/regex/Pattern.js';

export const DeltaType = Object.freeze({ INSERT: 'INSERT', DELETE: 'DELETE', CHANGE: 'CHANGE', EQUAL: 'EQUAL' });

// Java: com.github.difflib.algorithm.myers.PathNode
class PathNode {
  // Java: PathNode#PathNode(int,int,boolean,boolean,PathNode)
  constructor(i, j, snake, bootstrap, prev) {
    this.i = i;
    this.j = j;
    this.bootstrap = bootstrap;
    this.prev = snake ? prev : (prev === null ? null : prev.previousSnake());
    this.snake = snake;
  }

  // Java: PathNode#isSnake()
  isSnake() {
    return this.snake;
  }

  // Java: PathNode#isBootstrap()
  isBootstrap() {
    return this.bootstrap;
  }

  // Java: PathNode#previousSnake()
  previousSnake() {
    if (this.isBootstrap()) {
      return null;
    }
    if (!this.isSnake() && this.prev !== null) {
      return this.prev.previousSnake();
    }
    return this;
  }
}

// Java: MeyersDiff#buildPath(List,List,DiffAlgorithmListener)
function buildPath(orig, rev, equalizer) {
  if (orig === null || orig === undefined) throw new NullPointerException('original sequence is null');
  if (rev === null || rev === undefined) throw new NullPointerException('revised sequence is null');
  const N = orig.length;
  const M = rev.length;
  const MAX = N + M + 1;
  const size = 1 + 2 * MAX;
  const middle = Math.trunc(size / 2);
  const diagonal = new Array(size).fill(null);
  diagonal[middle + 1] = new PathNode(0, -1, true, true, null);
  for (let d = 0; d < MAX; d++) {
    for (let k = -d; k <= d; k += 2) {
      const kmiddle = middle + k;
      const kplus = kmiddle + 1;
      const kminus = kmiddle - 1;
      let prev;
      let i;
      if (k === -d || (k !== d && diagonal[kminus].i < diagonal[kplus].i)) {
        i = diagonal[kplus].i;
        prev = diagonal[kplus];
      } else {
        i = diagonal[kminus].i + 1;
        prev = diagonal[kminus];
      }
      diagonal[kminus] = null;
      let j = i - k;
      let node = new PathNode(i, j, false, false, prev);
      while (i < N && j < M && equalizer(orig[i], rev[j])) {
        i++;
        j++;
      }
      if (i !== node.i) {
        node = new PathNode(i, j, true, false, node);
      }
      diagonal[kmiddle] = node;
      if (i >= N && j >= M) {
        return diagonal[kmiddle];
      }
    }
    diagonal[middle + d - 1] = null;
  }
  throw new IllegalStateException('could not find a diff path');
}

// Java: MeyersDiff#buildRevision(PathNode,List,List) + DiffUtils#diff conversion of Change to Delta
function buildRevision(path, orig, rev) {
  let actualPath = path;
  const deltas = [];
  if (actualPath.isSnake()) {
    actualPath = actualPath.prev;
  }
  while (actualPath !== null && actualPath.prev !== null && actualPath.prev.j >= 0) {
    if (actualPath.isSnake()) {
      throw new IllegalStateException('bad diffpath: found snake when looking for diff');
    }
    const i = actualPath.i;
    const j = actualPath.j;
    actualPath = actualPath.prev;
    const ianchor = actualPath.i;
    const janchor = actualPath.j;
    let type;
    if (ianchor === i && janchor !== j) {
      type = DeltaType.INSERT;
    } else if (ianchor !== i && janchor === j) {
      type = DeltaType.DELETE;
    } else {
      type = DeltaType.CHANGE;
    }
    deltas.push({
      type,
      source: { position: ianchor, lines: orig.slice(ianchor, i) },
      target: { position: janchor, lines: rev.slice(janchor, j) },
    });
    if (actualPath.isSnake()) {
      actualPath = actualPath.prev;
    }
  }
  return deltas;
}

// Java: DiffUtils#diff(List,List,BiPredicate) then Patch#getDeltas() (sorted by source position)
export function diff(original, revised, equalizer) {
  const deltas = buildRevision(buildPath(original, revised, equalizer), original, revised);
  deltas.sort((a, b) => a.source.position - b.source.position);
  return deltas;
}

// Java: DiffRowGenerator#DEFAULT_EQUALIZER
export const DEFAULT_EQUALIZER = (a, b) => (a === null || a === undefined ? b === null || b === undefined : a === b);

const SPLIT_BY_WORD_PATTERN = Pattern.compile('\\s+|[,.\\[\\](){}/\\\\*+\\-#]');

// Java: DiffRowGenerator#splitStringPreserveDelimiter(String,Pattern)
function splitStringPreserveDelimiter(str, splitPattern) {
  const list = [];
  if (str !== null && str !== undefined) {
    const matcher = splitPattern.matcher(str);
    let pos = 0;
    while (matcher.find()) {
      if (pos < matcher.start()) {
        list.push(str.substring(pos, matcher.start()));
      }
      list.push(matcher.group());
      pos = matcher.end();
    }
    if (pos < str.length) {
      list.push(str.substring(pos));
    }
  }
  return list;
}

// Java: DiffRowGenerator#SPLITTER_BY_WORD
export const SPLITTER_BY_WORD = (line) => splitStringPreserveDelimiter(line, SPLIT_BY_WORD_PATTERN);
