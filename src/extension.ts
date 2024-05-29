// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

interface QuickPickOptions {
  activeItems?: number[];
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-test-stubber.doNothing', async () => {}),
    vscode.commands.registerCommand('vscode-test-stubber.info', async (s: string) => vscode.window.showInformationMessage(s)),
    vscode.commands.registerCommand('vscode-test-stubber.warning', async (s: string) => vscode.window.showWarningMessage(s)),
    vscode.commands.registerCommand('vscode-test-stubber.error', async (s: string) => vscode.window.showErrorMessage(s)),
    vscode.commands.registerCommand('vscode-test-stubber.updateSettings', async () => {
      await vscode.workspace.getConfiguration("stubber").update("some-key", "some-value");
    }),
    vscode.commands.registerCommand('vscode-test-stubber.inputBox', async (options?: vscode.InputBoxOptions) => {
      const response = await vscode.window.showInputBox(options);
      if (response === undefined) {
        vscode.window.showInformationMessage(`Got undefined input box response`);
      } else {
        vscode.window.showInformationMessage(`Got input box response: ${response}`);
      }
    }),
    vscode.commands.registerCommand('vscode-test-stubber.quickPick', async (options?: QuickPickOptions) => {
      const items: Item[] = [
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
          buttons: [
            new CustomButton('star'),
            new CustomButton('close', 'Remove the thing'),
          ],
        },
      ];

      const qp = vscode.window.createQuickPick<Item>();
      qp.items = items;
      qp.activeItems = options?.activeItems?.map(index => items[index]) || [];

      const disposables: vscode.Disposable[] = [];
      disposables.push(
        // Dispose of events when leaving the widget
        qp.onDidHide(e => {
          disposables.forEach(d => d.dispose);
        }),

        // Accepting an item
        qp.onDidAccept(async (): Promise<any> => {
          const str = qp.selectedItems.map(i => i.label).join('_');
          vscode.window.showInformationMessage(`Picked items (${qp.selectedItems.length}) [${str}]`);
          qp.dispose();
        }),

        // Clicking an item button
        qp.onDidTriggerItemButton(async (event: vscode.QuickPickItemButtonEvent<Item>): Promise<any> => {
          switch (event.button.constructor) {
          case CustomButton:
            qp.dispose();
            vscode.window.showInformationMessage(`Got button: ${JSON.stringify(event.button)}`);
            break;
          default:
            qp.dispose();
            vscode.window.showErrorMessage(`Unknown item button`);
          }
        }),
      );

      qp.show();
    }),
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}

export interface Item extends vscode.QuickPickItem {
  extra: string;
  fields?: number;
}

export class CustomButton implements vscode.QuickInputButton {

  iconPath: vscode.Uri | { light: vscode.Uri; dark: vscode.Uri; } | vscode.ThemeIcon;
  tooltip?: string;
  more: string;

  constructor(iconId: string, toolTip?: string) {
    this.iconPath = new vscode.ThemeIcon(iconId);
    this.tooltip = toolTip;
    this.more = `more stuff: ${iconId}`;
  }
}
