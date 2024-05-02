import * as assert from "assert";
import { nestedGet } from "..";

interface TestCase {
  name: string;
  map: Map<string, any>;
  keys: string[];
  want?: any;
};

function mp(...entries: [string, any][]) {
  return new Map<string, any>(entries);
}

const testCases: TestCase[] = [
  {
    name: "Returns base, empty map if no keys",
    map: mp(),
    keys: [],
    want: mp(),
  },
  {
    name: "Returns base, non-empty map if no keys",
    map: mp(
      ["entry1", 111],
      ["two", 22],
    ),
    keys: [],
    want: mp(
      ["entry1", 111],
      ["two", 22],
    ),
  },
  {
    name: "Returns undefined if no key match",
    map: mp(
      ["entry1", 111],
      ["two", 22],
    ),
    keys: ["bloop"],
  },
  {
    name: "Returns value if key match",
    map: mp(
      ["entry1", 111],
      ["two", 22],
    ),
    keys: ["entry1"],
    want: 111,
  },
  {
    name: "Returns undefined if no nested key match",
    map: mp(
      ["entry1", mp(
        ["one-point-one", 1.1],
      )],
      ["two", 22],
    ),
    keys: ["entry1", "one-point-two"],
  },
  {
    name: "Returns value if nested key match",
    map: mp(
      ["entry1", mp(
        ["one-point-one", 1.1],
      )],
      ["two", 22],
    ),
    keys: ["entry1", "one-point-one"],
    want: 1.1,
  },
  {
    name: "Returns value if deep nested key match",
    map: mp(
      ["entry1", mp(
        ["one-point-one", mp(
          ["hundred", 100],
        )],
      )],
      ["two", 22],
    ),
    keys: ["entry1", "one-point-one", "hundred"],
    want: 100,
  },
  {
    name: "Returns map if partial path key match",
    map: mp(
      ["entry1", mp(
        ["one-point-one", mp(
          ["leaf", "node"],
        )],
      )],
      ["two", 22],
    ),
    keys: ["entry1", "one-point-one"],
    want: mp(["leaf", "node"]),
  },
];

suite('nestedGet tests', () => {
  testCases.forEach(tc => {
    test(tc.name, () => {
      const got = nestedGet(tc.map, tc.keys);
      assert.deepStrictEqual(got, tc.want);
    });
  });
});
