import * as vscode from 'vscode';
import { showQuickPick } from './quick-pick';
import { vscodeWorkspaceGetConfiguration } from './workspace-configuration';

export { CloseQuickPickAction, NoOpQuickPickAction, PressItemButtonQuickPickAction, PressUnknownButtonQuickPickAction, SelectItemQuickPickAction } from './quick-pick';
export { StubbablesConfig, TEST_MODE } from './run-stubbable';
export { SimpleTestCase, SimpleTestCaseProps, TestCase, UserInteraction, cmd, delay, openFile } from './test-case';
export { testSetup, testVerify } from './verify';
export { WorkspaceConfiguration, replacer, reviver } from './workspace-configuration';

// STUBS is the object that contains all stubbable VS Code methods.
interface VSCodeStubs {
  /**
   * Stubbable command to show a quick pick controllable in tests.
   * Replace any instances of quickPick.show() with this method.
   *
   * Note: the input to this method should be the output from the STUBS.createQuickPick() method.
   *
   * @param quickPick
   * @returns
   */
  showQuickPick: <T extends vscode.QuickPickItem> (quickPick: vscode.QuickPick<T>) => Thenable<void>;

  /**
   * Stubbable command to get the workspace configuration
   * Replace any instances of vscode.workspace.getConfiguration() with this method.
   *
   * @param section see vscode.workspace.getConfiguration#section
   * @param scope see vscode.workspace.getConfiguration#scope
   * @returns see vscode.workspace.getConfiguration#returns
   */
  getConfiguration: (section?: string, scope?: vscode.ConfigurationScope) => vscode.WorkspaceConfiguration;
}

// VSCODE_STUBS is the object that contains all stubbable VS Code methods.
export const VSCODE_STUBS: VSCodeStubs = {
  showQuickPick: showQuickPick(),
  getConfiguration: vscodeWorkspaceGetConfiguration(),
};
