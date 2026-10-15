import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRouteSync } from '../js/route-sync.js';

function bus() {
  const listeners = new Map();
  return {
    addEventListener(type, fn) {
      listeners.set(type, fn);
    },
    removeEventListener(type, fn) {
      if (listeners.get(type) === fn) listeners.delete(type);
    },
    emit(type, event = {}) {
      listeners.get(type)?.(event);
    },
  };
}

test('createRouteSync requires a hash reader and a route handler', () => {
  assert.throws(() => createRouteSync({ onRoute() {} }), /getHash/);
  assert.throws(() => createRouteSync({ getHash: () => '#' }), /onRoute/);
});

test('popstate and hashchange for one hash notify once', () => {
  let hash = '#Learn';
  const calls = [];
  const target = bus();
  const sync = createRouteSync({
    getHash: () => hash,
    onRoute: (event) => calls.push(event),
    target,
    document: target,
  });
  sync.start();
  assert.equal(calls.length, 0);
  hash = '#Exam3';
  target.emit('popstate');
  target.emit('hashchange');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].hash, '#Exam3');
  assert.equal(calls[0].reason, 'popstate');
  assert.equal(calls[0].stale(), false);
  sync.stop();
  hash = '#Drill';
  target.emit('hashchange');
  assert.equal(calls.length, 1);
});

test('a same-hash click notifies once and the following hashchange does not', () => {
  let hash = '#Learn';
  const calls = [];
  const target = bus();
  const sync = createRouteSync({
    getHash: () => hash,
    onRoute: (event) => calls.push(event),
    target,
    document: target,
  });
  sync.start();
  let prevented = false;
  const link = {
    getAttribute: (name) => (name === 'href' ? '#Learn' : null),
    closest: () => link,
  };
  target.emit('click', {
    button: 0,
    target: link,
    preventDefault() { prevented = true; },
  });
  assert.equal(prevented, true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].reason, 'same-hash');
  target.emit('hashchange');
  assert.equal(calls.length, 1);
  hash = '#Map';
  target.emit('hashchange');
  assert.equal(calls.length, 2);
  assert.equal(calls[1].hash, '#Map');
});

test('a later route marks the earlier paint stale', () => {
  const calls = [];
  const sync = createRouteSync({
    getHash: () => '#Learn',
    onRoute: (event) => calls.push(event),
    target: bus(),
  });
  assert.equal(sync.publish('#Learn', 'start', true), true);
  assert.equal(sync.publish('#Learn', 'again', false), false);
  assert.equal(sync.publish('#Cards', 'next', false), true);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].stale(), true);
  assert.equal(calls[1].stale(), false);
  assert.equal(sync.current(), '#Cards');
});
