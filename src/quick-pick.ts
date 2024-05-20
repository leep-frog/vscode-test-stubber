import assert from 'assert';
import * as vscode from 'vscode';
import { UserInteraction } from './test-case';
import { Stubber, classless, testData } from './verify';

let realQuickPickFn: <T extends vscode.QuickPickItem> () => vscode.QuickPick<T>;

interface CurrentQuickPick {
  quickPick?: FakeQuickPick<any>;
}

const currentQuickPick: CurrentQuickPick = {};

export class QuickPickStubber implements Stubber {

  gotQuickPicks: vscode.QuickPickItem[][];
  currentQuickPick?: FakeQuickPick<any>;
  error?: string;

  expectedExecutions: (vscode.QuickPickItem | string)[][];

  constructor(expectedExecutions?: (vscode.QuickPickItem | string)[][]) {
    this.gotQuickPicks = [];
    this.expectedExecutions = expectedExecutions || [];
  }

  oneTimeSetup(): void {
    realQuickPickFn = vscode.window.createQuickPick;
  }

  setup(): void {
    vscode.window.createQuickPick = () => new FakeQuickPick(this, realQuickPickFn());
  }

  // TODO: Add cleanup method to unset the global currentQuickPick variable.

  verify(): void {
    const wantQuickPickOptions = this.expectedExecutions.map((value: (string | vscode.QuickPickItem)[], index: number, array: (string | vscode.QuickPickItem)[][]) => {
      return value.map((s: string | vscode.QuickPickItem) => {

        if (typeof(s) === typeof("")) {
          return {
            label: s,
          } as vscode.QuickPickItem;
        }

        return (s as vscode.QuickPickItem);
      });
    });
    assert.deepStrictEqual(classless(this.gotQuickPicks), classless(wantQuickPickOptions), "Expected QUICK PICK OPTIONS to be exactly equal");
  }

  cleanup(): void {}
}



/*******************
 * QuickPickAction *
********************/

export abstract class QuickPickAction implements UserInteraction {
  // Run the quick pick action, or return an error
  // It returns [string|undefined, Thenable<any>] because when initially had Thenable<string | undefined>,
  // the error wasn't being set properly in the stubbables method.
  // abstract run(qp: vscode.QuickPick<vscode.QuickPickItem>): [string | undefined, Thenable<any>];
  abstract run(fqp: FakeQuickPick<vscode.QuickPickItem>): Promise<any>;

  async do(): Promise<any> {
    if (!currentQuickPick.quickPick) {
      const msg = 'No active quick pick';
      testData.error = msg;
      return;
    }

    return this.run(currentQuickPick.quickPick);
  }
}

/*****************************
 * SelectItemQuickPickAction *
******************************/

export class SelectItemQuickPickAction extends QuickPickAction {
  // TODO: What about cases where multiple items have the same label?
  readonly itemLabels: string[];

  constructor(itemLabels: string[]) {
    super();
    this.itemLabels = itemLabels;
  }

  // run(qp: vscode.QuickPick<vscode.QuickPickItem>): [string | undefined, Thenable<any>] {
  async run(qp: FakeQuickPick<vscode.QuickPickItem>): Promise<any> {
    const matchedItems: vscode.QuickPickItem[] = [];
    for (const item of qp.items) {
      if (this.itemLabels.includes(item.label)) {
        matchedItems.push(item);
      }
    }

    if (matchedItems.length !== this.itemLabels.length) {
      testData.error = `All item labels were not matched. Found [${matchedItems.map(item => item.label)}]; wanted [${this.itemLabels}]`;
      return;
    }

    return qp.acceptItems(matchedItems);
  }
}

/************************
 * CloseQuickPickAction *
*************************/

export class CloseQuickPickAction extends QuickPickAction {
  async run(): Promise<any> {
    return vscode.commands.executeCommand("workbench.action.closeQuickOpen");
  }
}

/**********************************
 * PressItemButtonQuickPickAction *
***********************************/

export class PressItemButtonQuickPickAction extends QuickPickAction {
  itemLabel: string;
  // Use buttonIndex because contents of button (e.g. icon and tooltip)
  // will be validated in tests when comparing wantQuickPickOptions
  buttonIndex: number;

  constructor(itemLabel: string, buttonIndex: number) {
    super();
    this.itemLabel = itemLabel;
    this.buttonIndex = buttonIndex;
  }

  async run(qp: FakeQuickPick<vscode.QuickPickItem>): Promise<any> {
    for (const item of qp.items) {
      if (item.label !== this.itemLabel) {
        continue;
      }

      const button = item.buttons?.at(this.buttonIndex);
      if (!button) {
        testData.error = `Item only has ${item.buttons?.length}, but needed at least ${this.buttonIndex+1}`;
        return;
      }

      return qp.pressItemButton(item, button);
    }

    testData.error = `No items matched the provided item label (${this.itemLabel})`;
    return;
  }
}

/*************************************
 * PressUnknownButtonQuickPickAction *
**************************************/

export class PressUnknownButtonQuickPickAction extends QuickPickAction {
  itemLabel: string;

  constructor(itemLabel: string) {
    super();
    this.itemLabel = itemLabel;
  }

  async run(qp: FakeQuickPick<vscode.QuickPickItem>): Promise<any> {
    for (const item of qp.items) {
      if (item.label !== this.itemLabel) {
        continue;
      }

      const unknownButton: vscode.QuickInputButton = new FakeQuickInputButton();
      return qp.pressItemButton(item, unknownButton);
    }

    testData.error = `No items matched the provided item label (${this.itemLabel})`;
    return;
  }
}

class FakeQuickInputButton implements vscode.QuickInputButton {
  readonly iconPath: vscode.ThemeIcon;
  constructor() {
    this.iconPath = new vscode.ThemeIcon("invalid-icon-path-string");
  }
}

/*********************
 * QuickPick Wrapper *
**********************/

export class FakeQuickPick<T extends vscode.QuickPickItem> implements vscode.QuickPick<T> {

  private readonly stubber: QuickPickStubber;
  private readonly realQuickPick: vscode.QuickPick<T>;

  private readonly acceptHandlers: ((e: void) => Promise<any>)[];
  private readonly buttonHandlers: ((e: vscode.QuickInputButton) => Promise<any>)[];
  private readonly itemButtonHandlers: ((e: vscode.QuickPickItemButtonEvent<T>) => Promise<any>)[];

  constructor(stubber: QuickPickStubber, realQuickPick: vscode.QuickPick<T>) {
    this.stubber = stubber;
    this.realQuickPick = realQuickPick;
    this.acceptHandlers = [];
    this.buttonHandlers = [];
    this.itemButtonHandlers = [];
  }

  // Custom methods
  public async acceptItems(items: T[]): Promise<any> {
    this.activeItems = items;
    this.selectedItems = items;
    await this.runAsyncsInSequence(undefined, this.acceptHandlers);
  }

  // TODO: Support and test this
  public async pressButton(button: vscode.QuickInputButton): Promise<any> {
    await this.runAsyncsInSequence(button, this.buttonHandlers);
  }

  public async pressItemButton(item: T, button: vscode.QuickInputButton): Promise<any> {
    await this.runAsyncsInSequence({item, button}, this.itemButtonHandlers);
  }

  private async runAsyncsInSequence<T>(t: T, handlers: ((t: T) => Promise<any>)[]): Promise<any> {
    for (const handler of handlers) {
      await handler(t);
    }
  }

  // QuickPick overridden fields/methods below

  // TODO: Support and test this
  public onDidTriggerButton(listener: (e: vscode.QuickInputButton) => Promise<any>, thisArgs?: any, disposables?: vscode.Disposable[]) : vscode.Disposable {
    this.buttonHandlers.push(listener);
    return this.realQuickPick.onDidTriggerButton(listener, thisArgs, disposables);
  }

  public onDidTriggerItemButton(listener: (e: vscode.QuickPickItemButtonEvent<T>) => Promise<any>, thisArgs?: any, disposables?: vscode.Disposable[]) : vscode.Disposable {
    this.itemButtonHandlers.push(listener);
    return this.realQuickPick.onDidTriggerItemButton(listener, thisArgs, disposables);
  }

  public onDidAccept(listener: (e: void) => Promise<any>, thisArgs?: any, disposables?: vscode.Disposable[]) : vscode.Disposable {
    this.acceptHandlers.push(listener);
    return this.realQuickPick.onDidAccept(listener, thisArgs, disposables);
  }

  // QuickPick simple forwarding fields/methods below

  public get value(): string { return this.realQuickPick.value; }
  public set value(s: string) { this.realQuickPick.value = s; }

  public get placeholder(): string | undefined { return this.realQuickPick.placeholder; }
  public set placeholder(s: string | undefined) { this.realQuickPick.placeholder = s; }

  public get onDidChangeValue(): vscode.Event<string> { return this.realQuickPick.onDidChangeValue; }

  public get buttons(): readonly vscode.QuickInputButton[] { return this.realQuickPick.buttons; }
  public set buttons(bs: vscode.QuickInputButton[]) { this.realQuickPick.buttons = bs; }

  public get items(): readonly T[] { return this.realQuickPick.items; }
  public set items(ts: readonly T[]) { this.realQuickPick.items = ts; }

  public get canSelectMany(): boolean { return this.realQuickPick.canSelectMany; }

  public get matchOnDescription(): boolean { return this.realQuickPick.matchOnDescription; }
  public set matchOnDescription(b: boolean) { this.realQuickPick.matchOnDescription = b; }

  public get matchOnDetail(): boolean { return this.realQuickPick.matchOnDetail; }
  public set matchOnDetail(b: boolean) { this.realQuickPick.matchOnDetail = b; }

  public get keepScrollPosition(): boolean | undefined { return this.realQuickPick.keepScrollPosition; }
  public set keepScrollPosition(b: boolean | undefined) { this.realQuickPick.keepScrollPosition = b; }

  public get activeItems(): readonly T[] { return this.realQuickPick.activeItems; }
  public set activeItems(ts: T[]) { this.realQuickPick.activeItems = ts; }

  public get onDidChangeActive(): vscode.Event<readonly T[]> { return this.realQuickPick.onDidChangeActive; }

  public get selectedItems(): readonly T[] { return this.realQuickPick.selectedItems; }
  public set selectedItems(ts: T[]) { this.realQuickPick.selectedItems = ts; }

  public get onDidChangeSelection(): vscode.Event<readonly T[]> { return this.realQuickPick.onDidChangeSelection; }

  // QuickInput fields/methods
  public get title(): string | undefined { return this.realQuickPick.title; }
  public set title(t: string | undefined) { this.realQuickPick.title = t; }

  public get step(): number | undefined { return this.realQuickPick.step; }

  public get totalSteps(): number | undefined { return this.realQuickPick.totalSteps; }

  public get enabled(): boolean { return this.realQuickPick.enabled; }

  public get busy(): boolean { return this.realQuickPick.busy; }

  public get ignoreFocusOut(): boolean { return this.realQuickPick.ignoreFocusOut; }

  public show(): void {
    this.stubber.gotQuickPicks.push([...this.items]);
    currentQuickPick.quickPick = this;
    this.realQuickPick.show();
  }

  public hide(): void {
    this.realQuickPick.hide();
    currentQuickPick.quickPick = undefined;
  }

  public get onDidHide(): vscode.Event<void> { return this.realQuickPick.onDidHide; }

  public dispose(): void { this.realQuickPick.dispose(); }
}
