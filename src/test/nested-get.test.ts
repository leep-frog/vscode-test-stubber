import assert from "assert";
import * as vscode from 'vscode';
import { nestedGet, nestedHas } from "../nested";
import { StubbablesConfigInternal } from "../run-stubbable";
import { TestData } from "../verify";
import { CONFIGURATION_TARGET_ORDER, FakeScopedWorkspaceConfiguration } from "../workspace-configuration";

interface ScopedGetTest {
  sections: string[];
  key?: string;
}

interface TestCase {
  name: string;
  map: Map<string, any>;
  keys: string[];
  scope?: string[];
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
    name: "Returns undefined if no scope match",
    map: mp(
      ["entry1", 111],
      ["two", 22],
    ),
    keys: ["bloop"],
    scope: ["beep"],
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
    name: "Returns undefined if no nested, scoped key match",
    map: mp(
      ["entry1", mp(
        ["one-point-one", 1.1],
      )],
      ["two", 22],
    ),
    scope: ["entry1"],
    keys: ["one-point-two"],
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
    name: "Returns value if nested, scoped key match",
    map: mp(
      ["entry1", mp(
        ["one-point-one", 1.1],
      )],
      ["two", 22],
    ),
    scope: ["entry1"],
    keys: ["one-point-one"],
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
    name: "Returns value if deep nested, scoped key match",
    map: mp(
      ["entry1", mp(
        ["one-point-one", mp(
          ["hundred", 100],
        )],
      )],
      ["two", 22],
    ),
    scope: ["entry1", "one-point-one"],
    keys: ["hundred"],
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
    name: "Returns map if scoped partial path key match",
    map: mp(
      ["entry1", mp(
        ["one-point-one", mp(
          ["leaf", "node"],
        )],
      )],
      ["two", 22],
    ),
    scope: ["entry1"],
    keys: ["one-point-one"],
    want: mp(["leaf", "node"]),
    wantHas: true,
    wantCfg: mp(["leaf", "node"]),
    wantCfgHas: true,
  },
  {
    name: "Returns undefined if one of values isn't a map",
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
    name: "Returns undefined if one of scoped values isn't a map",
    map: mp(
      ["entry1", mp(
        ["not-a-map", 5],
        ["one-point-one", mp(
          ["hundred", 100],
        )],
      )],
      ["two", 22],
    ),
    scope: ["entry1", "not-a-map"],
    keys: ["hundred"],
    wantHas: false,
    wantCfgHas: false,
  },
  {
    name: "Returns undefined if one of values isn't a map with string keys",
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
  {
    name: "Returns undefined if one of scoped values isn't a map with string keys",
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
    scope: ["entry1", "not-a-string-map"],
    keys: ["5"],
    wantHas: false,
    wantCfgHas: false,
  },
  /* Useful for commenting out tests. */
];

suite('nestedGet tests', () => {
  testCases.forEach(tc => {
    test(tc.name, () => {
      const got = nestedGet(tc.map, [...(tc.scope || []), ...tc.keys]);
      const has = nestedHas(tc.map, [...(tc.scope || []), ...tc.keys]);
      assert.deepStrictEqual(got, tc.want);
      assert.deepStrictEqual(has, tc.wantHas);

      const section = tc.keys.join(".");
      for (const target of CONFIGURATION_TARGET_ORDER) {
        // Workspace configuration tests
        const sc: StubbablesConfigInternal = {};
        const td: TestData = {
          errorMessages: [],
          infoMessages: [],
          inputBoxes: [],
          quickPicks: [],
        };
        const cfg = new FakeScopedWorkspaceConfiguration(td, {
          configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
            [target, tc.map],
          ]),
          languageConfiguration: new Map<string, Map<vscode.ConfigurationTarget, Map<string, any>>>(),
        }, tc.scope || []);

        const got = cfg.get(section);
        const has = cfg.has(section);
        assert.deepStrictEqual(got, tc.wantCfg);
        assert.deepStrictEqual(has, tc.wantCfgHas);

        const expectedTD: TestData = {
          errorMessages: [],
          infoMessages: [],
          inputBoxes: [],
          quickPicks: [],
        };
        assert.deepStrictEqual(td, expectedTD);
      }
    });
  });
});
