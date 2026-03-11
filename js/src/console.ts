/**
 * Console formatter for PythonMonkey messages.
 *
 * Takes a parsed WebSocket message and logs it to the browser console
 * with proper formatting, level mapping, and rich object display.
 */

import { deserializePythonObject } from './deserializer';

export function logToConsole(data: Record<string, unknown>): void {
  const level = (data.level as string) || 'INFO';
  const message = data.message as string;
  const timestamp = data.timestamp as string;
  const filename = data.filename as string;
  const lineno = data.lineno as number;
  const excInfo = data.exc_info as Record<string, unknown> | null;
  const args = data.args;
  const objectData = data.object;
  const objects = data.objects as unknown[] | undefined;
  const msgObject = data.msg_object;
  const stackTrace = data.stack_trace as string[] | undefined;

  const time = timestamp ? new Date(timestamp).toLocaleTimeString() : '';
  const location = filename && lineno ? `${filename}:${lineno}` : '';
  const prefix = `[PythonMonkey] ${level} ${time}`;
  const suffix = location ? `(${location})` : '';

  const consoleMethod =
    level === 'ERROR' || level === 'CRITICAL'
      ? console.error
      : level === 'WARNING' || level === 'WARN'
        ? console.warn
        : level === 'DEBUG'
          ? console.debug
          : console.log;

  if (data.type === 'object' && objects && objects.length > 0) {
    const deserializedObjects = objects.map((obj) =>
      deserializePythonObject(obj),
    );
    const loc = filename && lineno ? `(${filename}:${lineno})` : '';
    consoleMethod(`${prefix}`, ...deserializedObjects, loc);
  } else if (data.type === 'object' && objectData) {
    const deserializedObj = deserializePythonObject(objectData);
    consoleMethod(`${prefix} ${message}:`, deserializedObj, suffix);
  } else if (msgObject) {
    const deserializedMsgObj = deserializePythonObject(msgObject);
    if (args) {
      const deserializedArgs = Array.isArray(args)
        ? args.map((arg) => deserializePythonObject(arg))
        : [deserializePythonObject(args)];
      consoleMethod(
        `${prefix}`,
        deserializedMsgObj,
        ...deserializedArgs,
        suffix,
      );
    } else {
      consoleMethod(`${prefix}`, deserializedMsgObj, suffix);
    }
  } else if (args) {
    const deserializedArgs = Array.isArray(args)
      ? args.map((arg) => deserializePythonObject(arg))
      : [deserializePythonObject(args)];
    consoleMethod(`${prefix} ${message}`, ...deserializedArgs, suffix);
  } else {
    consoleMethod(`${prefix} ${message}`, suffix);
  }

  if (stackTrace && stackTrace.length > 0) {
    console.groupCollapsed(`${prefix} Stack trace`);
    console.error(stackTrace.join(''));
    console.groupEnd();
  }

  if (excInfo) {
    const deserializedException = deserializePythonObject(excInfo);
    console.error(`${prefix} Exception:`, deserializedException);

    const tb = excInfo.traceback as string[] | undefined;
    if (tb && tb.length > 0) {
      console.groupCollapsed(`${prefix} Stack trace`);
      console.error(tb.join(''));
      console.groupEnd();
    }
  }
}
