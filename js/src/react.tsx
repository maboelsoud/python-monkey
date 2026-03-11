/**
 * Optional React provider for PythonMonkey.
 *
 * Thin wrapper that manages PythonMonkey connection lifecycle
 * via useEffect. Renders no UI -- just passes children through.
 */

import React, { useEffect, useRef } from 'react';
import { PythonMonkey, type PythonMonkeyOptions } from './client';

export type PythonMonkeyProviderProps = PythonMonkeyOptions & {
  children: React.ReactNode;
};

export const PythonMonkeyProvider = ({
  children,
  ...options
}: PythonMonkeyProviderProps) => {
  const monkeyRef = useRef<PythonMonkey | null>(null);

  useEffect(() => {
    if (options.enabled === false) return;
    if (typeof window === 'undefined') return;

    const monkey = new PythonMonkey(options);
    monkeyRef.current = monkey;
    monkey.connect();

    return () => {
      monkey.disconnect();
      monkeyRef.current = null;
    };
  }, [options.url, options.enabled]);

  return <>{children}</>;
};
