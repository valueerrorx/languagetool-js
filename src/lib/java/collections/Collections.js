// java.util.Collections unmodifiable/immutable views and Arrays#asList (fixed-size) over JS arrays and JavaHashSet.
import { UnsupportedOperationException, ArrayIndexOutOfBoundsException } from '../errors.js';

const LIST_MUTATORS = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin'];
const STRUCTURAL = ['push', 'pop', 'shift', 'unshift', 'splice'];
const SET_MUTATORS = ['add', 'addAll', 'remove', 'removeAll', 'retainAll', 'removeIf', 'clear'];

function uoe() {
  throw new UnsupportedOperationException();
}

function noop() {}

function isIndexProp(prop) {
  return typeof prop === 'string' && /^-?\d+$/.test(prop);
}

// asLenient: get/set outside the array throw ArrayIndexOutOfBoundsException (Arrays$ArrayList indexes the backing array)
function listView(list, blockedMethods, blockIndexSet, noopMethods = [], arrayIndexErrors = false) {
  return new Proxy(list, {
    get(target, prop) {
      if (noopMethods.includes(prop)) return noop;
      if (blockedMethods.includes(prop)) return uoe;
      if (arrayIndexErrors && isIndexProp(prop) && (Number(prop) >= target.length || Number(prop) < 0)) {
        throw new ArrayIndexOutOfBoundsException(`Index ${prop} out of bounds for length ${target.length}`);
      }
      const v = Reflect.get(target, prop, target);
      return typeof v === 'function' ? v.bind(target) : v;
    },
    set(target, prop, value) {
      if (prop === 'length' || blockIndexSet) uoe();
      if (isIndexProp(prop) && (Number(prop) >= target.length || Number(prop) < 0)) {
        if (arrayIndexErrors) throw new ArrayIndexOutOfBoundsException(`Index ${prop} out of bounds for length ${target.length}`);
        uoe();
      }
      return Reflect.set(target, prop, value);
    },
    deleteProperty: uoe,
    defineProperty: uoe,
  });
}

// Java: Collections#unmodifiableList(List)
export function unmodifiableList(list) {
  return listView(list, LIST_MUTATORS, true);
}

// Java: Collections#emptyList(); EmptyList#sort(Comparator) is a no-op
export function emptyList() {
  return listView([], LIST_MUTATORS, true, ['sort']);
}

// Java: Arrays#asList(Object[]) (fixed size, element set allowed)
export function asList(array) {
  return listView(array, STRUCTURAL, false, [], true);
}

// Java: Collections#unmodifiableSet(Set) / Collections#singleton(Object) (set = JavaHashSet)
export function unmodifiableSet(set) {
  return new Proxy(set, {
    get(target, prop) {
      if (SET_MUTATORS.includes(prop)) return uoe;
      const v = Reflect.get(target, prop, target);
      return typeof v === 'function' ? v.bind(target) : v;
    },
  });
}

// Java: Collections#shuffle(List,Random) for a RandomAccess list
export function shuffle(list, rnd) {
  for (let i = list.length; i > 1; i--) {
    const j = rnd.nextInt(i);
    const tmp = list[i - 1];
    list[i - 1] = list[j];
    list[j] = tmp;
  }
}
