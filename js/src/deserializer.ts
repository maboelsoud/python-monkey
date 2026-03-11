/**
 * Deserializer for PythonMonkey wire protocol.
 *
 * Reconstructs serialized Python objects as JavaScript class instances
 * so they display with proper names in browser DevTools.
 */

const classCache: Map<string, new (data: Record<string, unknown>) => unknown> =
  new Map();

function createNamedClass(
  className: string,
  methods: string[] = [],
): new (data: Record<string, unknown>) => unknown {
  const cacheKey = `${className}:${methods.join(',')}`;
  if (classCache.has(cacheKey)) {
    return classCache.get(cacheKey)!;
  }

  const DynamicClass = {
    [className]: class {
      constructor(data: Record<string, unknown>) {
        Object.assign(this, data);
      }
    },
  }[className];

  methods.forEach((methodName) => {
    (DynamicClass.prototype as Record<string, unknown>)[methodName] =
      function () {
        console.warn(
          `Python method "${methodName}()" exists on server-side ${className}, not callable in browser`,
        );
        return undefined;
      };
  });

  classCache.set(cacheKey, DynamicClass);
  return DynamicClass;
}

export function deserializePythonObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj !== 'object') {
    return obj;
  }

  const pyObj = obj as Record<string, unknown>;
  const pyType = pyObj.__py_type__ as string | undefined;

  if (!pyType) {
    if (Array.isArray(obj)) {
      return obj.map(deserializePythonObject);
    }
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(pyObj)) {
      result[key] = deserializePythonObject(value);
    }
    return result;
  }

  switch (pyType) {
    case 'PydanticModel':
    case 'dataclass': {
      const className = pyObj.__py_class__ as string;
      const methods = (pyObj.__py_methods__ as string[]) || [];
      const data = pyObj.data as Record<string, unknown>;

      const deserializedData: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        deserializedData[key] = deserializePythonObject(value);
      }

      deserializedData.__py_class__ = className;
      deserializedData.__py_module__ = pyObj.__py_module__;

      const PythonClass = createNamedClass(className, methods);
      return new PythonClass(deserializedData);
    }

    case 'Exception': {
      const className = pyObj.__py_class__ as string;
      const message = pyObj.message as string;
      const tb = pyObj.traceback as string[];

      const ExceptionClass = createNamedClass(className, []);
      const instance = new ExceptionClass({
        message,
        __py_class__: className,
        __py_module__: pyObj.__py_module__,
      });

      Object.defineProperty(instance, 'traceback', {
        get: () => tb?.join('') || '',
        enumerable: true,
      });

      return instance;
    }

    case 'dict': {
      const data = pyObj.data as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        result[key] = deserializePythonObject(value);
      }
      return result;
    }

    case 'list':
    case 'tuple': {
      const data = pyObj.data as unknown[];
      return data.map(deserializePythonObject);
    }

    case 'set': {
      const data = pyObj.data as unknown[];
      return new Set(data.map(deserializePythonObject));
    }

    case 'datetime':
    case 'date': {
      return new Date(pyObj.value as string);
    }

    case 'Decimal': {
      return parseFloat(pyObj.value as string);
    }

    case 'Enum': {
      const EnumClass = createNamedClass(pyObj.__py_class__ as string, []);
      return new EnumClass({
        name: pyObj.name,
        value: pyObj.value,
        __py_class__: pyObj.__py_class__,
      });
    }

    case 'bytes': {
      return pyObj.value;
    }

    case 'object': {
      const className = pyObj.__py_class__ as string;
      const ObjectClass = createNamedClass(className, []);
      const data = pyObj.data as Record<string, unknown> | undefined;
      if (data) {
        const deserializedData: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(data)) {
          deserializedData[key] = deserializePythonObject(value);
        }
        deserializedData.__py_class__ = className;
        deserializedData.__py_module__ = pyObj.__py_module__;
        return new ObjectClass(deserializedData);
      }
      return new ObjectClass({
        __py_class__: className,
        __py_module__: pyObj.__py_module__,
        repr: pyObj.repr,
      });
    }

    default:
      return obj;
  }
}
