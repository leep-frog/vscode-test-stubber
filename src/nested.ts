export function nestedHas(map: Map<string, any>, keys: string[]): boolean {
  return nestedDo(map, keys, (v: any) => true, () => false);
}

export function nestedGet(map: Map<string, any>, keys: string[]): any {
  return nestedDo(map, keys, (v: any) => v, () => undefined);
}

export function nestedSet(map: Map<string, any>, path: string, value:any) {
  const pathParts = path.split(".");
  nestedDo(map, pathParts.slice(0, -1), (m: Map<string, any>) => m.set(pathParts.at(-1)!, value), () => { throw new Error(""); }, true);
}

function nestedDo<T>(map: Map<string, any>, keys: string[], hasFn: (v: any) => T, missingFn: () => T, insert?: boolean): T {

  let cur: any = map;
  for (let i = 0; i < keys.length; i++) {
    if (!(cur instanceof Map)) {
      return missingFn();
    }

    const key = keys.at(i)!;
    if (!cur.has(key)) {
      if (insert) {
        cur.set(key, new Map<string, any>());
      } else {
        return missingFn();
      }
    }

    cur = cur.get(key);
  }

  return hasFn(cur);
}
