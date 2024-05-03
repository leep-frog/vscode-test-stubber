import assert from "assert";
import vscode from "vscode";
import { FakeWorkspaceConfiguration } from "..";
import { WorkspaceConfiguration } from "../workspace-configuration";

suite("Error tests", () => {

  test("inspect throws an error", () => {
    const cfg = new FakeWorkspaceConfiguration();
    assert.throws(() => cfg.inspect("section"), new Error("FakeWorkspaceConfiguration.inspect is not yet supported"));

    const scopedCfg = cfg.scopedConfiguration([]);
    assert.throws(() => scopedCfg.inspect("section"), new Error("FakeScopedWorkspaceConfiguration.inspect is not yet supported"));
  });

  test("update throws an error", async () => {
    const cfg = new FakeWorkspaceConfiguration();
    assert.rejects(() => cfg.update("section", "value", true, true), new Error("overrideInLanguage is not yet supported"));

    const scopedCfg = cfg.scopedConfiguration([]);
    assert.rejects(() => scopedCfg.update("section", "value", true, true), new Error("overrideInLanguage is not yet supported"));
  });
});

interface TestCase {
  name: string;
  startingCfg?: WorkspaceConfiguration;
  section: string;
  scopedSection?: string;
  value: any;
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
    want: new Map<vscode.ConfigurationTarget, Map<string, any>>([
      [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
        ["one", 111],
      ])]
    ]),
  },
  {
    name: "Updates Workspace target configuration if null ConfigurationTarget",
    section: "one",
    value: 111,
    unqualifiedConfigurationTarget: null,
    want: new Map<vscode.ConfigurationTarget, Map<string, any>>([
      [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
        ["one", 111],
      ])]
    ]),
  },
  {
    name: "Updates Global target configuration if ConfigurationTarget.Global provided",
    section: "one",
    value: 111,
    unqualifiedConfigurationTarget: vscode.ConfigurationTarget.Global,
    want: new Map<vscode.ConfigurationTarget, Map<string, any>>([
      [vscode.ConfigurationTarget.Global, new Map<string, any>([
        ["one", 111],
      ])]
    ]),
  },
  {
    name: "Updates Workspace target configuration if ConfigurationTarget.Workspace provided",
    section: "one",
    value: 111,
    unqualifiedConfigurationTarget: vscode.ConfigurationTarget.Workspace,
    want: new Map<vscode.ConfigurationTarget, Map<string, any>>([
      [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
        ["one", 111],
      ])]
    ]),
  },
  {
    name: "Updates WorkspaceFolder target configuration if ConfigurationTarget.WorkspaceFolder provided",
    section: "one",
    value: 111,
    unqualifiedConfigurationTarget: vscode.ConfigurationTarget.WorkspaceFolder,
    want: new Map<vscode.ConfigurationTarget, Map<string, any>>([
      [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
        ["one", 111],
      ])]
    ]),
  },
  {
    name: "Updates Global target configuration if (ConfigurationTarget = true) provided",
    section: "one",
    value: 111,
    unqualifiedConfigurationTarget: true,
    want: new Map<vscode.ConfigurationTarget, Map<string, any>>([
      [vscode.ConfigurationTarget.Global, new Map<string, any>([
        ["one", 111],
      ])]
    ]),
  },
  {
    name: "Updates Workspace target configuration if (ConfigurationTarget = false) provided",
    section: "one",
    value: 111,
    unqualifiedConfigurationTarget: false,
    want: new Map<vscode.ConfigurationTarget, Map<string, any>>([
      [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
        ["one", 111],
      ])]
    ]),
  },
  {
    name: "Updates an existing configuration, only for the ConfigurationTarget provided",
    section: "one",
    value: 222,
    unqualifiedConfigurationTarget: vscode.ConfigurationTarget.Workspace,
    startingCfg: new Map<vscode.ConfigurationTarget, Map<string, any>>([
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
    want: new Map<vscode.ConfigurationTarget, Map<string, any>>([
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
  // Scoped config tests
  {
    name: "Inserts leaf into a scoped configuration",
    section: "v2",
    value: "deux",
    scopedSection: "other.place",
    unqualifiedConfigurationTarget: vscode.ConfigurationTarget.Global,
    startingCfg: new Map<vscode.ConfigurationTarget, Map<string, any>>([
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
    want: new Map<vscode.ConfigurationTarget, Map<string, any>>([
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
  {
    name: "Inserts nodes and leaf into a scoped configuration",
    section: "v2",
    value: "deux",
    scopedSection: "other.place",
    unqualifiedConfigurationTarget: vscode.ConfigurationTarget.Global,
    startingCfg: new Map<vscode.ConfigurationTarget, Map<string, any>>([
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
    want: new Map<vscode.ConfigurationTarget, Map<string, any>>([
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
  {
    name: "Inserts nodes and leaf into an empty scoped configuration",
    section: "v2",
    value: "deux",
    scopedSection: "other.place",
    unqualifiedConfigurationTarget: vscode.ConfigurationTarget.Global,
    startingCfg: new Map<vscode.ConfigurationTarget, Map<string, any>>([
      [vscode.ConfigurationTarget.Workspace, new Map<string, any>([
        ["one", 222],
      ])],
      [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
        ["one", 333],
      ])]
    ]),
    want: new Map<vscode.ConfigurationTarget, Map<string, any>>([
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
  {
    name: "Updates a scoped configuration",
    section: "v2",
    value: "deux",
    scopedSection: "other.place",
    unqualifiedConfigurationTarget: vscode.ConfigurationTarget.Global,
    startingCfg: new Map<vscode.ConfigurationTarget, Map<string, any>>([
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
    want: new Map<vscode.ConfigurationTarget, Map<string, any>>([
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
];

suite('FakeWorkspaceConfiguration tests', () => {
  testCases.forEach(tc => {
    test(tc.name, async () => {
      const globalCfg = new FakeWorkspaceConfiguration(tc.startingCfg);
      const cfg = (tc.scopedSection === undefined) ? globalCfg : globalCfg.scopedConfiguration(tc.scopedSection.split("."));
      await cfg.update(tc.section, tc.value, tc.unqualifiedConfigurationTarget);

      const want = new FakeWorkspaceConfiguration(tc.want);
      assert.deepStrictEqual(globalCfg, want);
    });
  });
});
