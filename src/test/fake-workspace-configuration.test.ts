import assert from "assert";
import vscode from "vscode";
import { FakeWorkspaceConfiguration, WorkspaceConfiguration } from "..";

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
];

suite('FakeWorkspaceConfiguration tests', () => {
  testCases.forEach(tc => {
    test(tc.name, async () => {
      const cfg = new FakeWorkspaceConfiguration(tc.startingCfg);
      await cfg.update(tc.section, tc.value, tc.unqualifiedConfigurationTarget);

      const want = new FakeWorkspaceConfiguration(tc.want);
      assert.deepStrictEqual(cfg, want);
    });
  });
});
