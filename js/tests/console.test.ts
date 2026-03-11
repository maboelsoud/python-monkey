import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logToConsole } from '../src/console';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('logToConsole', () => {
  it('logs INFO messages with console.log', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logToConsole({
      type: 'log',
      level: 'INFO',
      message: 'test message',
      timestamp: '2025-01-15T10:30:00',
      filename: 'test.py',
      lineno: 42,
    });
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toContain('[PythonMonkey]');
    expect(spy.mock.calls[0][0]).toContain('test message');
  });

  it('logs ERROR messages with console.error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logToConsole({
      type: 'log',
      level: 'ERROR',
      message: 'something broke',
      timestamp: '2025-01-15T10:30:00',
      filename: 'test.py',
      lineno: 10,
    });
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toContain('something broke');
  });

  it('logs WARNING messages with console.warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logToConsole({
      type: 'log',
      level: 'WARNING',
      message: 'be careful',
      timestamp: '2025-01-15T10:30:00',
      filename: 'test.py',
      lineno: 5,
    });
    expect(spy).toHaveBeenCalled();
  });

  it('logs DEBUG messages with console.debug', () => {
    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    logToConsole({
      type: 'log',
      level: 'DEBUG',
      message: 'debug info',
      timestamp: '2025-01-15T10:30:00',
      filename: 'test.py',
      lineno: 1,
    });
    expect(spy).toHaveBeenCalled();
  });

  it('logs object type with deserialized objects', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logToConsole({
      type: 'object',
      level: 'INFO',
      timestamp: '2025-01-15T10:30:00',
      filename: 'test.py',
      lineno: 20,
      objects: [
        { __py_type__: 'dict', data: { key: 'value' } },
        'plain string',
      ],
    });
    expect(spy).toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toContain('[PythonMonkey]');
  });

  it('logs stack trace in collapsed group for errors', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const groupSpy = vi
      .spyOn(console, 'groupCollapsed')
      .mockImplementation(() => {});
    const groupEndSpy = vi
      .spyOn(console, 'groupEnd')
      .mockImplementation(() => {});

    logToConsole({
      type: 'log',
      level: 'ERROR',
      message: 'error happened',
      timestamp: '2025-01-15T10:30:00',
      filename: 'test.py',
      lineno: 99,
      stack_trace: ['  File "test.py", line 99\n', '    raise Error\n'],
    });

    expect(errorSpy).toHaveBeenCalled();
    expect(groupSpy).toHaveBeenCalled();
    expect(groupEndSpy).toHaveBeenCalled();
  });

  it('handles missing timestamp gracefully', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logToConsole({
      type: 'log',
      level: 'INFO',
      message: 'no timestamp',
    });
    expect(spy).toHaveBeenCalled();
  });
});
