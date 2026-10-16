// java.util.Collections unmodifiable/immutable views and Arrays#asList (fixed-size) over JS arrays and JavaHashSet.
import { UnsupportedOperationException } from '../errors.js';

const LIST_MUTATORS = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse', 'fill', 'copyWithin'];
const STRUCTURAL = ['push', 'pop', 'shift', 'unshift', 'splice'];
const SET_MUTATORS = ['add', 'addAll', 'remove', 'removeAll', 'retainAll', 'removeIf', 'clear'];

function uoe() {
  throw new UnsupportedOperationException();
}

function listView(list, blockedMethods, blockIndexSet) {
  return new Proxy(list, {
    get(target, prop) {
      if (blockedMethods.includes(prop)) return uoe;
      const v = Reflect.get(target, prop, target);
      return typeof v === 'function' ? v.bind(target) : v;
    },
    set(target, prop, value) {
      if (prop === 'length' || blockIndexSet) uoe();
      if (typeof prop === 'string' && /^\d+$/.test(prop) && Number(prop) >= target.length) uoe();
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

// Java: Collections#emptyList()
export function emptyList() {
  return listView([], LIST_MUTATORS, true);
}

// Java: Arrays#asList(Object[]) (fixed size, element set allowed)
export function asList(array) {
  return listView(array, STRUCTURAL, false);
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
