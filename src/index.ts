import * as vscode from 'vscode';
import { GetConfigurationProps } from '../dist';
import { createQuickPick, showQuickPick } from './quick-pick';
import { vscodeWorkspaceGetConfiguration } from './workspace-configuration';

export { CloseQuickPickAction, NoOpQuickPickAction, PressItemButtonQuickPickAction, PressUnknownButtonQuickPickAction, SelectItemQuickPickAction } from './quick-pick';
export { StubbablesConfig, TEST_MODE } from './run-stubbable';
export { testSetup, testVerify } from './verify';
export { FakeWorkspaceConfiguration } from './workspace-configuration';

// STUBS is the object that contains all stubbable VS Code methods.
interface Stubs {
  /**
   * Stubbable command to create a quick pick controllable in tests.
   * Replace any instances of vscode.window.createQuickPick() with this method.
   *
   * Note: the value returned should use STUBS.showQuickPick(quickPick) instead of quickPick.show();
   *
   * @returns bloop
   */
  createQuickPick: <T extends vscode.QuickPickItem> () => vscode.QuickPick<T>;

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
   * @param inpupt
   * @returns
   */
  vscodeWorkspaceGetConfiguration: (inpupt: GetConfigurationProps) => vscode.WorkspaceConfiguration;
}

// STUBS is the object that contains all stubbable VS Code methods.
export const STUBS: Stubs = {
  createQuickPick: createQuickPick,
  showQuickPick: showQuickPick(),
  vscodeWorkspaceGetConfiguration: vscodeWorkspaceGetConfiguration(),
};
