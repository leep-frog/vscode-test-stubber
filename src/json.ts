
interface SerializedMap {
  type: string;
  entries: [any, any][];
}

export function replacer(this: any, key: string, value: any): any {
  if (!(value instanceof Map)) {
    return value;
  }

  const entries = [...(value as Map<any, any>).entries()];
  const sm: SerializedMap = {
    type: "@SerializedMap",
    entries,
  };
  return sm;
}

export function reviver(this: any, key: string, value: any): any {
  const sm = (value as SerializedMap);
  if (sm?.type && sm.type === "@SerializedMap") {
    return new Map<any ,any>(sm.entries);
  }
  return value;
}

export function JSONParse(text: string) {
  return JSON.parse(text, reviver);
}

export function JSONStringify(obj: any) {
  return JSON.stringify(obj, replacer, 2);
}
