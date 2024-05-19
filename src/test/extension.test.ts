
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import path from 'path';
import * as vscode from 'vscode';
import { CustomButton, Item } from '../extension';
import { PressItemButtonQuickPickAction, PressUnknownButtonQuickPickAction, SelectItemQuickPickAction } from '../quick-pick';
import { StubbablesConfig } from '../run-stubbable';
import { SimpleTestCase, SimpleTestCaseProps, cmd } from '../test-case';
// import * as myExtension from '../../extension';

export const stubbableTestFile = path.resolve("..", "..", ".vscode-test", "stubbable-file.json");

interface TestCase {
  name: string;
  sc: StubbablesConfig;
  stc: SimpleTestCaseProps;
  runSolo?: boolean;
}

function qpe(...items: Item[]): vscode.QuickPickItem[] {
  return items;
}

function btn(...bs: CustomButton[]): vscode.QuickInputButton[] {
  return bs;
}

function basicQPE() {
  return qpe(
    {
      label: 'abc',
      extra: 'info',
    },
    {
      label: 'DEF',
      description: 'Desc string',
      detail: 'detail str',
      fields: 456,
      extra: 'has numbers',
    },
    {
      label: 'ghi',
      extra: 'stuff',
      fields: 789,
      buttons: btn(
        {
          iconPath: {
            id: "star",
          },
          more: "more stuff: star",
        },
        {
          iconPath: {
            id: "close",
          },
          more: "more stuff: close",
          tooltip: "Remove the thing",
        },
      ),
    },
  );
}

const testCases: TestCase[] = [
  {
    name: "Does absolutely nothing",
    sc: {},
    stc: {},
  },
  {
    name: "Does nothing command",
    sc: {},
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.doNothing"),
      ],
    },
  },
  // WorkspaceConfiguration tests
  {
    name: "Does nothing command with initial WorkspaceConfiguration and expected WorkspaceConfiguration",
    sc: {},
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.doNothing"),
      ],
      workspaceConfiguration: {
        configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
            ["hello", "there"],
          ])],
        ]),
      },
      expectedWorkspaceConfiguration: {
        configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
            ["hello", "there"],
          ])],
        ]),
      },
    },
  },
  {
    name: "Does nothing command with initial WorkspaceConfiguration and no expected WorkspaceConfiguration",
    sc: {},
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.doNothing"),
      ],
      workspaceConfiguration: {
        configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
            ["hello", "there"],
          ])],
        ]),
      },
    },
  },
  {
    name: "Creates config",
    sc: {},
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.updateSettings"),
      ],
      expectedWorkspaceConfiguration: {
        configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
            ["stubber", new Map<string, any>([
              ["some-key", "some-value"],
            ])],
          ])],
        ]),
      },
    },
  },
  {
    name: "Updates existing config",
    sc: {},
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.updateSettings"),
      ],
      workspaceConfiguration: {
        configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
            ["stubber", new Map<string, any>([
              ["other", "value"],
            ])],
          ])],
        ]),
      },
      expectedWorkspaceConfiguration: {
        configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
            ["stubber", new Map<string, any>([
              ["other", "value"],
              ["some-key", "some-value"],
            ])],
          ])],
        ]),
      },
    },
  },
  {
    name: "Use starting config as expected config if no updates",
    sc: {},
    stc: {
      workspaceConfiguration: {
        configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
            ["stubber", new Map<string, any>([
              ["other", "value"],
            ])],
          ])],
        ]),
      },
    },
  },
  // Quick pick tests
  // TODO: Error tests
  /*{
    name: "[QuickPick] Select items when no quickPick",
    sc: {},
    stc: {
      userInteractions: [
        new SelectItemQuickPickAction([]),
      ],
    },
  },*/
  {
    name: "[QuickPick] Select no items",
    sc: {
      expectedInfoMessages: [
        'Picked items (0) []',
      ]
    },
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick'),
        new SelectItemQuickPickAction([]),
      ],
      expectedQuickPicks: [basicQPE()],
    },
  },
  {
    name: "[QuickPick] Select one item",
    sc: {
      expectedInfoMessages: [
        'Picked items (1) [DEF]',
      ]
    },
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick'),
        new SelectItemQuickPickAction(['DEF']),
      ],
      expectedQuickPicks: [basicQPE()],
    },
  },
  {
    name: "[QuickPick] Select multiple items",
    sc: {
      expectedInfoMessages: [
        'Picked items (2) [abc_ghi]',
      ]
    },
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick'),
        new SelectItemQuickPickAction(['abc', 'ghi']),
      ],
      expectedQuickPicks: [basicQPE()],
    },
  },
  // TODO: Test CloseQuickPickAction by closing and then running selectItem and verifying error
  {
    name: "[QuickPick] Press an unknown button",
    sc: {
      expectedErrorMessages: [
        'Unknown item button',
      ],
    },
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick'),
        new PressUnknownButtonQuickPickAction('ghi'),
      ],
      expectedQuickPicks: [basicQPE()],
    },
  },
  {
    name: "[QuickPick] Press an item button",
    sc: {
      expectedInfoMessages: [
        `Got button: {"iconPath":{"id":"close"},"tooltip":"Remove the thing","more":"more stuff: close"}`,
      ]
    },
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick'),
        new PressItemButtonQuickPickAction('ghi', 1),
      ],
      expectedQuickPicks: [basicQPE()],
    },
  },
  /* Useful for commenting out tests. */
];

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

  const solo = testCases.some(tc => tc.runSolo);

  testCases.forEach(tc => {

    if (solo && !tc.runSolo) {
      return;
    }

    test(tc.name, async () => {
      await new SimpleTestCase(tc.stc).runTest(stubbableTestFile, tc.sc).catch(e => {
        throw e;
      });
    });
	});
});
