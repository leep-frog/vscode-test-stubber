import assert from 'assert';
import * as vscode from 'vscode';

import path from 'path';
import { InputBoxExecution, InputBoxStubber } from './input-box';
import { ErrorMessageStubber, InfoMessageStubber, WarningMessageStubber } from './messages';
import { QuickPickStubber } from './quick-pick';
import { Stubber, assertDefined, assertUndefined, testSetup, testVerify } from './verify';
import { WorkspaceConfiguration, WorkspaceConfigurationStubber } from './workspace-configuration';

export interface UserInteraction {
  do(): Promise<any>;
}

class CommandExecution implements UserInteraction {
  constructor(
    public command: string,
    public args?: any[],
  ) {}

  async do() {
    return vscode.commands.executeCommand(this.command, ...(this.args || []));
  };
}

export function cmd(command: string, ...args: any[]) : UserInteraction {
  return new CommandExecution(command, args);
}

class OpenFileExecution implements UserInteraction {

  readonly filepath: string[];

  constructor(...filepath: string[]) {
    this.filepath = filepath;
  }

  async do() {
    await vscode.workspace.openTextDocument(path.join(...this.filepath)).then(doc => vscode.window.showTextDocument(doc));
  };
}

export function openFile(...filepath: string[]) : UserInteraction {
  return new OpenFileExecution(...filepath);
}

class DelayExecution implements UserInteraction {
  constructor(
    public waitMs: number,
  ) {}

  delay() {
    return new Promise( resolve => setTimeout(resolve, this.waitMs) );
  }

  async do() {
    await this.delay();
  };
}

export function delay(ms: number): UserInteraction {
  return new DelayExecution(ms);
}

const closeAllEditors = cmd("workbench.action.closeEditorsAndGroup");

export interface TestCase {
  runTest(): Promise<void>;
};

export interface SimpleTestCaseProps {
  /**
   * If set, the test is started with an unnamed file with the provided text (separated by newlines).
   */
  text?: string[];

  /**
   * If set, the file to open in the test.
   */
  file?: string;

  /**
   * The user interactions to run during the test.
   */
  userInteractions?: UserInteraction[];

  /**
   * The selections that will start during the test.
   */
  selections?: vscode.Selection[];

  /**
   * The expected set of selections in the active text editor at the end of the test.
   */
  expectedSelections?: vscode.Selection[];

  /**
   * The expected set of info messages to be displayed.
   */
  expectedInfoMessages?: string[];

  /**
   * The expected set of warning messages to be displayed.
   */
  expectedWarningMessages?: string[];

  /**
   * The expected set of error messages to be displayed.
   */
  expectedErrorMessages?: string[];

  /**
   * The starting workspace configuration.
   */
  workspaceConfiguration?: WorkspaceConfiguration;

  /**
   * The expected workspace configuration after all user interactions are run.
   */
  expectedWorkspaceConfiguration?: WorkspaceConfiguration;

  /**
   * The expected quick pick interactions to have been executed during the test.
   */
  expectedQuickPicks?: (vscode.QuickPickItem | string)[][];

  /**
   * The input box responses.
   */
  inputBoxResponses?: (string | undefined)[];

  /**
   * The expected input box executions.
   */
  expectedInputBoxes?: InputBoxExecution[];

  /**
   * expectedText is the expected text that is present in the active text editor.
   * If undefined, then the test asserts that there is no active editor.
   *
   * TODO: Make this string[] | string
   */
  expectedText?: string[];
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
      await vscode.workspace.openTextDocument(this.props.file).then(doc => vscode.window.showTextDocument(doc));
      editor = assertDefined(vscode.window.activeTextEditor, "vscode.window.activeTextEditor");
    } else if (this.props.text !== undefined) {
      await vscode.commands.executeCommand("workbench.action.files.newUntitledFile");

      const editor_ = assertDefined(vscode.window.activeTextEditor, "vscode.window.activeTextEditor");
      await editor_.edit(eb => {
        const line = editor_.document.lineAt(editor_.document.lineCount-1);
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

    const stubbers: Stubber[] = [
      new WorkspaceConfigurationStubber(this.props.workspaceConfiguration, this.props.expectedWorkspaceConfiguration),
      new QuickPickStubber(this.props.expectedQuickPicks),
      new InputBoxStubber(this.props.inputBoxResponses, this.props.expectedInputBoxes),
      new ErrorMessageStubber(...(this.props.expectedErrorMessages || [])),
      new WarningMessageStubber(...(this.props.expectedWarningMessages || [])),
      new InfoMessageStubber(...(this.props.expectedInfoMessages || [])),
    ];

    testSetup(stubbers);

    try {
      // Run the commands
      for (const userInteraction of (this.props.userInteractions || [])) {
        await userInteraction.do();
      }

      // Verify the outcome (assert in order of information (e.g. mismatch in error messages in more useful than text being mismatched)).
      testVerify(stubbers);

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
      stubbers.forEach(stubber => stubber.cleanup());
    }
  }
}
