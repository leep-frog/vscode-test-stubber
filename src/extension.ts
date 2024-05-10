// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { VSCODE_STUBS } from '.';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-test-stubber.doNothing', async () => {}),
    vscode.commands.registerCommand('vscode-test-stubber.updateSettings', async () => {
      await VSCODE_STUBS.getConfiguration("stubber").update("some-key", "some-value");
    }),
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
