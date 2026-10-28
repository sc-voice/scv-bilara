/**
 * Vitest setup: extends expect() with the SC-Voice matchers used by the tests.
 *
 * - `.properties()`: checks object properties, optionally with deep values
 * - function equality: functions with identical source text are equal
 */
import { expect } from 'vitest';

/**
 * Deep equality for plain values, used by `.properties({...})`.
 *
 * @param {*} a
 * @param {*} b
 * @returns {boolean}
 */
function deepEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return a === b;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return a === b;

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);

  if (keysA.length !== keysB.length) return false;

  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }

  return true;
}

/**
 * Usage:
 *   expect(obj).properties('a')
 *   expect(obj).properties(['a', 'b'])
 *   expect(obj).properties({ a: 1, b: 2 })
 */
expect.extend({
  properties(received, properties) {
    let propsToCheck = [];
    let propsToCheckValues = {};

    if (typeof properties === 'string') {
      propsToCheck = [properties];
    } else if (Array.isArray(properties)) {
      propsToCheck = properties;
    } else if (typeof properties === 'object' && properties !== null) {
      propsToCheck = Object.keys(properties);
      propsToCheckValues = properties;
    }

    const missing = [];
    const valuesMismatched = [];

    for (const prop of propsToCheck) {
      if (!(prop in received)) {
        missing.push(prop);
      } else if (Object.keys(propsToCheckValues).length > 0 && propsToCheckValues[prop] !== undefined) {
        if (!deepEqual(received[prop], propsToCheckValues[prop])) {
          valuesMismatched.push({
            prop,
            expected: propsToCheckValues[prop],
            actual: received[prop],
          });
        }
      }
    }

    const pass = missing.length === 0 && valuesMismatched.length === 0;

    return {
      pass,
      message: () => {
        let msg = '';
        if (missing.length > 0) {
          msg += `Missing properties: ${missing.join(', ')}`;
        }
        if (valuesMismatched.length > 0) {
          if (msg) msg += '; ';
          msg += 'Property value mismatches: ' + valuesMismatched
            .map((m) => `${m.prop} (expected ${JSON.stringify(m.expected)}, got ${JSON.stringify(m.actual)})`)
            .join(', ');
        }
        return `Expected object to have properties, but ${msg}`;
      },
    };
  },
});

/**
 * Functions with identical source code compare equal.
 *
 * @param {*} a
 * @param {*} b
 * @returns {boolean|undefined} undefined defers to vitest's default equality
 */
function functionEqualityTester(a, b) {
  if (typeof a === 'function' && typeof b === 'function') {
    return a.toString() === b.toString();
  }
  return undefined;
}

expect.addEqualityTesters([functionEqualityTester]);
