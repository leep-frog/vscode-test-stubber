
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import { StubbablesConfig } from '../run-stubbable';
import { SimpleTestCase, SimpleTestCaseProps, cmd } from '../test-case';
// import * as myExtension from '../../extension';

export const stubbableTestFile = `C:\\Users\\gleep\\Desktop\\Coding\\vs-code\\vscode-test-stubber\\.vscode-test\\stubbable-file.json`;

interface TestCase {
  name: string;
  sc: StubbablesConfig;
  stc: SimpleTestCaseProps;
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
  {
    name: "Does nothing command with initial WorkspaceConfiguration and expected WorkspaceConfiguration",
    sc: {
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
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.doNothing"),
      ],
    },
  },
  {
    name: "Does nothing command with initial WorkspaceConfiguration and no expected WorkspaceConfiguration",
    sc: {
      workspaceConfiguration: {
        configuration: new Map<vscode.ConfigurationTarget, Map<string, any>>([
          [vscode.ConfigurationTarget.WorkspaceFolder, new Map<string, any>([
            ["hello", "there"],
          ])],
        ]),
      },
    },
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.doNothing"),
      ],
    },
  },
  {
    name: "Creates config",
    sc: {
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
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.updateSettings"),
      ],
    },
  },
  {
    name: "Updates existing config",
    sc: {
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
    stc: {
      userInteractions: [
        cmd("vscode-test-stubber.updateSettings"),
      ],
    },
  },
  /* Useful for commenting out tests. */
];

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

  testCases.forEach(tc => {
    test(tc.name, async () => {
      await new SimpleTestCase(tc.stc).runTest(stubbableTestFile, tc.sc).catch(e => {
        throw e;
      });
    });
	});
});
