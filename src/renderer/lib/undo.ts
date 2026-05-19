// История undo/redo. Snapshot-based: храним прошлые версии deck-а целиком.
// Чтобы во время drag/resize-а не накапливалось по 60 кадров в секунду,
// коммит в past происходит с дебаунсом — после ~300ms без изменений.
//
// Зачем не immer-patches: они компактнее, но требуют перепрошивки всех
// setState-вызовов на produceWithPatches. Snapshot-подход интегрируется
// одной подпиской на стор; для проекта-MVP (десятки фигур) расход памяти
// приемлем (Immer reuses unchanged sub-objects, snapshot ≈ ссылочный граф).

import type { Deck } from './model/schema';
import { useDeckStore } from '../stores/deck';

const MAX_HISTORY = 100;
const COMMIT_DEBOUNCE_MS = 300;

interface HistoryState {
  past: Deck[];
  future: Deck[];
  // Состояние, которое будет коммитнуто в past по таймауту.
  pendingPrev: Deck | null;
  pendingTimer: ReturnType<typeof setTimeout> | null;
  // Флаг «сейчас undo/redo идёт» — чтобы не записывать сам undo в историю.
  applying: boolean;
}

const history: HistoryState = {
  past: [],
  future: [],
  pendingPrev: null,
  pendingTimer: null,
  applying: false,
};

let unsubscribe: (() => void) | null = null;

export function initHistory(): void {
  if (unsubscribe) return; // уже инициализирована
  // prevDeck — то, во что превратится deck при следующем undo (до изменений).
  let prevDeck: Deck | null = useDeckStore.getState().deck;
  unsubscribe = useDeckStore.subscribe((s) => {
    const newDeck = s.deck;
    if (history.applying) {
      // Не записываем сам факт применения undo/redo как новое событие.
      prevDeck = newDeck;
      return;
    }
    if (newDeck === prevDeck) return;
    if (history.pendingPrev === null) {
      history.pendingPrev = prevDeck;
    }
    prevDeck = newDeck;
    if (history.pendingTimer) clearTimeout(history.pendingTimer);
    history.pendingTimer = setTimeout(commitPending, COMMIT_DEBOUNCE_MS);
  });
}

function commitPending(): void {
  history.pendingTimer = null;
  if (history.pendingPrev === null) return;
  history.past.push(history.pendingPrev);
  if (history.past.length > MAX_HISTORY) history.past.shift();
  history.pendingPrev = null;
  // Любое новое изменение очищает redo-стек.
  history.future = [];
}

function flushPending(): void {
  if (history.pendingTimer) {
    clearTimeout(history.pendingTimer);
    history.pendingTimer = null;
  }
  if (history.pendingPrev !== null) {
    history.past.push(history.pendingPrev);
    if (history.past.length > MAX_HISTORY) history.past.shift();
    history.pendingPrev = null;
    history.future = [];
  }
}

export function undo(): void {
  // Если есть pending — флешим, чтобы текущее состояние оказалось в past.
  flushPending();
  if (history.past.length === 0) return;
  const current = useDeckStore.getState().deck;
  if (!current) return;
  const prev = history.past.pop()!;
  history.future.push(current);
  history.applying = true;
  useDeckStore.setState({ deck: prev });
  history.applying = false;
}

export function redo(): void {
  flushPending();
  if (history.future.length === 0) return;
  const current = useDeckStore.getState().deck;
  if (!current) return;
  const next = history.future.pop()!;
  history.past.push(current);
  history.applying = true;
  useDeckStore.setState({ deck: next });
  history.applying = false;
}

export function canUndo(): boolean {
  return history.past.length > 0 || history.pendingPrev !== null;
}

export function canRedo(): boolean {
  return history.future.length > 0;
}
