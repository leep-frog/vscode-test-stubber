import assert from 'assert';
import * as vscode from 'vscode';

import path from 'path';
import { InputBoxExecution, InputBoxStubber } from './input-box';
import { ErrorMessageStubber, InfoMessageStubber, WarningMessageStubber } from './messages';
import { QuickPickStubber } from './quick-pick';
import { Stub, StubInfo, assertDefined, assertUndefined, testCleanup, testSetup, testVerify } from './verify';
import { WorkspaceConfiguration, WorkspaceConfigurationStubber } from './workspace-configuration';

export interface UserInteraction {
  do(): Promise<any>;
}

/**
 * The Waiter class allows users to define custom `UserInteraction` objects
 * that wait for a given condition to be met (which is sometimes needed as
 * lots of VS Code operations execute asynchronously).
 */
export class Waiter {

  readonly delayIntervalMs: number;
  done: () => boolean;
  maxAttempts?: number;

  constructor(delayIntervalMs: number, done: () => boolean, maxAttempts?: number) {
    this.delayIntervalMs = delayIntervalMs;
    this.done = done;
    this.maxAttempts = maxAttempts;
  }

  async do(): Promise<any> {
    for (let numCalls = 0; (this.maxAttempts === undefined || numCalls < this.maxAttempts) && !this.done(); numCalls++) {
      await delay(this.delayIntervalMs).do();
    }
  }
}

class CommandExecution implements UserInteraction {
  constructor(
    public command: string,
    public args?: any[],
  ) { }

  async do() {
    return vscode.commands.executeCommand(this.command, ...(this.args || []));
  };
}

export function cmd(command: string, ...args: any[]): UserInteraction {
  return new CommandExecution(command, args);
}

class OpenFileExecution implements UserInteraction {

  readonly filepath: string[];

  constructor(...filepath: string[]) {
    this.filepath = filepath;
  }

  async do() {
    await vscode.workspace.openTextDocument(path.join(...this.filepath)).then(doc => vscode.window.showTextDocument(doc));
    const w = new Waiter(3, () => !!vscode.window.activeTextEditor, 50);
    await w.do();
  };
}

export function openFile(...filepath: string[]): UserInteraction {
  return new OpenFileExecution(...filepath);
}

// class OpenNotebookExecution implements UserInteraction {

//   readonly filepath: string[];

//   constructor(...filepath: string[]) {
//     this.filepath = filepath;
//   }

//   async do() {
//     // await vscode.commands.executeCommand("vscode.openWith", vscode.Uri.file(path.join(...this.filepath)), 'jupyter-notebook');

//     // This works normally, but not in test mode.
//     // See https://github.com/microsoft/vscode-test-cli/issues/63
//     const u = vscode.Uri.file(path.join(...this.filepath));
//     const nb = await vscode.workspace.openNotebookDocument(u);
//     await vscode.window.showNotebookDocument(nb);
//   };
// }

// export function openNotebook(...filepath: string[]): UserInteraction {
//   return new OpenNotebookExecution(...filepath);
// }

class DelayExecution implements UserInteraction {
  constructor(
    public waitMs: number,
  ) { }

  delay() {
    return new Promise(resolve => setTimeout(resolve, this.waitMs));
  }

  async do() {
    await this.delay();
  };
}

export function delay(ms: number): UserInteraction {
  return new DelayExecution(ms);
}

class MultiInteraction implements UserInteraction {
  constructor(
    public userInteractions: UserInteraction[],
  ) { }

  async do() {
    for (const userInteraction of this.userInteractions) {
      await userInteraction.do();
    }
  }
}

export function combineInteractions(...userInteractions: UserInteraction[]) {
  return new MultiInteraction(userInteractions);
}

const closeAllEditors = cmd("workbench.action.closeEditorsAndGroup");

export interface TestCase {
  runTest(): Promise<void>;
};

export interface MessageStub extends Stub {

  /**
   * If true, then ignore the order of notification messages displayed when verifying.
   */
  ignoreOrder?: boolean;

  /**
  * The expected messages to have been displayed during the test.
  */
  expectedMessages?: string[];
}

export interface InformationMessageStub extends MessageStub { }
export interface WarningMessageStub extends MessageStub { }
export interface ErrorMessageStub extends MessageStub { }

export interface WorkspaceConfigurationStub extends Stub {
  /**
   * The starting workspace configuration.
   */
  workspaceConfiguration?: WorkspaceConfiguration;

  /**
   * The expected workspace configuration after all user interactions are run.
   */
  expectedWorkspaceConfiguration?: WorkspaceConfiguration;
}

export interface QuickPickStub extends Stub {
  /**
   * The expected quick pick interactions to have been executed during the test.
   */
  expectedQuickPicks?: (vscode.QuickPickItem | string)[][];
}

export interface InputBoxStub extends Stub {
  /**
   * The input box responses.
   */
  inputBoxResponses?: (string | undefined)[];

  /**
   * The expected input box executions.
   */
  expectedInputBoxes?: InputBoxExecution[];
}

export interface SimpleTestCaseProps {
  /**
   * The user interactions to run during the test.
   */
  userInteractions?: UserInteraction[];

  /**
   * If set, the test is started with an unnamed file with the provided text (separated by newlines).
   */
  text?: string[];

  /**
   * If set, the file to open in the test.
   */
  file?: string;

  /**
   * expectedText is the expected text that is present in the active text editor.
   * If undefined, then the test asserts that there is no active editor.
   *
   * TODO: Make this string[] | string
   */
  expectedText?: string[];

  /**
   * The selections that will start during the test.
   */
  selections?: vscode.Selection[];

  /**
   * The expected set of selections in the active text editor at the end of the test.
   */
  expectedSelections?: vscode.Selection[];

  /**
   * Stub configuration for vscode.window.showInformationMessage
   */
  informationMessage?: InformationMessageStub;

  /**
   * Stub configuration for vscode.window.showWarningMessage
   */
  warningMessage?: WarningMessageStub;

  /**
  * Stub configuration for vscode.window.showErrorMessage
  */
  errorMessage?: ErrorMessageStub;

  /**
   * Stub configuration for vscode.WorkspaceConfiguration
   */
  workspaceConfiguration?: WorkspaceConfigurationStub;

  /**
   * Stub configuration for vscode.createQuickPick (and show)
   */
  quickPick?: QuickPickStub;

  /**
   * Stub configuration for vscode.window.showInputBox
   */
  inputBox?: InputBoxStub;
};

/**
 * A TestCase that runs all supported stubbings and a slew of helper logic (e.g. test setup/configuration)
 * See the `SimpleTestCaseProps` object for more details.
 */
export class SimpleTestCase implements TestCase {

  readonly props: SimpleTestCaseProps;

  constructor(props?: SimpleTestCaseProps) {
    this.props = props || {};
  }

  async runTest(): Promise<void> {
    await closeAllEditors.do();

    let editor: vscode.TextEditor | undefined;
    if (this.props.file !== undefined) {
      await new OpenFileExecution(this.props.file).do();
      editor = assertDefined(vscode.window.activeTextEditor, "vscode.window.activeTextEditor");
    } else if (this.props.text !== undefined) {
      await vscode.commands.executeCommand("workbench.action.files.newUntitledFile");

      const editor_ = assertDefined(vscode.window.activeTextEditor, "vscode.window.activeTextEditor");
      await editor_.edit((eb) => eb.setEndOfLine(vscode.EndOfLine.LF));
      await editor_.edit(eb => {
        const line = editor_.document.lineAt(editor_.document.lineCount - 1);
        eb.delete(new vscode.Range(
          new vscode.Position(0, 0),
          new vscode.Position(line.lineNumber, line.text.length),
        ));
        eb.insert(new vscode.Position(0, 0), this.props.text!.join("\n"));
      });
      editor = editor_;
    }

    if (this.props.selections) {
      assertDefined(editor, "editor (must be defined when selections is set)");
    }

    if (editor) {
      editor.selections = (this.props.selections || [new vscode.Selection(0, 0, 0, 0)]);
    }

    const stubInfos: StubInfo[] = [
      // TODO: Force stubs and stubber to reference same stub type
      { stub: this.props.workspaceConfiguration, stubber: new WorkspaceConfigurationStubber(this.props.workspaceConfiguration) },
      { stub: this.props.quickPick, stubber: new QuickPickStubber(this.props.quickPick) },
      { stub: this.props.inputBox, stubber: new InputBoxStubber(this.props.inputBox) },
      { stub: this.props.errorMessage, stubber: new ErrorMessageStubber(this.props.errorMessage) },
      { stub: this.props.warningMessage, stubber: new WarningMessageStubber(this.props.warningMessage) },
      { stub: this.props.informationMessage, stubber: new InfoMessageStubber(this.props.informationMessage) },
    ];

    testSetup(stubInfos);

    try {
      // Run the commands
      for (const userInteraction of (this.props.userInteractions || [])) {
        await userInteraction.do();
      }

      // Verify the outcome (assert in order of information (e.g. mismatch in error messages in more useful than text being mismatched)).
      testVerify(stubInfos);

      const maybeActiveEditor = vscode.window.activeTextEditor;

      if (this.props.expectedText === undefined) {
        assertUndefined(maybeActiveEditor, "activeTextEditor");
        assertUndefined(this.props.expectedSelections, "expectedSelections");
      } else {
        const activeEditor = assertDefined(maybeActiveEditor, "activeTextEditor");
        assert.deepStrictEqual(activeEditor.document.getText(), this.props.expectedText.join("\n"), "Expected DOCUMENT TEXT to be exactly equal");
        assert.deepStrictEqual(activeEditor.selections, this.props.expectedSelections || [new vscode.Selection(0, 0, 0, 0)], "Expected SELECTIONS to be exactly equal");
      }
    } finally {
      testCleanup(stubInfos);
    }
  }
}
