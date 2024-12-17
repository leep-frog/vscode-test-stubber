
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { CustomButton, Item } from '../extension';
import { PressItemButtonQuickPickAction, PressUnknownButtonQuickPickAction, SelectActiveItems, SelectItemQuickPickAction } from '../quick-pick';
import { SimpleTestCase, SimpleTestCaseProps, Waiter, cmd } from '../test-case';
// import * as myExtension from '../../extension';

interface TestCase {
  name: string;
  stc: SimpleTestCaseProps;
  runSolo?: boolean;
}

function qpe(...items: Item[]): vscode.QuickPickItem[] {
  return items;
}

function ipo(opt: vscode.InputBoxOptions): vscode.InputBoxOptions {
  return opt;
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
    stc: {},
  },
  {
    name: "Does nothing command",
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.doNothing"),
      ],
    },
  },
  {
    name: "Waiter stops checking after maxAttempts",
    stc: {
      userInteractions: [
        new Waiter(1, () => {
          vscode.window.showInformationMessage("waiter called");
          return false;
        }, 3),
      ],
      expectedInfoMessages: [
        "waiter called",
        "waiter called",
        "waiter called",
      ],
    },
  },
  {
    name: "Waiter stops after condition is met",
    stc: {
      userInteractions: [
        (() => {
          let count = 0;
          return new Waiter(1, () => {
            vscode.window.showInformationMessage("waiter called");
            count++;
            return count === 5;
          });
        })(),
      ],
      expectedInfoMessages: [
        "waiter called",
        "waiter called",
        "waiter called",
        "waiter called",
        "waiter called",
      ],
    },
  },
  // Message tests
  {
    name: "Sends info messages",
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.info", "hello there"),
      ],
      expectedInfoMessages: [
        "hello there",
      ],
    },
  },
  {
    name: "Sends warning messages",
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.warning", "oops"),
        cmd("vscode-test-stubber.warning", "a"),
        cmd("vscode-test-stubber.warning", "daisy"),
      ],
      expectedWarningMessages: [
        "oops",
        "a",
        "daisy",
      ],
    },
  },
  {
    name: "Sends error messages",
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.error", "oh"),
        cmd("vscode-test-stubber.error", "nooooo"),
      ],
      expectedErrorMessages: [
        "oh",
        "nooooo",
      ],
    },
  },
  // WorkspaceConfiguration tests
  {
    name: "Does nothing command with initial WorkspaceConfiguration and expected WorkspaceConfiguration",
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
    stc: {
      userInteractions: [
        new SelectItemQuickPickAction([]),
      ],
    },
  },*/
  {
    name: "[QuickPick] Select no items",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick'),
        new SelectItemQuickPickAction([]),
      ],
      expectedQuickPicks: [basicQPE()],
      expectedInfoMessages: [
        'Picked items (0) []',
      ],
    },
  },
  {
    name: "[QuickPick] Select one item",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick'),
        new SelectItemQuickPickAction(['DEF']),
      ],
      expectedQuickPicks: [basicQPE()],
      expectedInfoMessages: [
        'Picked items (1) [DEF]',
      ],
    },
  },
  {
    name: "[QuickPick] Select no active items",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick'),
        new SelectActiveItems(),
      ],
      expectedQuickPicks: [basicQPE()],
      expectedInfoMessages: [
        'Picked items (0) []',
      ],
    },
  },
  {
    name: "[QuickPick] Select one active item",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick', {
          activeItems: [2],
        }),
        new SelectActiveItems(),
      ],
      expectedQuickPicks: [basicQPE()],
      expectedInfoMessages: [
        'Picked items (1) [ghi]',
      ],
    },
  },
  {
    name: "[QuickPick] Select multiple active items",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick', {
          activeItems: [0, 2],
        }),
        new SelectActiveItems(),
      ],
      expectedQuickPicks: [basicQPE()],
      expectedInfoMessages: [
        'Picked items (2) [abc_ghi]',
      ],
    },
  },
  {
    name: "[QuickPick] Select all items in order",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick', {
          activeItems: [0, 1, 2],
        }),
        new SelectActiveItems(),
      ],
      expectedQuickPicks: [basicQPE()],
      expectedInfoMessages: [
        'Picked items (3) [abc_DEF_ghi]',
      ],
    },
  },
  {
    name: "[QuickPick] Select all items not in order",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick', {
          activeItems: [2, 0, 1],
        }),
        new SelectActiveItems(),
      ],
      expectedQuickPicks: [basicQPE()],
      expectedInfoMessages: [
        'Picked items (3) [ghi_abc_DEF]',
      ],
    },
  },
  {
    name: "[QuickPick] Select one active item after move",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick', {
          activeItems: [2],
        }),
        cmd('workbench.action.quickOpenNavigatePreviousInFilePicker'),
        new SelectActiveItems(),
      ],
      expectedQuickPicks: [basicQPE()],
      expectedInfoMessages: [
        'Picked items (1) [DEF]',
      ],
    },
  },
  {
    name: "[QuickPick] Select multiple items",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick'),
        new SelectItemQuickPickAction(['abc', 'ghi']),
      ],
      expectedQuickPicks: [basicQPE()],
      expectedInfoMessages: [
        'Picked items (2) [abc_ghi]',
      ],
    },
  },
  // TODO: Test CloseQuickPickAction by closing and then running selectItem and verifying error
  {
    name: "[QuickPick] Press an unknown button",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick'),
        new PressUnknownButtonQuickPickAction('ghi'),
      ],
      expectedQuickPicks: [basicQPE()],
      expectedErrorMessages: [
        'Unknown item button',
      ],
    },
  },
  {
    name: "[QuickPick] Press an item button",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick'),
        new PressItemButtonQuickPickAction('ghi', 1),
      ],
      expectedQuickPicks: [basicQPE()],
      expectedInfoMessages: [
        `Got button: {"iconPath":{"id":"close"},"tooltip":"Remove the thing","more":"more stuff: close"}`,
      ],
    },
  },
  // Input box tests
  {
    name: "[InputBox] Handles no input box options",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.inputBox'),
      ],
      inputBoxResponses: ["start"],
      expectedInputBoxes: [{
        options: undefined,
      }],
      expectedInfoMessages: [
        `Got input box response: start`,
      ],
    },
  },
  {
    name: "[InputBox] Handles null input box response",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.inputBox', ipo({
          prompt: "Nada",
        })),
      ],
      inputBoxResponses: [undefined],
      expectedInputBoxes: [{
        options: {
          prompt: "Nada",
          validateInputProvided: false,
        },
      }],
      expectedInfoMessages: [
        `Got undefined input box response`,
      ],
    },
  },
  {
    name: "[InputBox] Handles string input box response",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.inputBox', ipo({
          title: "An input box",
        })),
      ],
      inputBoxResponses: ["some response"],
      expectedInputBoxes: [{
        options: {
          title: "An input box",
          validateInputProvided: false,
        },
      }],
      expectedInfoMessages: [
        `Got input box response: some response`,
      ],
    },
  },
  {
    name: "[InputBox] Compares all fields in options",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.inputBox', ipo({
          title: "An input box",
          ignoreFocusOut: true,
          password: true,
          placeHolder: "ph",
          prompt: "prmpt",
          validateInput: () => undefined,
        })),
      ],
      inputBoxResponses: ["another response"],
      expectedInputBoxes: [{
        options: {
          title: "An input box",
          ignoreFocusOut: true,
          password: true,
          placeHolder: "ph",
          prompt: "prmpt",
          validateInputProvided: true,
        },
      }],
      expectedInfoMessages: [
        `Got input box response: another response`,
      ],
    },
  },
  {
    name: "[InputBox] Returns undefined for invalid input (string input)",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.inputBox', ipo({
          title: "An input box",
          validateInput: (s) => {
            if (s.length <= 3) {
              return {
                message: "String is too short",
                severity: vscode.InputBoxValidationSeverity.Warning,
              };
            }
          },
        })),
      ],
      inputBoxResponses: ["abc"],
      expectedInputBoxes: [{
        options: {
          title: "An input box",
          validateInputProvided: true,
        },
        validationMessage: {
          message: "String is too short",
          severity: vscode.InputBoxValidationSeverity.Warning,
        },
      }],
      expectedInfoMessages: [
        `Got undefined input box response`,
      ],
    },
  },
  {
    name: "[InputBox] Returns undefined for invalid input (undefined input)",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.inputBox', ipo({
          title: "An input box",
          validateInput: (s) => {
            if (s.length <= 3) {
              return {
                message: "String is too short",
                severity: vscode.InputBoxValidationSeverity.Warning,
              };
            }
          },
        })),
      ],
      inputBoxResponses: [undefined],
      expectedInputBoxes: [{
        options: {
          title: "An input box",
          validateInputProvided: true,
        },
        validationMessage: {
          message: "String is too short",
          severity: vscode.InputBoxValidationSeverity.Warning,
        },
      }],
      expectedInfoMessages: [
        `Got undefined input box response`,
      ],
    },
  },
  {
    name: "[InputBox] Returns string for valid input (string input)",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.inputBox', ipo({
          title: "An input box",
          validateInput: (s) => {
            if (s.length > 3) {
              return {
                message: "String is too long",
                severity: vscode.InputBoxValidationSeverity.Info,
              };
            }
          },
        })),
      ],
      inputBoxResponses: ["abc"],
      expectedInputBoxes: [{
        options: {
          title: "An input box",
          validateInputProvided: true,
        },
      }],
      expectedInfoMessages: [
        `Got input box response: abc`,
      ],
    },
  },
  {
    name: "[InputBox] Returns undefined for valid input (undefined input)",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.inputBox', ipo({
          title: "An input box",
          validateInput: (s) => {
            if (s !== "") {
              return {
                message: "Expected undefined to get mapped to the empty string for validation function input",
                severity: vscode.InputBoxValidationSeverity.Error,
              };
            }
          },
        })),
      ],
      inputBoxResponses: [undefined],
      expectedInputBoxes: [{
        options: {
          title: "An input box",
          validateInputProvided: true,
        },
      }],
      expectedInfoMessages: [
        `Got undefined input box response`,
      ],
    },
  },
  // Notebook tests
  // {
  //   name: "[QuickPick] Select multiple items",
  //   stc: {
  //     userInteractions: [
  //       openNotebook(__dirname, "..", "..", "src", "test", "simple-notebook.ipynb"),
  //       delay(20000),
  //     ],
  //   },
  // },
  /* Useful for commenting out tests. */
];

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  const solo = testCases.some(tc => tc.runSolo);

  testCases.filter(tc => !solo || tc.runSolo).forEach(tc => {

    test(tc.name, async () => {
      await new SimpleTestCase(tc.stc).runTest().catch(e => {
        throw e;
      });
    });
  });
});
