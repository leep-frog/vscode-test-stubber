import * as assert from "assert";
import * as vscode from "vscode";
import { FakeWorkspaceConfiguration } from "..";
import { nestedGet, nestedHas } from "../nested";
import { CONFIGURATION_TARGET_ORDER } from "../workspace-configuration";

interface TestCase {
  name: string;
  map: Map<string, any>;
  keys: string[];
  want?: any;
  wantHas: boolean;
  wantCfg?: any;
  wantCfgHas: boolean;
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
    wantHas: true,
    // Not in config since section is required
    wantCfgHas: false,
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
    wantHas: true,
    wantCfgHas: false,
  },
  {
    name: "Returns undefined if no key match",
    map: mp(
      ["entry1", 111],
      ["two", 22],
    ),
    keys: ["bloop"],
    wantHas: false,
    wantCfgHas: false,
  },
  {
    name: "Returns value if key match",
    map: mp(
      ["entry1", 111],
      ["two", 22],
    ),
    keys: ["entry1"],
    want: 111,
    wantHas: true,
    wantCfg: 111,
    wantCfgHas: true,
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
    wantHas: false,
    wantCfgHas: false,
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
    wantHas: true,
    wantCfg: 1.1,
    wantCfgHas: true,
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
    wantHas: true,
    wantCfg: 100,
    wantCfgHas: true,
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
    wantHas: true,
    wantCfg: mp(["leaf", "node"]),
    wantCfgHas: true,
  },
  {
    name: "Returns undefined one of values isn't a map",
    map: mp(
      ["entry1", mp(
        ["not-a-map", 5],
        ["one-point-one", mp(
          ["hundred", 100],
        )],
      )],
      ["two", 22],
    ),
    keys: ["entry1", "not-a-map", "hundred"],
    wantHas: false,
    wantCfgHas: false,
  },
  {
    name: "Returns undefined one of values isn't a map with string keys",
    map: mp(
      ["entry1", mp(
        ["not-a-string-map", new Map<number, any>([
          [5, "five"],
        ])],
        ["one-point-one", mp(
          ["hundred", 100],
        )],
      )],
      ["two", 22],
    ),
    keys: ["entry1", "not-a-string-map", "5"],
    wantHas: false,
    wantCfgHas: false,
  },
];

suite('nestedGet tests', () => {
  testCases.forEach(tc => {
    test(tc.name, () => {
      const got = nestedGet(tc.map, tc.keys);
      const has = nestedHas(tc.map, tc.keys);
      assert.deepStrictEqual(got, tc.want);
      assert.deepStrictEqual(has, tc.wantHas);

      const section = tc.keys.join(".");
      for (const target of CONFIGURATION_TARGET_ORDER) {
        // Workspace configuration tests
        const cfg = new FakeWorkspaceConfiguration({}, new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [target, tc.map],
        ]));

        const cfgGot = cfg.get(section);
        const cfgHas = cfg.has(section);
        assert.deepStrictEqual(cfgGot, tc.wantCfg);
        assert.deepStrictEqual(cfgHas, tc.wantCfgHas);

        // Scoped workspace configuration tests
        const scopedCfg = cfg.scopedConfiguration([]);

        const scopedCfgGot = scopedCfg.get(section);
        const scopedCfgHas = scopedCfg.has(section);
        assert.deepStrictEqual(scopedCfgGot, tc.wantCfg);
        assert.deepStrictEqual(scopedCfgHas, tc.wantCfgHas);
      }
    });
  });
});
