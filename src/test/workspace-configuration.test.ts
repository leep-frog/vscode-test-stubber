import assert from "assert";
import vscode from "vscode";
import { StubbablesConfigInternal } from "../run-stubbable";
import { FakeScopedWorkspaceConfiguration, WorkspaceConfiguration, mustWorkspaceConfiguration } from "../workspace-configuration";

suite("Error tests", () => {

  test("inspect throws an error", () => {
    const scopedCfg = new FakeScopedWorkspaceConfiguration({}, mustWorkspaceConfiguration(), []);
    assert.throws(() => scopedCfg.inspect("section"), new Error("FakeScopedWorkspaceConfiguration.inspect is not yet supported"));
  });

  test("update throws an error", async () => {
    const scopedCfg = new FakeScopedWorkspaceConfiguration({}, mustWorkspaceConfiguration(), []);
    assert.rejects(() => scopedCfg.update("section", "value", true, true), new Error("overrideInLanguage is not yet supported"));
  });
});

interface GetTestCase<T> {
  name: string,
  scope?: string[];
  languageId?: string;
  key: string;
  startingCfg?: WorkspaceConfiguration;
  defaultValue?: T;
  wantHas: boolean;
  wantGot?: T;
}

const getTestCases: GetTestCase<any>[] = [
  {
    name: "Returns undefined if no configuration",
    key: "key1",
    wantHas: false,
  },
  {
    name: "Returns undefined if no configuration for a language",
    key: "key1",
    languageId: "valyrian",
    wantHas: false,
  },
  {
    name: "Returns workspace folder value if all configuration targets are present",
    key: "one",
    wantHas: true,
    wantGot: 333,
    startingCfg: {
      configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
        [vscode.ConfigurationTarget.Global, new Map<string, any>([
          ["one", 111],
        ])],
        [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
          ["one", 222],
        ])],
        [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
          ["one", 333],
        ])],
      ]),
    },
  },
  {
    name: "Returns workspace folder value if all configuration targets are present for a language",
    key: "one",
    languageId: "valyrian",
    wantHas: true,
    wantGot: 333,
    startingCfg: {
      languageConfiguration: new Map<string, Map<vscode.ConfigurationTarget, Map<string, any>>>([
        ["valyrian", new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.Global, new Map<string, any>([
            ["one", 111],
          ])],
          [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
            ["one", 222],
          ])],
          [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
            ["one", 333],
          ])],
        ])],
      ]),
    },
  },
  /*{
    name: "Returns workspace value",
    key: "one",
    wantHas: true,
    wantGot: 222,
    startingCfg: {
      configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
        [vscode.ConfigurationTarget.Global, new Map<string, any>([
          ["one", 111],
        ])],
        [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
          ["one", 222],
        ])],
        // No workspace folder value
      ]),
    },
  },
  {
    name: "Returns workspace value for a language",
    key: "one",
    languageId: "valyrian",
    wantHas: true,
    wantGot: 222,
    startingCfg: {
      languageConfiguration: new Map<string, Map<vscode.ConfigurationTarget, Map<string, any>>>([
        ["valyrian", new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.Global, new Map<string, any>([
            ["one", 111],
          ])],
          [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
            ["one", 222],
          ])],
          // No workspace folder value
        ])],
      ]),
    },
  },
  {
    name: "Returns workspace folder value",
    key: "one",
    wantHas: true,
    wantGot: 111,
    startingCfg: {
      configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
        [vscode.ConfigurationTarget.Global, new Map<string, any>([
          ["one", 111],
        ])],
        // No workspace value
        // No workspace folder value
      ]),
    },
  },
  {
    name: "Returns workspace folder value for a language",
    key: "one",
    languageId: "valyrian",
    wantHas: true,
    wantGot: 111,
    startingCfg: {
      languageConfiguration: new Map<string, Map<vscode.ConfigurationTarget, Map<string, any>>>([
        ["valyrian", new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.Global, new Map<string, any>([
            ["one", 111],
          ])],
          // No workspace value
          // No workspace folder value
        ])],
      ]),
    },
  },
  {
    name: "Returns scoped language value",
    scope: ["new"],
    key: "nested",
    languageId: "valyrian",
    wantHas: true,
    wantGot: "def",
    startingCfg: {
      languageConfiguration: new Map<string, Map<vscode.ConfigurationTarget, Map<string, any>>>([
        ["valyrian", new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.Global, new Map<string, any>([
            ["old", new Map<string, any>([
              ["nested", "abc"],
            ])],
            ["new", new Map<string, any>([
              ["nested", "def"],
            ])],
          ])]
        ])],
      ]),
    },
  },
  /* Useful for commenting out tests. */
];

function runGetTestCase<T>(tc: GetTestCase<T>) {
  const sc: StubbablesConfigInternal = {};
  const m = mustWorkspaceConfiguration(tc.startingCfg);
  const cfg = new FakeScopedWorkspaceConfiguration(sc, m, tc.scope, tc.languageId);

  const has = cfg.has(tc.key);
  const got = cfg.get<T>(tc.key);

  assert.deepStrictEqual<boolean>(has, tc.wantHas);
  assert.deepStrictEqual<T | undefined>(got, tc.wantGot);
}

suite("WorkspaceConfiguration.Get/Has tests", () => {
  getTestCases.forEach(tc => {
    test(tc.name, () => {
      runGetTestCase(tc);
    });
  });
});

interface TestCase {
  name: string;
  startingCfg?: WorkspaceConfiguration;
  languageId?: string,
  section: string;
  scopedSection?: string;
  value: any;
  overrideInLanguage?: boolean;
  unqualifiedConfigurationTarget?: boolean | vscode.ConfigurationTarget | null | undefined
  want?: WorkspaceConfiguration;
}

const testCases: TestCase[] = [
  // Configuration target tests
  {
    name: "Updates Workspace target configuration if undefined ConfigurationTarget",
    section: "one",
    value: 111,
    unqualifiedConfigurationTarget: undefined,
    want: {
      configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
        [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
          ["one", 111],
        ])]
      ]),
    },
  },
  {
    name: "Updates Workspace target configuration if null ConfigurationTarget",
    section: "one",
    value: 111,
    unqualifiedConfigurationTarget: null,
    want: {
      configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
        [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
          ["one", 111],
        ])]
      ]),
    },
  },
  {
    name: "Updates Global target configuration if ConfigurationTarget.Global provided",
    section: "one",
    value: 111,
    unqualifiedConfigurationTarget: vscode.ConfigurationTarget.Global,
    want: {
        configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
        [vscode.ConfigurationTarget.Global, new Map<string, any>([
          ["one", 111],
        ])]
      ]),
    },
  },
  {
    name: "Updates Workspace target configuration if ConfigurationTarget.Workspace provided",
    section: "one",
    value: 111,
    unqualifiedConfigurationTarget: vscode.ConfigurationTarget.Workspace,
    want: {
      configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
        [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
          ["one", 111],
        ])]
      ]),
    },
  },
  {
    name: "Updates WorkspaceFolder target configuration if ConfigurationTarget.WorkspaceFolder provided",
    section: "one",
    value: 111,
    unqualifiedConfigurationTarget: vscode.ConfigurationTarget.WorkspaceFolder,
    want: {
      configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
        [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
          ["one", 111],
        ])]
      ]),
    },
  },
  {
    name: "Updates Global target configuration if (ConfigurationTarget = true) provided",
    section: "one",
    value: 111,
    unqualifiedConfigurationTarget: true,
    want: {
      configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
        [vscode.ConfigurationTarget.Global, new Map<string, any>([
          ["one", 111],
        ])]
      ]),
    },
  },
  {
    name: "Updates Workspace target configuration if (ConfigurationTarget = false) provided",
    section: "one",
    value: 111,
    unqualifiedConfigurationTarget: false,
    want: {
      configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
        [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
          ["one", 111],
        ])]
      ]),
    },
  },
  {
    name: "Updates an existing configuration, only for the ConfigurationTarget provided",
    section: "one",
    value: 222,
    unqualifiedConfigurationTarget: vscode.ConfigurationTarget.Workspace,
    startingCfg: {
      configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
        [vscode.ConfigurationTarget.Global, new Map<string, any>([
          ["one", 111],
        ])],
        [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
          ["one", 444],
        ])],
        [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
          ["one", 333],
        ])]
      ]),
    },
    want: {
      configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
        [vscode.ConfigurationTarget.Global, new Map<string, any>([
          ["one", 111],
        ])],
        [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
          ["one", 222],
        ])],
        [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
          ["one", 333],
        ])]
      ]),
    },
  },
  {
    name: "Updates configuration for a language",
    languageId: "valyrian",
    overrideInLanguage: true,
    section: "one",
    value: 111,
    want: {
      languageConfiguration: new Map<string, Map<vscode.ConfigurationTarget, Map<string, any>>>([
        ["valyrian", new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
            ["one", 111],
          ])]
        ])],
      ]),
    },
  },
  {
    name: "Updates configuration if language overrideInLanguage is false",
    languageId: "valyrian",
    overrideInLanguage: false,
    section: "one",
    value: 111,
    want: {
      configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
        [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
          ["one", 111],
        ])],
      ]),
    },
  },
  {
    name: "Updates configuration if language overrideInLanguage is undefined",
    languageId: "valyrian",
    // overrideInLanguage: ...,
    section: "one",
    value: 111,
    want: {
      configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
        [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
          ["one", 111],
        ])],
      ]),
    },
  },
  {
    name: "Updates specific configuration target for a language",
    languageId: "valyrian",
    overrideInLanguage: true,
    section: "one",
    unqualifiedConfigurationTarget: vscode.ConfigurationTarget.Workspace,
    value: 111,
    want: {
      languageConfiguration: new Map<string, Map<vscode.ConfigurationTarget, Map<string, any>>>([
        ["valyrian", new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
            ["one", 111],
          ])]
        ])],
      ]),
    },
  },
  // Scoped config tests
  {
    name: "Creates configuration for a language if it does not exist",
    languageId: "valyrian",
    overrideInLanguage: true,
    section: "v2",
    value: "deux",
    scopedSection: "other.place",
    unqualifiedConfigurationTarget: vscode.ConfigurationTarget.Global,
    startingCfg: {},
    want: {
      languageConfiguration: new Map<string, Map<vscode.ConfigurationTarget, Map<string, any>>>([
        ["valyrian", new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.Global, new Map<string, any>([
            ["other", new Map<string, any>([
              ["place", new Map<string, any>([
                ["v2", "deux"],
              ])],
            ])],
          ])],
        ])],
      ]),
    },
  },
  {
    name: "Inserts leaf into a scoped configuration",
    section: "v2",
    value: "deux",
    scopedSection: "other.place",
    unqualifiedConfigurationTarget: vscode.ConfigurationTarget.Global,
    startingCfg: {
      configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
        [vscode.ConfigurationTarget.Global, new Map<string, any>([
          ["one", 111],
          ["other", new Map<string, any>([
            ["place", new Map<string, any>([
              ["v1", "un"],
              ["v3", "trois"],
            ])],
          ])],
        ])],
        [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
          ["one", 222],
        ])],
        [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
          ["one", 333],
        ])]
      ]),
    },
    want: {
      configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
        [vscode.ConfigurationTarget.Global, new Map<string, any>([
          ["one", 111],
          ["other", new Map<string, any>([
            ["place", new Map<string, any>([
              ["v1", "un"],
              ["v2", "deux"],
              ["v3", "trois"],
            ])],
          ])],
        ])],
        [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
          ["one", 222],
        ])],
        [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
          ["one", 333],
        ])]
      ]),
    },
  },
  {
    name: "Inserts leaf into a scoped configuration for a language",
    languageId: "valyrian",
    overrideInLanguage: true,
    section: "v2",
    value: "deux",
    scopedSection: "other.place",
    unqualifiedConfigurationTarget: vscode.ConfigurationTarget.Global,
    startingCfg: {
      languageConfiguration: new Map<string, Map<vscode.ConfigurationTarget, Map<string, any>>>([
        ["valyrian", new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.Global, new Map<string, any>([
            ["one", 111],
            ["other", new Map<string, any>([
              ["place", new Map<string, any>([
                ["v1", "un"],
                ["v3", "trois"],
              ])],
            ])],
          ])],
          [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
            ["one", 222],
          ])],
          [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
            ["one", 333],
          ])]
        ])],
      ]),
    },
    want: {
      languageConfiguration: new Map<string, Map<vscode.ConfigurationTarget, Map<string, any>>>([
        ["valyrian", new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.Global, new Map<string, any>([
            ["one", 111],
            ["other", new Map<string, any>([
              ["place", new Map<string, any>([
                ["v1", "un"],
                ["v2", "deux"],
                ["v3", "trois"],
              ])],
            ])],
          ])],
          [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
            ["one", 222],
          ])],
          [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
            ["one", 333],
          ])]
        ])],
      ]),
    },
  },
  {
    name: "Inserts nodes and leaf into a scoped configuration",
    section: "v2",
    value: "deux",
    scopedSection: "other.place",
    unqualifiedConfigurationTarget: vscode.ConfigurationTarget.Global,
    startingCfg: {
      configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
        [vscode.ConfigurationTarget.Global, new Map<string, any>([
          ["one", 111],
          ["other", new Map<string, any>([])],
        ])],
        [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
          ["one", 222],
        ])],
        [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
          ["one", 333],
        ])]
      ]),
    },
    want: {
      configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
        [vscode.ConfigurationTarget.Global, new Map<string, any>([
          ["one", 111],
          ["other", new Map<string, any>([
            ["place", new Map<string, any>([
              ["v2", "deux"],
            ])],
          ])],
        ])],
        [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
          ["one", 222],
        ])],
        [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
          ["one", 333],
        ])]
      ]),
    },
  },
  {
    name: "Inserts nodes and leaf into a scoped configuration for a language",
    languageId: "valyrian",
    overrideInLanguage: true,
    section: "v2",
    value: "deux",
    scopedSection: "other.place",
    unqualifiedConfigurationTarget: vscode.ConfigurationTarget.Global,
    startingCfg: {
      languageConfiguration: new Map<string, Map<vscode.ConfigurationTarget, Map<string, any>>>([
        ["valyrian", new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.Global, new Map<string, any>([
            ["one", 111],
            ["other", new Map<string, any>([
              ["place", new Map<string, any>([
                ["v2", "deux"],
              ])],
            ])],
          ])],
          [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
            ["one", 222],
          ])],
          [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
            ["one", 333],
          ])]
        ])],
      ]),
    },
    want: {
      languageConfiguration: new Map<string, Map<vscode.ConfigurationTarget, Map<string, any>>>([
        ["valyrian", new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.Global, new Map<string, any>([
            ["one", 111],
            ["other", new Map<string, any>([
              ["place", new Map<string, any>([
                ["v2", "deux"],
              ])],
            ])],
          ])],
          [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
            ["one", 222],
          ])],
          [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
            ["one", 333],
          ])]
        ])],
      ]),
    },
  },
  {
    name: "Inserts nodes and leaf into an empty scoped configuration",
    section: "v2",
    value: "deux",
    scopedSection: "other.place",
    unqualifiedConfigurationTarget: vscode.ConfigurationTarget.Global,
    startingCfg: {
      configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
        [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
          ["one", 222],
        ])],
        [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
          ["one", 333],
        ])]
      ]),
    },
    want: {
      configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
        [vscode.ConfigurationTarget.Global, new Map<string, any>([
          ["other", new Map<string, any>([
            ["place", new Map<string, any>([
              ["v2", "deux"],
            ])],
          ])],
        ])],
        [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
          ["one", 222],
        ])],
        [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
          ["one", 333],
        ])]
      ]),
    },
  },
  {
    name: "Inserts nodes and leaf into an empty scoped configuration for a language",
    languageId: "valyrian",
    overrideInLanguage: true,
    section: "v2",
    value: "deux",
    scopedSection: "other.place",
    unqualifiedConfigurationTarget: vscode.ConfigurationTarget.Global,
    startingCfg: {
      languageConfiguration: new Map<string, Map<vscode.ConfigurationTarget, Map<string, any>>>([
        ["valyrian", new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
            ["one", 222],
          ])],
          [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
            ["one", 333],
          ])]
        ])],
      ]),
    },
    want: {
      languageConfiguration: new Map<string, Map<vscode.ConfigurationTarget, Map<string, any>>>([
        ["valyrian", new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.Global, new Map<string, any>([
            ["other", new Map<string, any>([
              ["place", new Map<string, any>([
                ["v2", "deux"],
              ])],
            ])],
          ])],
          [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
            ["one", 222],
          ])],
          [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
            ["one", 333],
          ])]
        ])],
      ]),
    },
  },
  {
    name: "Updates a scoped configuration",
    section: "v2",
    value: "deux",
    scopedSection: "other.place",
    unqualifiedConfigurationTarget: vscode.ConfigurationTarget.Global,
    startingCfg: {
      configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
        [vscode.ConfigurationTarget.Global, new Map<string, any>([
          ["one", 111],
          ["other", new Map<string, any>([
            ["place", new Map<string, any>([
              ["v1", "un"],
              ["v2", "TWO"],
              ["v3", "trois"],
            ])],
          ])],
        ])],
        [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
          ["one", 222],
        ])],
        [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
          ["one", 333],
        ])]
      ]),
    },
    want: {
      configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
        [vscode.ConfigurationTarget.Global, new Map<string, any>([
          ["one", 111],
          ["other", new Map<string, any>([
            ["place", new Map<string, any>([
              ["v1", "un"],
              ["v2", "deux"],
              ["v3", "trois"],
            ])],
          ])],
        ])],
        [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
          ["one", 222],
        ])],
        [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
          ["one", 333],
        ])]
      ]),
    },
  },
  {
    name: "Updates a scoped configuration for a language",
    languageId: "valyrian",
    overrideInLanguage: true,
    section: "v2",
    value: "deux",
    scopedSection: "other.place",
    unqualifiedConfigurationTarget: vscode.ConfigurationTarget.Global,
    startingCfg: {
      languageConfiguration: new Map<string, Map<vscode.ConfigurationTarget, Map<string, any>>>([
        ["valyrian", new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.Global, new Map<string, any>([
            ["one", 111],
            ["other", new Map<string, any>([
              ["place", new Map<string, any>([
                ["v1", "un"],
                ["v2", "TWO"],
                ["v3", "trois"],
              ])],
            ])],
          ])],
          [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
            ["one", 222],
          ])],
          [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
            ["one", 333],
          ])]
        ])],
      ]),
    },
    want: {
      languageConfiguration: new Map<string, Map<vscode.ConfigurationTarget, Map<string, any>>>([
        ["valyrian", new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.Global, new Map<string, any>([
            ["one", 111],
            ["other", new Map<string, any>([
              ["place", new Map<string, any>([
                ["v1", "un"],
                ["v2", "deux"],
                ["v3", "trois"],
              ])],
            ])],
          ])],
          [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
            ["one", 222],
          ])],
          [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
            ["one", 333],
          ])]
        ])],
      ]),
    },
  },
  {
    name: "Updates non-language setting if overrideInLanguage is false",
    languageId: "valyrian",
    overrideInLanguage: false,
    section: "v2",
    value: "deux",
    scopedSection: "other.place",
    unqualifiedConfigurationTarget: vscode.ConfigurationTarget.Global,
    startingCfg: {
      languageConfiguration: new Map<string, Map<vscode.ConfigurationTarget, Map<string, any>>>([
        ["valyrian", new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.Global, new Map<string, any>([
            ["one", 111],
            ["other", new Map<string, any>([
              ["place", new Map<string, any>([
                ["v1", "un"],
                ["v2", "TWO"],
                ["v3", "trois"],
              ])],
            ])],
          ])],
          [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
            ["one", 222],
          ])],
          [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
            ["one", 333],
          ])]
        ])],
      ]),
    },
    want: {
      // This is unchanged
      languageConfiguration: new Map<string, Map<vscode.ConfigurationTarget, Map<string, any>>>([
        ["valyrian", new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.Global, new Map<string, any>([
            ["one", 111],
            ["other", new Map<string, any>([
              ["place", new Map<string, any>([
                ["v1", "un"],
                ["v2", "TWO"],
                ["v3", "trois"],
              ])],
            ])],
          ])],
          [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
            ["one", 222],
          ])],
          [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
            ["one", 333],
          ])]
        ])],
      ]),
      // This is added
      configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
        [vscode.ConfigurationTarget.Global, new Map<string, any>([
          ["other", new Map<string, any>([
            ["place", new Map<string, any>([
              ["v2", "deux"],
            ])],
          ])],
        ])],
      ]),
    },
  },
  {
    name: "Updates non-language setting if overrideInLanguage is false",
    languageId: "valyrian",
    overrideInLanguage: false,
    section: "place.v2",
    value: "deux",
    scopedSection: "other",
    unqualifiedConfigurationTarget: vscode.ConfigurationTarget.Global,
    startingCfg: {
      languageConfiguration: new Map<string, Map<vscode.ConfigurationTarget, Map<string, any>>>([
        ["valyrian", new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.Global, new Map<string, any>([
            ["one", 111],
            ["other", new Map<string, any>([
              ["place", new Map<string, any>([
                ["v1", "un"],
                ["v2", "TWO"],
                ["v3", "trois"],
              ])],
            ])],
          ])],
          [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
            ["one", 222],
          ])],
          [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
            ["one", 333],
          ])]
        ])],
      ]),
    },
    want: {
      // This is unchanged
      languageConfiguration: new Map<string, Map<vscode.ConfigurationTarget, Map<string, any>>>([
        ["valyrian", new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.Global, new Map<string, any>([
            ["one", 111],
            ["other", new Map<string, any>([
              ["place", new Map<string, any>([
                ["v1", "un"],
                ["v2", "TWO"],
                ["v3", "trois"],
              ])],
            ])],
          ])],
          [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
            ["one", 222],
          ])],
          [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
            ["one", 333],
          ])]
        ])],
      ]),
      // This is added
      configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
        [vscode.ConfigurationTarget.Global, new Map<string, any>([
          ["other", new Map<string, any>([
            ["place", new Map<string, any>([
              ["v2", "deux"],
            ])],
          ])],
        ])],
      ]),
    },
  },
  /* Useful for commenting out tests. */
];

suite('FakeWorkspaceConfiguration tests', () => {
  testCases.forEach(tc => {
    test(tc.name, async () => {
      const sc: StubbablesConfigInternal = {};

      const parts = tc.scopedSection === undefined ? [] : tc.scopedSection.split(".");
      const cfg = new FakeScopedWorkspaceConfiguration(sc, mustWorkspaceConfiguration(tc.startingCfg), parts, tc.languageId);
      await cfg.update(tc.section, tc.value, tc.unqualifiedConfigurationTarget, tc.overrideInLanguage);

      const want = new FakeScopedWorkspaceConfiguration(sc, mustWorkspaceConfiguration(tc.want), parts, tc.languageId);
      assert.deepStrictEqual(cfg, want);
      assert.deepStrictEqual(sc, {
        gotWorkspaceConfiguration: {
          configuration: tc.want?.configuration || new Map<vscode.ConfigurationTarget, Map<string, any>>(),
          languageConfiguration: tc.want?.languageConfiguration || new Map<string, Map<vscode.ConfigurationTarget, Map<string, any>>>(),
        },
      });
    });
  });
});
