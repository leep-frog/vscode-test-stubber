
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import assert, { AssertionError } from 'assert';
import { writeFileSync } from 'fs';
import path from 'path';
import * as vscode from 'vscode';
import { CustomButton, Item } from '../extension';
import { CloseQuickPickAction, PressItemButtonQuickPickAction, PressUnknownButtonQuickPickAction, SelectActiveItems, SelectItemQuickPickAction } from '../quick-pick';
import { SimpleTestCase, SimpleTestCaseProps, Waiter, cmd, combineInteractions, delay, funcInteraction, openFile } from '../test-case';
// import * as myExtension from '../../extension';

function relFilePath(...filename: string[]) {
  return path.resolve(__dirname, "..", "..", "src", "test", "test-workspace", path.join(...filename));
}

interface TestCase {
  name: string;
  stc: SimpleTestCaseProps;
  runSolo?: boolean;
}

interface ErrorTestCase extends TestCase {
  wantError: string;
}

function qpe(...items: (string | Item)[]): (string | vscode.QuickPickItem)[] {
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
    'just a string label',
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
      informationMessage: {
        expectedMessages: [
          "waiter called",
          "waiter called",
          "waiter called",
        ],
      },
    },
  },
  {
    name: "Waiter accepts async method",
    stc: {
      userInteractions: [
        new Waiter(1, async () => {
          vscode.window.showInformationMessage("waiter pre");
          await delay(50).do();
          vscode.window.showInformationMessage("waiter post");
          return false;
        }, 2),
      ],
      informationMessage: {
        expectedMessages: [
          "waiter pre",
          "waiter post",
          "waiter pre",
          "waiter post",
        ],
      },
    },
  },
  {
    name: "funcInteraction works",
    stc: {
      userInteractions: [
        funcInteraction(() => {
          vscode.window.showErrorMessage(`fi`);
        }),
      ],
      errorMessage: {
        expectedMessages: [
          "fi",
        ],
      },
    },
  },
  {
    name: "funcInteraction works with async method",
    stc: {
      userInteractions: [
        funcInteraction(async () => {
          vscode.window.showErrorMessage(`fi2`);
        }),
      ],
      errorMessage: {
        expectedMessages: [
          "fi2",
        ],
      },
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
      informationMessage: {
        expectedMessages: [
          "waiter called",
          "waiter called",
          "waiter called",
          "waiter called",
          "waiter called",
        ],
      },
    },
  },
  {
    name: "combineInteractions works",
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.info", "un"),
        combineInteractions(
          cmd("vscode-test-stubber.info", "deux"),
          cmd("vscode-test-stubber.warning", "trois"),
          cmd("vscode-test-stubber.info", "quatre"),
        ),
        cmd("vscode-test-stubber.info", "five"),
        cmd("vscode-test-stubber.warning", "six"),
      ],
      informationMessage: {
        expectedMessages: [
          "un",
          "deux",
          "quatre",
          "five",
        ],
      },
      warningMessage: {
        expectedMessages: [
          "trois",
          "six",
        ],
      },
    },
  },
  {
    name: "text works for initialization",
    stc: {
      text: [
        "abc",
        "def",
        "gj",
        "",
      ],
      expectedText: [
        "abc",
        "def",
        "ghij",
        "",
      ],
      selections: [
        new vscode.Selection(0, 2, 0, 2),
      ],
      userInteractions: [
        cmd('cursorDown'),
        cmd('cursorDown'),
        cmd('cursorLeft'),
        cmd('type', { text: 'hi' }),
      ],
      expectedSelections: [
        new vscode.Selection(2, 3, 2, 3),
      ],
    },
  },
  {
    name: "file works for initialization",
    stc: {
      file: relFilePath("simple.go"),
      selections: [
        new vscode.Selection(2, 4, 2, 4),
      ],
      userInteractions: [
        cmd('cursorDown'),
        cmd('cursorDown'),
        cmd('cursorRight'),
      ],
      expectedSelections: [
        new vscode.Selection(4, 5, 4, 5),
      ],
      expectedText: [
        "package main",
        "",
        'import "fmt"',
        "",
        "func main() {",
        '\tfmt.Println("Hello, world!")',
        "}",
        "",
      ],
    },
  },
  {
    name: "openFile works",
    stc: {
      userInteractions: [
        openFile(relFilePath("simple.go")),
      ],
      expectedSelections: [
        new vscode.Selection(4, 5, 4, 5),
      ],
      expectedText: [
        "package main",
        "",
        'import "fmt"',
        "",
        "func main() {",
        '\tfmt.Println("Hello, world!")',
        "}",
        "",
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
      informationMessage: {
        expectedMessages: [
          "hello there",
        ],
      },
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
      warningMessage: {
        expectedMessages: [
          "oops",
          "a",
          "daisy",
        ],
      },
    },
  },
  {
    name: "Sends error messages",
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.error", "oh"),
        cmd("vscode-test-stubber.error", "nooooo"),
      ],
      errorMessage: {
        expectedMessages: [
          "oh",
          "nooooo",
        ],
      },
    },
  },
  {
    name: "Ignores message ordering if specified",
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.info", "abc"),
        cmd("vscode-test-stubber.info", "one"),
        cmd("vscode-test-stubber.info", "alpha"),
      ],
      informationMessage: {
        ignoreOrder: true,
        expectedMessages: [
          "alpha",
          "abc",
          "one",
        ],
      },
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
  },
  {
    name: "Does nothing command with initial WorkspaceConfiguration and no expected WorkspaceConfiguration",
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.doNothing"),
      ],
      workspaceConfiguration: {
        workspaceConfiguration: {
          configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
            [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
              ["hello", "there"],
            ])],
          ]),
        },
      },
    },
  },
  {
    name: "Creates config",
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.updateSettings"),
      ],
      workspaceConfiguration: {
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
  },
  {
    name: "Updates existing config",
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.updateSettings"),
      ],
      workspaceConfiguration: {
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
  },
  {
    name: "Use starting config as expected config if no updates",
    stc: {
      workspaceConfiguration: {
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
  },
  // getConfiguration tests (more thorough tests are done in src/test/workspace-configuration.test.ts)
  {
    name: "Handles getting missing key",
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.getConfiguration", {
          key: "other",
          section: "hello",
        }),
      ],
      workspaceConfiguration: {
        workspaceConfiguration: {
          configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
            [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
              ["stubber", new Map<string, any>([
                ["hello", "there"],
              ])],
            ])],
          ]),
        },
      },
      informationMessage: {
        expectedMessages: ["undefined"],
      }
    },
  },
  {
    name: "Handles getting missing section",
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.getConfiguration", {
          key: "stubber",
          section: "goodbye",
        }),
      ],
      workspaceConfiguration: {
        workspaceConfiguration: {
          configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
            [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
              ["stubber", new Map<string, any>([
                ["hello", "there"],
              ])],
            ])],
          ]),
        },
      },
      informationMessage: {
        expectedMessages: ["undefined"],
      }
    },
  },
  {
    name: "Gets a valid configuration",
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.getConfiguration", {
          key: "stubber",
          section: "hello",
        }),
      ],
      workspaceConfiguration: {
        workspaceConfiguration: {
          configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
            [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
              ["stubber", new Map<string, any>([
                ["hello", "there"],
              ])],
            ])],
          ]),
        },
      },
      informationMessage: {
        expectedMessages: ['"there"'],
      }
    },
  },
  {
    name: "Gets a valid language configuration",
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.getConfiguration", {
          scope: {
            languageId: "valyrian",
          },
          key: "stubber",
          section: "one",
        }),
      ],
      workspaceConfiguration: {
        workspaceConfiguration: {
          languageConfiguration: new Map<string, Map<vscode.ConfigurationTarget, Map<string, any>>>([
            ["valyrian", new Map<vscode.ConfigurationTarget, Map<string, any>>([
              [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
                ["stubber", new Map<string, any>([
                  ["one", 111]
                ])],
              ])]
            ])],
          ]),
        },
      },
      informationMessage: {
        expectedMessages: ['111'],
      }
    },
  },
  // Quick pick tests
  {
    name: "[QuickPick] Select no items",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick'),
        new SelectItemQuickPickAction([]),
      ],
      quickPick: {
        expectedQuickPicks: [basicQPE()],
      },
      informationMessage: {
        expectedMessages: [
          'Picked items (0) []',
        ],
      },
    },
  },
  {
    name: "[QuickPick] Select one item",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick'),
        new SelectItemQuickPickAction(['DEF']),
      ],
      quickPick: {
        expectedQuickPicks: [basicQPE()],
      },
      informationMessage: {
        expectedMessages: [
          'Picked items (1) [DEF]',
        ],
      },
    },
  },
  {
    name: "[QuickPick] Select no active items",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick'),
        new SelectActiveItems(),
      ],
      quickPick: {
        expectedQuickPicks: [basicQPE()],
      },
      informationMessage: {
        expectedMessages: [
          'Picked items (0) []',
        ],
      },
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
      quickPick: {
        expectedQuickPicks: [basicQPE()],
      },
      informationMessage: {
        expectedMessages: [
          'Picked items (1) [ghi]',
        ],
      },
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
      quickPick: {
        expectedQuickPicks: [basicQPE()],
      },
      informationMessage: {
        expectedMessages: [
          'Picked items (2) [abc_ghi]',
        ],
      },
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
      quickPick: {
        expectedQuickPicks: [basicQPE()],
      },
      informationMessage: {
        expectedMessages: [
          'Picked items (3) [abc_DEF_ghi]',
        ],
      },
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
      quickPick: {
        expectedQuickPicks: [basicQPE()],
      },
      informationMessage: {
        expectedMessages: [
          'Picked items (3) [ghi_abc_DEF]',
        ],
      },
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
      quickPick: {
        expectedQuickPicks: [basicQPE()],
      },
      informationMessage: {
        expectedMessages: [
          'Picked items (1) [DEF]',
        ],
      },
    },
  },
  {
    name: "[QuickPick] Select multiple items",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick'),
        new SelectItemQuickPickAction(['abc', 'ghi']),
      ],
      quickPick: {
        expectedQuickPicks: [basicQPE()],
      },
      informationMessage: {
        expectedMessages: [
          'Picked items (2) [abc_ghi]',
        ],
      },
    },
  },
  {
    name: "[QuickPick] Close and re-open",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick'),
        new CloseQuickPickAction(),
        cmd('vscode-test-stubber.quickPick'),
        new SelectItemQuickPickAction(['DEF']),
      ],
      quickPick: {
        expectedQuickPicks: [basicQPE(), basicQPE()],
      },
      informationMessage: {
        expectedMessages: [
          'Picked items (1) [DEF]',
        ],
      },
    },
  },
  {
    name: "[QuickPick] Press an unknown button",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick'),
        new PressUnknownButtonQuickPickAction('ghi'),
      ],
      quickPick: {
        expectedQuickPicks: [basicQPE()],
      },
      errorMessage: {
        expectedMessages: [
          'Unknown item button',
        ],
      },
    },
  },
  {
    name: "[QuickPick] Press an item button",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick'),
        new PressItemButtonQuickPickAction('ghi', 1),
      ],
      quickPick: {
        expectedQuickPicks: [basicQPE()],
      },
      informationMessage: {
        expectedMessages: [
          `Got button: {"iconPath":{"id":"close"},"tooltip":"Remove the thing","more":"more stuff: close"}`,
        ],
      },
    },
  },
  // Input box tests
  {
    name: "[InputBox] Handles no input box options",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.inputBox'),
      ],
      inputBox: {
        inputBoxResponses: ["start"],
        expectedInputBoxes: [{
          options: undefined,
        }],
      },
      informationMessage: {
        expectedMessages: [
          `Got input box response: start`,
        ],
      },
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
      inputBox: {
        inputBoxResponses: [undefined],
        expectedInputBoxes: [{
          options: {
            prompt: "Nada",
            validateInputProvided: false,
          },
        }],
      },
      informationMessage: {
        expectedMessages: [
          `Got undefined input box response`,
        ],
      },
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
      inputBox: {
        inputBoxResponses: ["some response"],
        expectedInputBoxes: [{
          options: {
            title: "An input box",
            validateInputProvided: false,
          },
        }],
      },
      informationMessage: {
        expectedMessages: [
          `Got input box response: some response`,
        ],
      },
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
      inputBox: {
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
      },
      informationMessage: {
        expectedMessages: [
          `Got input box response: another response`,
        ],
      },
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
      inputBox: {
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
      },
      informationMessage: {
        expectedMessages: [
          `Got undefined input box response`,
        ],
      },
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
      inputBox: {
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
      },
      informationMessage: {
        expectedMessages: [
          `Got undefined input box response`,
        ],
      },
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
      inputBox: {
        inputBoxResponses: ["abc"],
        expectedInputBoxes: [{
          options: {
            title: "An input box",
            validateInputProvided: true,
          },
        }],
      },
      informationMessage: {
        expectedMessages: [
          `Got input box response: abc`,
        ],
      },
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
      inputBox: {
        inputBoxResponses: [undefined],
        expectedInputBoxes: [{
          options: {
            title: "An input box",
            validateInputProvided: true,
          },
        }],
      },
      informationMessage: {
        expectedMessages: [
          `Got undefined input box response`,
        ],
      },
    },
  },
  // Skip tests
  {
    name: "Skips info message stubbing",
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.info", "hello there"),
      ],
      informationMessage: {
        skip: true,
      },
    },
  },
  {
    name: "Skips info message verification",
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.info", "hello there"),
      ],
      informationMessage: {
        skipVerify: true,
      },
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
  const solo = testCases.some(tc => tc.runSolo);

  testCases.filter(tc => !solo || tc.runSolo).forEach(tc => {

    test(tc.name, async () => {
      await new SimpleTestCase(tc.stc).runTest().catch(e => {
        throw e;
      });
    });
  });
});

const errorTestCases: ErrorTestCase[] = [
  {
    name: "Fails if selection provided, but no active editor",
    wantError: "Expected editor (must be defined when selections is set) to be defined, but it was undefined",
    stc: {
      selections: [new vscode.Selection(0, 0, 0, 0)],
    },
  },
  {
    name: "fails if expectedSelections are off",
    wantError: [
      `Expected SELECTIONS to be exactly equal`,
      `+ actual - expected ... Lines skipped`,
      ``,
      `  [`,
      `    lv {`,
      `...`,
      `      },`,
      `      e: co {`,
      `+       c: 1,`,
      `-       c: 2,`,
      `        e: 1`,
      `      },`,
      `...`,
      `      },`,
      `      g: co {`,
      `+       c: 1,`,
      `-       c: 2,`,
      `        e: 1`,
      `...`,
      `      }`,
      `    }`,
      `  ]`,
    ].join('\n'),
    stc: {
      text: [
        "abc",
        "def",
        "ghi",
        "",
      ],
      expectedText: [
        "abc",
        "def",
        "ghi",
        "",
      ],
      selections: [
        new vscode.Selection(0, 0, 0, 0),
        new vscode.Selection(0, 2, 1, 1),
        new vscode.Selection(2, 3, 2, 3),
      ],
      expectedSelections: [
        new vscode.Selection(0, 0, 0, 0),
        new vscode.Selection(0, 2, 2, 1),
        new vscode.Selection(2, 3, 2, 3),
      ],
    },
  },
  // Message
  {
    name: "[InfoMessage] Fails if info message diff",
    wantError: [
      `Expected INFO MESSAGES to be exactly equal`,
      `+ actual - expected`,
      ``,
      `+ [`,
      `+   'hello there'`,
      `+ ]`,
      `- []`,
    ].join("\n"),
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.info", "hello there"),
      ],
    },
  },
  {
    name: "[InfoMessage] Fails if info message diff even when ignoring order",
    wantError: [
      `Expected INFO MESSAGES to be exactly equal (ignoring order)`,
      `+ actual - expected`,
      ``,
      `  [`,
      `+   'abc',`,
      `+   'def'`,
      `-   'def',`,
      `-   'ghi'`,
      `  ]`,
    ].join("\n"),
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.info", "abc"),
        cmd("vscode-test-stubber.info", "def"),
      ],
      informationMessage: {
        ignoreOrder: true,
        expectedMessages: [
          "def",
          "ghi",
        ],
      },
    },
  },
  {
    name: "[InfoMessage] Fails if info message diff in ordering only",
    wantError: [
      `Expected INFO MESSAGES to be exactly equal`,
      `+ actual - expected`,
      ``,
      `  [`,
      `+   'abc',`,
      `+   'def'`,
      `-   'def',`,
      `-   'abc'`,
      `  ]`,
    ].join("\n"),
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.info", "abc"),
        cmd("vscode-test-stubber.info", "def"),
      ],
      informationMessage: {
        expectedMessages: [
          "def",
          "abc",
        ],
      },
    },
  },
  // Workspace configuration
  {
    name: "[WorkspaceConfiguration] Fails if workspace configuration diff",
    wantError: [
      'Expected values to be strictly deep-equal:',
      '+ actual - expected',
      '',
      '  {',
      '    configuration: Map(1) {',
      '      3 => Map(1) {',
      "+       'hello' => 'there'",
      "-       'hello' => 'goodbye'",
      '      }',
      '    },',
      '    languageConfiguration: Map(0) {}',
      '  }',
    ].join("\n"),
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.doNothing"),
      ],
      workspaceConfiguration: {
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
              ["hello", "goodbye"],
            ])],
          ]),
        },
      },
    },
  },
  // InputBox
  {
    name: "[InputBox] Raises error if no input box response provided",
    wantError: "Expected InputBoxStubber.error to be undefined, but it was defined: Ran out of inputBoxResponses",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.inputBox'),
      ],
      inputBox: {
        expectedInputBoxes: [{
          options: {
            title: "An input box",
            validateInputProvided: false,
          },
        }],
      },
    },
  },
  {
    name: "[InputBox] Raises error if diff in expectedInputBoxes",
    wantError: [
      `Expected INPUT BOX VALIDATION MESSAGES to be exactly equal`,
      `+ actual - expected`,
      ``,
      `  [`,
      `    {`,
      `      options: {`,
      `+       title: 'Some input box',`,
      `-       title: 'An input box',`,
      `        validateInputProvided: false`,
      `      }`,
      `    }`,
      `  ]`,
    ].join("\n"),
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.inputBox', ipo({
          title: "Some input box",
        })),
      ],
      inputBox: {
        inputBoxResponses: ["some response"],
        expectedInputBoxes: [{
          options: {
            title: "An input box",
            validateInputProvided: false,
          },
        }],
      },
    },
  },
  {
    name: "[InputBox] Raises error if unused input box responses",
    wantError: [
      `Unused inputBoxResponses`,
      `+ actual - expected`,
      ``,
      `+ [`,
      `+   'another response'`,
      `+ ]`,
      `- []`,
    ].join("\n"),
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.inputBox', ipo({
          title: "An input box",
        })),
      ],
      inputBox: {
        inputBoxResponses: ["some response", "another response"],
        expectedInputBoxes: [{
          options: {
            title: "An input box",
            validateInputProvided: false,
          },
        }],
      },
    },
  },
  // QuickPick
  {
    name: "[QuickPick] Fails if a QuickPick action is provided when no QuickPick has been run",
    wantError: "Expected QuickPickStubber.error to be undefined, but it was defined: Trying to run QuickPickAction when there isn't an active QuickPick available",
    stc: {
      userInteractions: [
        new SelectActiveItems(),
      ],
    },
  },
  {
    name: "[QuickPick] Fails if closed and then try to pick an item",
    wantError: "Expected QuickPickStubber.error to be undefined, but it was defined: Trying to run QuickPickAction when there isn't an active QuickPick available",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick'),
        new CloseQuickPickAction(),
        new SelectItemQuickPickAction(['abc']),
      ],
    },
  },
  {
    name: "[QuickPick] Select item fails if no label",
    wantError: "Expected QuickPickStubber.error to be undefined, but it was defined: All item labels were not matched. Found []; wanted [ABC]",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick'),
        new SelectItemQuickPickAction(['ABC']),
      ],
    },
  },
  {
    name: "[QuickPick] PressItemButton fails if no label matches",
    wantError: "Expected QuickPickStubber.error to be undefined, but it was defined: No items matched the provided item label (def)",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick'),
        new PressItemButtonQuickPickAction('def', 2),
      ],
    },
  },
  {
    name: "[QuickPick] PressItemButton fails if button index is out of range",
    wantError: "Expected QuickPickStubber.error to be undefined, but it was defined: Item only has 2, but needed at least 3",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick'),
        new PressItemButtonQuickPickAction('ghi', 2),
      ],
    },
  },
  {
    name: "[QuickPick] PressUnknownButton fails if bad label",
    wantError: "Expected QuickPickStubber.error to be undefined, but it was defined: No items matched the provided item label (idk)",
    stc: {
      userInteractions: [
        cmd('vscode-test-stubber.quickPick'),
        new PressUnknownButtonQuickPickAction("idk"),
      ],
    },
  },
  // WorkspaceConfiguration
  {
    name: "[WorkspaceConfiguration] fails if invalid scope",
    wantError: [
      'Only languageId is supported for ConfigurationScope; got {',
      '  "no": "languageId field"',
      '}',
    ].join('\n'),
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.getConfiguration", {
          key: "key-with-empty-scope",
          scope: {
            no: "languageId field",
          },
          section: "sub.section",
        }),
      ],
    },
  },
];

suite('Error Test Suite', () => {
  const solo = errorTestCases.some(tc => tc.runSolo);

  errorTestCases.filter(tc => !solo || tc.runSolo).forEach(tc => {

    test(tc.name, async () => {
      try {
        await new SimpleTestCase(tc.stc).runTest();
        throw new AssertionError({ message: "SimpleTestCase().runTest() did not throw an exception" });
      } catch (e) {
        const gotError = (e as Error).message;
        assert.deepStrictEqual(gotError, tc.wantError);
      }
    });
  });
});


interface ExteriorFileChangeTestCase extends TestCase {
  fileContents: string[];
}

const exteriorFileChangeTestCases: ExteriorFileChangeTestCase[] = [
  // Basically, if a file was modified by other means (e.g. not SimpleTestCase
  // and by user code in test setup), then sometimes the logic in this package
  // would run before those file changes were picked up by the VS Code editor.
  // This would result in file contents and/or selections from the end of one
  // test to leak into the next test.
  // For more examples (and potentially fuller testing of changes here),
  // see the groogle.very-import-ant VS Code extension (and changes from around
  // the same time (2/22/2025)).
  //
  // Removing the Waiter that checks for `...getText() === fileText`
  // in the OpenFileExecution class will cause this to fail.
  {
    name: "Exterior file change part I",
    runSolo: true,
    fileContents: [
      "un",
      "deux",
    ],
    stc: {
      expectedText: [
        "un",
        "deux",
      ],
      selections: [new vscode.Selection(1, 1, 1, 1)],
      expectedSelections: [new vscode.Selection(1, 1, 1, 1)],
    },
  },
  {
    name: "Exterior file change part II", // See comment with above test for more details on why this is needed
    runSolo: true,
    fileContents: [
      "un",
      "deux",
      "trois",
      "quatre",
    ],
    stc: {
      expectedText: [
        "un",
        "deux",
        "trois",
        "quatre",
      ],
    },
  },
];

suite('Exterior file change test suite', () => {
  exteriorFileChangeTestCases.forEach(tc => {

    test(tc.name, async () => {

      // NOTE: this exact logic is needed to ensure that file changes
      // made immediately **before and outside of** SimpleTestCase execution
      // are waited for during actual SimpleTestCase execution.
      writeFileSync(relFilePath("empty.txt"), tc.fileContents.join("\n"));
      tc.stc.file = relFilePath("empty.txt");

      await new SimpleTestCase(tc.stc).runTest().catch(e => {
        throw e;
      });
    });
  });
});
