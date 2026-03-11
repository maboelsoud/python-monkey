import { describe, it, expect } from 'vitest';
import { deserializePythonObject } from '../src/deserializer';

describe('deserializePythonObject', () => {
  it('passes through null and undefined', () => {
    expect(deserializePythonObject(null)).toBe(null);
    expect(deserializePythonObject(undefined)).toBe(undefined);
  });

  it('passes through primitives', () => {
    expect(deserializePythonObject('hello')).toBe('hello');
    expect(deserializePythonObject(42)).toBe(42);
    expect(deserializePythonObject(true)).toBe(true);
  });

  it('deserializes datetime to Date', () => {
    const result = deserializePythonObject({
      __py_type__: 'datetime',
      value: '2025-01-15T10:30:00',
    });
    expect(result).toBeInstanceOf(Date);
    expect((result as Date).getFullYear()).toBe(2025);
  });

  it('deserializes date to Date', () => {
    const result = deserializePythonObject({
      __py_type__: 'date',
      value: '2025-01-15',
    });
    expect(result).toBeInstanceOf(Date);
  });

  it('deserializes Decimal to number', () => {
    const result = deserializePythonObject({
      __py_type__: 'Decimal',
      value: '99.99',
    });
    expect(result).toBe(99.99);
  });

  it('deserializes Enum to named class instance', () => {
    const result = deserializePythonObject({
      __py_type__: 'Enum',
      __py_class__: 'Status',
      name: 'ACTIVE',
      value: 1,
    }) as Record<string, unknown>;
    expect(result.constructor.name).toBe('Status');
    expect(result.name).toBe('ACTIVE');
    expect(result.value).toBe(1);
  });

  it('deserializes PydanticModel to named class instance', () => {
    const result = deserializePythonObject({
      __py_type__: 'PydanticModel',
      __py_class__: 'Payment',
      __py_module__: 'app.models',
      data: {
        id: 'pay_123',
        amount: { __py_type__: 'Decimal', value: '50.00' },
      },
    }) as Record<string, unknown>;
    expect(result.constructor.name).toBe('Payment');
    expect(result.id).toBe('pay_123');
    expect(result.amount).toBe(50.0);
  });

  it('deserializes dataclass to named class instance', () => {
    const result = deserializePythonObject({
      __py_type__: 'dataclass',
      __py_class__: 'User',
      __py_module__: 'app.models',
      data: { name: 'alice', age: 30 },
    }) as Record<string, unknown>;
    expect(result.constructor.name).toBe('User');
    expect(result.name).toBe('alice');
    expect(result.age).toBe(30);
  });

  it('deserializes dict', () => {
    const result = deserializePythonObject({
      __py_type__: 'dict',
      data: { key: 'value', num: 42 },
    }) as Record<string, unknown>;
    expect(result.key).toBe('value');
    expect(result.num).toBe(42);
  });

  it('deserializes list', () => {
    const result = deserializePythonObject({
      __py_type__: 'list',
      data: [1, 'two', 3],
    });
    expect(result).toEqual([1, 'two', 3]);
  });

  it('deserializes tuple', () => {
    const result = deserializePythonObject({
      __py_type__: 'tuple',
      data: [1, 2, 3],
    });
    expect(result).toEqual([1, 2, 3]);
  });

  it('deserializes set to Set', () => {
    const result = deserializePythonObject({
      __py_type__: 'set',
      data: [1, 2, 3],
    });
    expect(result).toBeInstanceOf(Set);
    expect((result as Set<number>).size).toBe(3);
  });

  it('deserializes bytes', () => {
    const result = deserializePythonObject({
      __py_type__: 'bytes',
      value: 'hello',
    });
    expect(result).toBe('hello');
  });

  it('deserializes Exception with traceback', () => {
    const result = deserializePythonObject({
      __py_type__: 'Exception',
      __py_class__: 'ValueError',
      message: 'bad input',
      traceback: ['line 1\n', 'line 2\n'],
    }) as Record<string, unknown>;
    expect(result.constructor.name).toBe('ValueError');
    expect(result.message).toBe('bad input');
    expect(result.traceback).toBe('line 1\nline 2\n');
  });

  it('deserializes generic object with data', () => {
    const result = deserializePythonObject({
      __py_type__: 'object',
      __py_class__: 'Custom',
      __py_module__: 'app.things',
      data: { name: 'test', value: 42 },
    }) as Record<string, unknown>;
    expect(result.constructor.name).toBe('Custom');
    expect(result.name).toBe('test');
    expect(result.value).toBe(42);
  });

  it('deserializes generic object with repr fallback', () => {
    const result = deserializePythonObject({
      __py_type__: 'object',
      __py_class__: 'Opaque',
      __py_module__: 'lib',
      repr: '<Opaque at 0x123>',
    }) as Record<string, unknown>;
    expect(result.constructor.name).toBe('Opaque');
    expect(result.repr).toBe('<Opaque at 0x123>');
  });

  it('deserializes nested structures', () => {
    const result = deserializePythonObject({
      __py_type__: 'dict',
      data: {
        items: {
          __py_type__: 'list',
          data: [
            {
              __py_type__: 'PydanticModel',
              __py_class__: 'Item',
              __py_module__: 'app',
              data: {
                price: { __py_type__: 'Decimal', value: '9.99' },
              },
            },
          ],
        },
      },
    }) as Record<string, unknown>;

    const items = result.items as unknown[];
    expect(Array.isArray(items)).toBe(true);
    const item = items[0] as Record<string, unknown>;
    expect(item.constructor.name).toBe('Item');
    expect(item.price).toBe(9.99);
  });

  it('passes through plain arrays', () => {
    const result = deserializePythonObject([1, 2, 3]);
    expect(result).toEqual([1, 2, 3]);
  });

  it('passes through plain objects without __py_type__', () => {
    const result = deserializePythonObject({ a: 1, b: 'two' }) as Record<
      string,
      unknown
    >;
    expect(result.a).toBe(1);
    expect(result.b).toBe('two');
  });
});
