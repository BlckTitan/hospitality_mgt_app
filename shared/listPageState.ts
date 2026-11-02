'use client';

import { Dispatch, SetStateAction, useEffect, useLayoutEffect, useRef, useState } from 'react';

type RememberedList = {
  page: number;
  cursors: (string | null)[];
};

function storageKey(key: string) {
  return `list-page:v2:${key}`;
}

function readRememberedList(key: string): RememberedList {
  if (typeof window === 'undefined') return { page: 1, cursors: [null] };
  try {
    const parsed = JSON.parse(sessionStorage.getItem(storageKey(key)) ?? '') as RememberedList;
    const page = Number.isInteger(parsed.page) && parsed.page >= 1 ? parsed.page : 1;
    const cursors = Array.isArray(parsed.cursors) && parsed.cursors.length > 0
      ? parsed.cursors.map((cursor) => (cursor == null ? null : String(cursor)))
      : [null];
    return { page, cursors };
  } catch {
    return { page: 1, cursors: [null] };
  }
}

function writeRememberedList(key: string, value: RememberedList) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(storageKey(key), JSON.stringify(value));
}

export function useRememberedList(key: string) {
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
  const [currentPage, setCurrentPage] = useState(1);
  const [readyKey, setReadyKey] = useState<string | null>(null);
  const skipWrite = useRef(true);

  useLayoutEffect(() => {
    skipWrite.current = true;
    const saved = readRememberedList(key);
    setCurrentPage(saved.page);
    setCursorHistory(saved.cursors);
    setReadyKey(key);
  }, [key]);

  useEffect(() => {
    if (skipWrite.current) {
      skipWrite.current = false;
      return;
    }
    writeRememberedList(key, { page: currentPage, cursors: cursorHistory });
  }, [key, currentPage, cursorHistory]);

  return {
    ready: readyKey === key,
    currentPage,
    setCurrentPage: setCurrentPage as Dispatch<SetStateAction<number>>,
    cursorHistory,
    setCursorHistory: setCursorHistory as Dispatch<SetStateAction<(string | null)[]>>,
  };
}
