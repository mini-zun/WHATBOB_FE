const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const appRoot = path.resolve(path.dirname(process.argv[1]), '..');
function load(file, modules = {}, globals = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(appRoot, file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    exports: module.exports, Error, Promise, AbortController,
    require(name) {
      assert.ok(name in modules, `Unexpected import: ${name}`);
      return modules[name];
    },
    ...globals,
  }, { filename: file });
  return module.exports;
}

function hooks() {
  const slots = [];
  let cursor, pending, dirty, component, props, output;
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
      return [slots[i], (value) => {
        const next = typeof value === 'function' ? value(slots[i]) : value;
        if (!Object.is(next, slots[i])) { slots[i] = next; dirty = true; }
      }];
    },
    useRef(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = { current: initial };
      return slots[i];
    },
    useEffect(fn, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((v, j) => !Object.is(v, slots[i].deps[j]))) {
        pending.push(() => {
          slots[i]?.cleanup?.();
          slots[i] = { deps, cleanup: fn() };
        });
      }
    },
    useCallback(fn, deps) {
      const i = cursor++;
      if (!slots[i] || deps.some((v, j) => !Object.is(v, slots[i].deps[j]))) slots[i] = { deps, fn };
      return slots[i].fn;
    },
  };
  const jsx = (type, props) => ({ type, props });
  function render(nextProps = props) {
    props = nextProps;
    let renders = 0;
    do {
      dirty = false; cursor = 0; pending = [];
      output = component(props);
      for (const run of pending) run();
      assert.ok(++renders < 20, 'Render loop');
    } while (dirty);
    return output;
  }
  return {
    modules: { react, 'react/jsx-runtime': { jsx, jsxs: jsx } },
    mount(fn, initialProps) { component = fn; return render(initialProps); },
    render,
    get output() { return output; },
    unmount() { for (const slot of slots) slot?.cleanup?.(); },
  };
}

const flow = load('src/lib/room-flow.ts');
const roomId = '12345678-1234-4123-8123-123456789abc';
const lobby = `/room/${roomId}`;
const questionPath = `${lobby}/ordersheet`;
const room = (status = 'ANSWERING', version = 1) => ({
  room_id: roomId, status: status === 'CANCELLED' ? 'WAITING' : 'IN_PROGRESS',
  is_member: true, my_role: 'MEMBER', state_version: version,
  current_round: { round_id: 10, round_no: 1, status },
  viewer_state: { round_id: 10, has_submitted_order_sheet: false },
});

test('only current unsubmitted participants enter; cancellation returns to lobby', () => {
  assert.equal(flow.getRoomDestination(room(), lobby), questionPath);
  assert.equal(flow.getRoomDestination(room(), questionPath), null);
  assert.equal(flow.getRoomDestination(room('ANSWERING_PAUSED'), lobby), null);
  assert.equal(flow.isAnsweringRound(room('ANSWERING_PAUSED')), true);
  assert.equal(flow.getRoomDestination(room('CANCELLED'), questionPath), lobby);
  assert.equal(flow.getRoomDestination({ ...room(), current_round: null }, questionPath), lobby);
  for (const update of [
    { is_member: false }, { status: 'CLOSED' },
    { viewer_state: { round_id: 9, has_submitted_order_sheet: false } },
    { viewer_state: { round_id: 10, has_submitted_order_sheet: true } },
  ]) assert.equal(flow.getRoomDestination({ ...room(), ...update }, lobby), null);
  assert.equal(flow.getRoomDestination(room(), `${lobby}/vote`), questionPath);
});

test('voting and result rounds move current participants to their screens', () => {
  const votePath = `${lobby}/vote`;
  const resultPath = `${lobby}/result`;
  for (const status of ['VOTING', 'VOTING_PAUSED']) {
    for (const path of [lobby, questionPath, resultPath]) {
      assert.equal(flow.getRoomDestination(room(status), path), votePath);
    }
    assert.equal(flow.getRoomDestination(room(status), votePath), null);
  }
  for (const path of [lobby, questionPath, votePath]) {
    assert.equal(flow.getRoomDestination(room('RESULT'), path), resultPath);
  }
  assert.equal(flow.getRoomDestination(room('RESULT'), resultPath), null);
  for (const path of ['/nearby_places', '/home', `${lobby}-other/result`]) {
    assert.equal(flow.getRoomDestination(room('RESULT'), path), null);
    assert.equal(flow.getRoomDestination(room('VOTING'), path), null);
  }
  for (const path of [votePath, resultPath]) {
    assert.equal(flow.getRoomDestination(room('CANCELLED'), path), lobby);
  }
  for (const update of [
    { is_member: false }, { status: 'CLOSED' },
    { viewer_state: { round_id: 9, has_submitted_order_sheet: true } },
  ]) assert.equal(flow.getRoomDestination({ ...room('VOTING'), ...update }, lobby), null);
  assert.equal(flow.getRoomScreenPathname(votePath), '/room/[roomId]/vote');
  assert.equal(flow.getRoomScreenPathname(resultPath), '/room/[roomId]/result');
  assert.equal(flow.getRoomScreenPathname(questionPath), '/room/[roomId]/ordersheet');
  assert.equal(flow.getRoomScreenPathname(lobby), '/room/[roomId]');
});

test('older room snapshots cannot roll back the current round', () => {
  const latest = room('ANSWERING_PAUSED', 5);
  assert.equal(flow.keepLatestRoom(latest, room('ANSWERING', 4)), latest);
  assert.equal(flow.keepLatestRoom(latest, latest), latest);
});

class ApiError extends Error {
  constructor(message, status, code) { super(message); this.status = status; this.code = code; }
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
async function settle(runtime) {
  await new Promise(setImmediate);
  return runtime.render();
}

function mountRoom() {
  const runtime = hooks();
  const requests = [], sockets = [], intervals = new Map(), timeouts = new Map();
  const appEvents = new Set(), visibilityEvents = new Set();
  let timerId = 0;
  const appState = {
    currentState: 'active',
    addEventListener(_name, fn) { appEvents.add(fn); return { remove: () => appEvents.delete(fn) }; },
  };
  const document = {
    visibilityState: 'visible',
    addEventListener(_name, fn) { visibilityEvents.add(fn); },
    removeEventListener(_name, fn) { visibilityEvents.delete(fn); },
  };
  class Socket {
    static OPEN = 1;
    readyState = 0;
    sent = [];
    constructor() { sockets.push(this); }
    send(data) { this.sent.push(JSON.parse(data)); }
    close() { this.readyState = 3; this.onclose?.({ code: 1000 }); }
    open() { this.readyState = 1; this.onopen(); }
    message(message) { this.onmessage({ data: JSON.stringify(message) }); }
  }
  const { useRoom } = load('src/hooks/useRoom.ts', {
    ...runtime.modules, 'react-native': { AppState: appState },
    '@/lib/api': { ApiError, getAccessToken: () => 'test-token', handleUnauthorized: () => {} },
    '@/lib/room-flow': flow,
    '@/lib/rooms': {
      getRoom(_id, signal) { const request = { ...deferred(), signal }; requests.push(request); return request.promise; },
      roomSocketUrl: () => 'ws://test/room',
    },
  }, {
    document, WebSocket: Socket,
    setInterval(fn, ms) { const id = ++timerId; intervals.set(id, { fn, ms }); return id; },
    clearInterval: id => intervals.delete(id),
    setTimeout(fn, ms) { const id = ++timerId; timeouts.set(id, { fn, ms }); return id; },
    clearTimeout: id => timeouts.delete(id),
  });
  runtime.mount(() => useRoom(roomId));
  return { runtime, requests, sockets, intervals, timeouts, appEvents, visibilityEvents, appState, document };
}

test('socket readiness and duplicate notifications queue refresh; stale in-flight GET is discarded', async () => {
  const h = mountRoom();
  h.requests[0].resolve(room('ANSWERING', 1)); await settle(h.runtime);
  const ws = h.sockets[0]; ws.open();
  assert.equal(ws.sent[0].type, 'auth');
  ws.message({ type: 'connection.ready', room_id: roomId });
  ws.message({ type: 'room.updated', room_id: roomId, state_version: 3 });
  ws.message({ type: 'room.updated', room_id: roomId, state_version: 3 });
  assert.equal(h.requests.length, 2);
  h.requests[1].resolve(room('ANSWERING', 2)); await settle(h.runtime);
  assert.equal(h.runtime.output.room.state_version, 1);
  assert.equal(h.requests.length, 3);
  h.requests[2].resolve(room('ANSWERING_PAUSED', 3)); await settle(h.runtime);
  assert.equal(h.runtime.output.room.current_round.status, 'ANSWERING_PAUSED');
  h.runtime.unmount();
  assert.equal(h.intervals.size, 0);
  assert.equal(h.appEvents.size, 0);
  assert.equal(h.visibilityEvents.size, 0);
});

test('visible polling and foreground recovery work without a socket notification', async () => {
  const h = mountRoom();
  h.requests[0].resolve(room()); await settle(h.runtime);
  const poll = [...h.intervals.values()].find(t => t.ms === 5000).fn;
  h.document.visibilityState = 'hidden'; poll(); assert.equal(h.requests.length, 1);
  h.document.visibilityState = 'visible';
  for (const fn of [...h.visibilityEvents]) fn();
  assert.equal(h.requests.length, 2);
  h.requests[1].resolve(room('ANSWERING_PAUSED', 2)); await settle(h.runtime);
  h.appState.currentState = 'background'; poll(); assert.equal(h.requests.length, 2);
  h.appState.currentState = 'active';
  for (const fn of [...h.appEvents]) fn('active');
  assert.equal(h.requests.length, 3);
  h.requests[2].resolve(room('ANSWERING', 3)); await settle(h.runtime);
  assert.equal(h.runtime.output.room.current_round.status, 'ANSWERING');
  h.runtime.unmount();
});

test('host notification and participant fallback polling both recover the started round', async () => {
  const clients = [mountRoom(), mountRoom()];
  for (const [i, h] of clients.entries()) {
    h.requests[0].resolve({ ...room(), my_role: i === 0 ? 'HOST' : 'MEMBER',
      status: 'WAITING', current_round: null, viewer_state: { round_id: null } });
    await settle(h.runtime);
    assert.equal(flow.getRoomDestination(h.runtime.output.room, lobby), null);
  }
  clients[0].sockets[0].message({ type: 'room.updated', room_id: roomId, state_version: 2 });
  [...clients[1].intervals.values()].find(t => t.ms === 5000).fn();
  for (const h of clients) {
    h.requests[1].resolve(room('ANSWERING', 2)); await settle(h.runtime);
    assert.equal(flow.getRoomDestination(h.runtime.output.room, lobby), questionPath);
    h.runtime.unmount();
  }
});

for (const status of [403, 404, 410]) test(`HTTP ${status} revokes stale room data and stops refresh`, async () => {
  const h = mountRoom();
  h.requests[0].resolve(room()); await settle(h.runtime);
  h.runtime.output.refresh();
  h.requests[1].reject(new ApiError('unavailable', status)); await settle(h.runtime);
  assert.equal(h.runtime.output.room, null);
  if (status === 403) assert.equal(h.runtime.output.error.status, 403);
  else assert.equal(h.runtime.output.closedReason, 'UNKNOWN');
  h.runtime.output.refresh(); assert.equal(h.requests.length, 2);
  assert.equal(h.intervals.size, 0);
  h.runtime.unmount();
});

test('closure beats an in-flight success and unmounted requests cannot update state', async () => {
  const h = mountRoom();
  h.requests[0].resolve(room()); await settle(h.runtime);
  h.runtime.output.refresh();
  h.sockets[0].message({ type: 'room.closed', room_id: roomId, reason: 'HOST_LEFT' });
  h.requests[1].resolve(room('ANSWERING', 5)); await settle(h.runtime);
  assert.equal(h.runtime.output.room, null);
  assert.equal(h.runtime.output.closedReason, 'HOST_LEFT');
  h.runtime.unmount();
  const initial = mountRoom(); initial.runtime.unmount();
  assert.equal(initial.requests[0].signal.aborted, true);
  initial.requests[0].resolve(room()); await settle(initial.runtime);
  assert.equal(initial.runtime.output.room, null);
});

test('layout replaces once per transition and defers navigation during exit confirmation', () => {
  const runtime = hooks();
  let session = { room: room(), loading: false, refresh() {}, requestExit() {}, exitOpen: true };
  let pathname = lobby;
  const moves = [];
  const layout = load('src/app/room/[roomId]/_layout.tsx', {
    ...runtime.modules, 'react-native': { View: 'View', StyleSheet: { absoluteFill: {} } },
    'expo-router': { Stack: 'Stack', useLocalSearchParams: () => ({ roomId }),
      usePathname: () => pathname, useRootNavigationState: () => ({ key: 'root' }),
      router: { replace: value => moves.push(value) } },
    '@/components/order-sheet/RoomStatus': { RoomStatus: 'RoomStatus' },
    '@/components/room/HostDecisionPop': { HostDecisionPop: 'HostDecisionPop' },
    '@/contexts/RoomSessionContext': { RoomSessionProvider: 'Provider', useRoomSession: () => session },
    '@/lib/room-flow': flow, '@/lib/rooms': { parseRoomId: value => value },
  });
  const Navigator = layout.default().props.children.type;
  runtime.mount(Navigator); assert.equal(moves.length, 0);
  session = { ...session, exitOpen: false }; runtime.render(); assert.equal(moves.length, 1);
  session = { ...session, room: { ...session.room } }; runtime.render(); assert.equal(moves.length, 1);
  pathname = questionPath; runtime.render();
  session = { ...session, room: room('CANCELLED', 2) }; runtime.render();
  assert.equal(moves.length, 2);
  assert.equal(moves[1].pathname, '/room/[roomId]');
});

test('ordersheet route gates direct access and passes the common exit callback', () => {
  let session = { room: room(), requestExit() {}, refresh() {}, loading: false };
  const { default: Screen } = load('src/app/room/[roomId]/ordersheet.tsx', {
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    'expo-router': { useLocalSearchParams: () => ({ roomId }) },
    '@/components/order-sheet/RoomOrderSheet': { RoomOrderSheet: 'Form' },
    '@/components/order-sheet/RoomStatus': { RoomStatus: 'Status' },
    '@/contexts/RoomSessionContext': { useRoomSession: () => session },
    '@/lib/room-flow': flow, '@/lib/rooms': { parseRoomId: value => value },
  });
  assert.equal(Screen().type, 'Form');
  assert.equal(Screen().props.onExit, session.requestExit);
  session.room = room('ANSWERING_PAUSED'); assert.equal(Screen().type, 'Form');
  for (const status of ['CANCELLED', 'VOTING', 'VOTING_PAUSED', 'RESULT']) {
    session.room = room(status); assert.equal(Screen().type, 'Status');
  }
  session.room = { ...room(), viewer_state: { round_id: 10, has_submitted_order_sheet: true } };
  assert.equal(Screen().type, 'Status');
  session.room = { ...room(), is_member: false }; assert.equal(Screen().type, 'Status');
});

function mountRoomForm() {
  const runtime = hooks();
  const request = deferred();
  const calls = { queries: 0, exits: 0, refreshes: 0, submits: [], suggestions: [] };
  const submitResults = [];
  const question = id => ({ id, question_text: 'question', options: [{ option_id: 'a', label: 'A' }] });
  const { RoomOrderSheet } = load('src/components/order-sheet/RoomOrderSheet.tsx', {
    ...runtime.modules,
    'react-native': { Pressable: 'Pressable', Text: 'Text', View: 'View', useWindowDimensions: () => ({ height: 852 }) },
    'react-native-safe-area-context': { SafeAreaView: 'SafeArea', useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '@/lib/api': { ApiError },
    '@/lib/rooms': {
      ROOM_ERROR_CODE: { noMatchingMenus: 'NO_MATCHING_MENUS_FOR_ANSWERS' },
      getRoomQuestions() { calls.queries++; return request.promise; },
      submitRoomOrderSheet(...args) {
        calls.submits.push(args);
        const next = deferred(); submitResults.push(next); return next.promise;
      },
      getRoomNoResultsSuggestions(...args) {
        calls.suggestions.push(args);
        return Promise.resolve({
          suggested_answer_changes: [{ question_id: 2, replacement_option_id: 'any', display_text: 'change', display_menu_count: 3 }],
          can_review_my_answers: true,
        });
      },
    },
    './OrderSheetQuestions': { OrderSheetQuestions: 'Questions' }, './orderSheetStyles': { orderSheetStyles: {} },
  });
  const props = {
    roomId, roundId: 10, roundNo: 1, roundStatus: 'ANSWERING',
    onRefreshRoom: () => calls.refreshes++, onExit: () => calls.exits++,
  };
  runtime.mount(RoomOrderSheet, props);
  return { runtime, request, calls, submitResults, question, props };
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

function children(output) {
  return [output.props.children].flat(Infinity).filter(Boolean);
}

test('room form keeps answers through pause/resume and submits once on the last answer', async () => {
  const { runtime, request, calls, submitResults, question, props } = mountRoomForm();
  request.resolve({ round_id: 10, round_status: 'ANSWERING', has_submitted: false, questions: [question(1), question(2)] });
  await settle(runtime);
  runtime.output.props.onAnswer('a'); runtime.render(); assert.equal(runtime.output.props.questionIndex, 1);
  runtime.render({ ...props, roundStatus: 'ANSWERING_PAUSED' });
  assert.equal(runtime.output.props.disabled, true);
  runtime.output.props.onAnswer('a'); runtime.render(); assert.equal(runtime.output.props.selectedOptionId, undefined);
  assert.equal(calls.submits.length, 0);
  runtime.render(props); runtime.output.props.onBack(); runtime.render();
  assert.equal(runtime.output.props.selectedOptionId, 'a');
  runtime.output.props.onAnswer('a'); runtime.render();
  runtime.output.props.onAnswer('a'); runtime.render();
  assert.equal(runtime.output.props.questionIndex, 1);
  assert.equal(runtime.output.props.disabled, true);
  runtime.output.props.onAnswer('a'); runtime.output.props.onBack(); runtime.render();
  assert.equal(calls.submits.length, 1);
  assert.equal(calls.exits, 0);
  const [submitRoomId, fence, answers] = calls.submits[0];
  assert.equal(submitRoomId, roomId);
  assert.deepEqual(plain(fence), { round_id: 10, round_no: 1 });
  assert.deepEqual(plain(answers), [{ question_id: 1, option_id: 'a' }, { question_id: 2, option_id: 'a' }]);
  submitResults[0].resolve({ submitted: true }); await settle(runtime);
  assert.equal(calls.refreshes, 1);
  assert.equal(calls.queries, 1);
  runtime.output.props.onBack(); runtime.render(); runtime.output.props.onBack(); assert.equal(calls.exits, 1);
  runtime.unmount();
});

test('room form offers answer changes when no menu matches and resubmits the change', async () => {
  const { runtime, request, calls, submitResults, question } = mountRoomForm();
  request.resolve({ round_id: 10, round_status: 'ANSWERING', has_submitted: false, questions: [question(1), question(2)] });
  await settle(runtime);
  runtime.output.props.onAnswer('a'); runtime.render();
  runtime.output.props.onAnswer('a'); runtime.render();
  submitResults[0].reject(new ApiError('no menus', 409, 'NO_MATCHING_MENUS_FOR_ANSWERS'));
  await settle(runtime); await settle(runtime);
  assert.equal(calls.suggestions.length, 1);
  assert.equal(calls.refreshes, 0);
  const pressables = children(runtime.output).filter(child => child.type === 'Pressable');
  const change = pressables.find(child => child.props.children.props.children === 'change');
  const review = pressables.find(child => child.props.children.props.children === '내 답변 다시 보기');
  assert.ok(change && review);
  change.props.onPress(); runtime.render();
  assert.equal(calls.submits.length, 2);
  assert.deepEqual(plain(calls.submits[1][2]), [{ question_id: 1, option_id: 'a' }, { question_id: 2, option_id: 'any' }]);
  runtime.unmount();
});
