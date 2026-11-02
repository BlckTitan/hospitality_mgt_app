'use client';

import { useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { registerListNavigator } from './goToList';

export function ListNavigator() {
  const router = useRouter();

  useLayoutEffect(() => {
    registerListNavigator((path) => {
      router.push(path);
    });
  }, [router]);

  return null;
}
