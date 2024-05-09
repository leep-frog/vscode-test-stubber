import assert from "assert";
import { replacer, reviver } from "../workspace-configuration";

interface TestCase {
  name: string;
  // Make this a method so no shared reference issues
  from(): any;
};

function b(v: any): () => any {
  return () => v;
}

const testCases: TestCase[] = [
  {
    name: "works for string",
    from: b("hello"),
  },
  {
    name: "works for basic map",
    from: b(new Map<string, any>([
      ["hello", "there"],
      ["six", 6],
    ])),
  },
  {
    name: "works for map with number keys",
    from: b(new Map<number, any>([
      [3, "there"],
      [6, "six"],
    ])),
  },
  {
    name: "works for map with any keys",
    from: b(new Map<any, any>([
      [{hey: "o"}, "there"],
      [6, "six"],
      ["seven", 7],
    ])),
  },
  {
    name: "works for nested maps and nested objects when base is map",
    from: b(new Map<string, any>([
      ["hello", "there"],
      ["six", 6],
      ["obj", {
        un: 111,
        deux: new Map<string, any>([
          ["dos", "two"],
          ["two", 2],
        ]),
        trois: "three",
      }],
      ["nest", new Map<string, any>([
        ["in-a", new Map<string, any>([
          ["tree", {baby: "bird", count: 3}],
        ])],
      ])],
    ])),
  },
  {
    name: "works for nested maps and nested objects when base is object",
    from: b({
      numberField: 123,
      strField: "str",
      mapField: new Map<string, any>([
        ["hello", "there"],
        ["six", 6],
        ["obj", {
          un: 111,
          deux: new Map<string, any>([
            ["dos", "two"],
            ["two", 2],
          ]),
          trois: "three",
        }],
        ["nest", new Map<string, any>([
          ["in-a", new Map<string, any>([
            ["tree", {baby: "bird", count: 3}],
          ])],
        ])],
      ]),
    }),
  },
];

suite('Map replacer/reviver tests', () => {
  testCases.forEach(tc => {
    test(tc.name, () => {
      const gotString = JSON.stringify(tc.from(), replacer);
      const got = JSON.parse(gotString, reviver);
      assert.deepStrictEqual(got, tc.from());
    });
  });
});
