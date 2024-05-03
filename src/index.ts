import { readFileSync, writeFileSync } from 'fs';
import { jsonIgnoreReplacer } from 'json-ignore';
import * as vscode from 'vscode';
import { nestedGet } from '../dist';
import { nestedHas, nestedSet } from './nested';

// TODO: Move these all to other files

const stubbableTestFilePath = process.env.VSCODE_STUBBABLE_TEST_FILE;

export interface StubbablesConfig {
  // If a value is undefined, then return undefined.
  quickPickActions?: QuickPickAction[];
  gotQuickPickOptions?: vscode.QuickPickItem[][];
  changed?: boolean;
  error?: string;

  startingWorkspaceConfiguration?: WorkspaceConfiguration;
  resultingWorkspaceConfiguration?: WorkspaceConfiguration;
}

// TODO: init method and use starting workspace configuration

export const TEST_MODE: boolean = !!stubbableTestFilePath;

export interface GetConfigurationProps {
  section?: string;
  scope?: vscode.ConfigurationScope;
};

export const stubbables = {

  // Stubbable command to create a quick pick controllable in tests
  createQuickPick: <T extends vscode.QuickPickItem> () => {
    return runStubbableMethodNoInput<vscode.QuickPick<T>>(
      vscode.window.createQuickPick,
      () => new FakeQuickPick(vscode.window.createQuickPick()),
    )();
  },

  // Stubbable command to get the workspace configuration
  vscodeWorkspaceGetConfiguration: runStubbableMethod<GetConfigurationProps, vscode.WorkspaceConfiguration>(
    (props: GetConfigurationProps) => vscode.workspace.getConfiguration(props.section, props.scope),
    (props: GetConfigurationProps, sc: StubbablesConfig) => {
      if (props.scope) {
        throw new Error("ConfigurationScope is not yet supported");
      }

      if (!stubWorkspaceConfiguration.cfg) {
        stubWorkspaceConfiguration.cfg = new FakeWorkspaceConfiguration(sc.startingWorkspaceConfiguration);
      }

      if (props.section) {
        // The real VS Code implementation does dot-ambiguous logic (e.g. `"faves.favorites": "abc"` is equivalent to `"faves": { "favorites": "abc" }`).
        // That's complicated so our fake abstraction just always separates dots and exlusively uses the latter representation.
        return stubWorkspaceConfiguration.cfg!.scopedConfiguration(props.section.split("."));
      }

      return stubWorkspaceConfiguration.cfg!;
    },
  ),

  // Stubbable command to show a quick pick controllable in tests
  showQuickPick: runStubbableMethod<vscode.QuickPick<vscode.QuickPickItem>, Thenable<void>>(
    async (qp: vscode.QuickPick<vscode.QuickPickItem>) => qp.show(),
    async (qp: vscode.QuickPick<vscode.QuickPickItem>, sc: StubbablesConfig) => {
      sc.changed = true;
      if (sc.gotQuickPickOptions === undefined) {
        sc.gotQuickPickOptions = [];
      }
      sc.gotQuickPickOptions.push(qp.items.map(item => {
        return {
          // Copy the item elements in case the reference is updated elsewhere.
          ...item,
        };
      }));

      const genericQuickPickAction = sc.quickPickActions?.shift();
      if (!genericQuickPickAction) {
        sc.error = [
          `Ran out of quickPickSelections for quick pick:`,
          `Title:       ${qp.title}`,
          `Placeholder: ${qp.placeholder}`,
          `Items: [`,
          ...qp.items.map(item => JSON.stringify(item)),
          `]`,
        ].join("\n");
        return vscode.commands.executeCommand("workbench.action.closeQuickOpen");
      }

      const actionHandler = quickPickActionHandlers.get(genericQuickPickAction.kind);
      if (!actionHandler) {
        sc.error = `Unsupported QuickPickActionKind: ${genericQuickPickAction.kind}`;
        return vscode.commands.executeCommand("workbench.action.closeQuickOpen");
      }

      const action = actionHandler(genericQuickPickAction);
      const [errorMessage, promise] = action.run(qp);
      if (errorMessage) {
        sc.error = errorMessage;
      }
      return promise;
    },
  ),
};

function runStubbableMethodNoInput<O>(nonTestLogic: () => O, testLogic: (config: StubbablesConfig) => O): () => O {
  return runStubbableMethod<void, O>(
    (input: void) => nonTestLogic(),
    (input: void, sc: StubbablesConfig) => testLogic(sc),
  );
}

function runStubbableMethod<I, O>(nonTestLogic: (input: I) => O, testLogic: (input: I, config: StubbablesConfig) => O): (input: I) => O {
  return (input: I) => {
    if (!stubbableTestFilePath) {
      return nonTestLogic(input);
    }

    let stubbableConfig: StubbablesConfig;
    try {
      stubbableConfig = JSON.parse(readFileSync(stubbableTestFilePath).toString());
    } catch (e) {
      vscode.window.showErrorMessage(`Failed to read/parse stubbables test file: ${e}`);
      return nonTestLogic(input);
    }
    stubbableConfig.changed = undefined;

    const ret = testLogic(input, stubbableConfig);

    try {
      if (stubbableConfig.changed) {
        // jsonIgnoreReplacer ensures that relevant @jsonIgnore() annotated fields aren't included
        writeFileSync(stubbableTestFilePath, JSON.stringify(stubbableConfig, jsonIgnoreReplacer));
      }
    } catch (e) {
      vscode.window.showErrorMessage(`Failed to write stubbables config back test file: ${e}`);
    }

    return ret;
  };
}

/*******************
 * QuickPickAction *
********************/

// All this rigmarole is needed since we serialize to and from JSON (which causes method info to be lost (i.e. the `run`method)).
// That is why we need the separation of the QuickPickAction types and the QuickPickActionHandler types.

enum QuickPickActionKind {
  Close,
  SelectItem,
  PressItemButton,
  PressUnknownButton,
  NoOp,
}

interface QuickPickAction {
  readonly kind: QuickPickActionKind;
  // Run the quick pick action, or return an error
  // It returns [string|undefined, Thenable<any>] because when initially had Thenable<string | undefined>,
  // the error wasn't being set properly in the stubbables method.
  run(qp: vscode.QuickPick<vscode.QuickPickItem>): [string | undefined, Thenable<any>];
}

/*****************************
 * SelectItemQuickPickAction *
******************************/

export class SelectItemQuickPickAction implements QuickPickAction {
  readonly kind: QuickPickActionKind = QuickPickActionKind.SelectItem;
  readonly itemLabels: string[];

  constructor(itemLabels: string[]) {
    this.itemLabels = itemLabels;
  }

  static fromJsonifiedObject(action: SelectItemQuickPickAction): SelectItemQuickPickAction {
    return new SelectItemQuickPickAction(action.itemLabels);
  }

  run(qp: vscode.QuickPick<vscode.QuickPickItem>): [string | undefined, Thenable<any>] {
    const matchedItems: vscode.QuickPickItem[] = [];
    for (const item of qp.items) {
      if (this.itemLabels.includes(item.label)) {
        matchedItems.push(item);
      }
    }

    if (matchedItems.length !== this.itemLabels.length) {
      return [`All item labels were not matched. Found [${matchedItems.map(item => item.label)}]; wanted [${this.itemLabels}]`, Promise.resolve()];
    }

    qp.show();
    const fqp = qp as FakeQuickPick<vscode.QuickPickItem>;
    try {
      const promise = fqp.acceptItems(matchedItems);
      return [undefined, promise];
    } catch (e) {
      throw new Error(`An error occurred. The most likely cause is that you're creating your QuickPick with vscode.window.createQuickPick() instead of stubbables.createQuickPick(). Actual error is below:\n\n${e}`);
    }
  }
}

/************************
 * CloseQuickPickAction *
*************************/

export class CloseQuickPickAction implements QuickPickAction {
  kind = QuickPickActionKind.Close;

  run(): [string | undefined, Thenable<any>] {
    return [undefined, vscode.commands.executeCommand("workbench.action.closeQuickOpen")];
  }

  static fromJsonifiedObject(action: CloseQuickPickAction): CloseQuickPickAction {
    return new CloseQuickPickAction();
  }
}

/************************
 * NoOpQuickPickAction *
*************************/

export class NoOpQuickPickAction implements QuickPickAction {
  kind = QuickPickActionKind.NoOp;

  run(): [string | undefined, Thenable<any>] {
    return [undefined, Promise.resolve()];
  }

  static fromJsonifiedObject(action: NoOpQuickPickAction): NoOpQuickPickAction {
    return new NoOpQuickPickAction();
  }
}

/**********************************
 * PressItemButtonQuickPickAction *
***********************************/

export class PressItemButtonQuickPickAction implements QuickPickAction {
  kind = QuickPickActionKind.PressItemButton;
  itemLabel: string;
  // Use buttonIndex because contents of button (e.g. icon and tooltip)
  // will be validated in tests when comparing wantQuickPickOptions
  buttonIndex: number;

  constructor(itemLabel: string, buttonIndex: number) {
    this.itemLabel = itemLabel;
    this.buttonIndex = buttonIndex;
  }

  static fromJsonifiedObject(action: PressItemButtonQuickPickAction): PressItemButtonQuickPickAction {
    return new PressItemButtonQuickPickAction(action.itemLabel, action.buttonIndex);
  }

  run(qp: vscode.QuickPick<vscode.QuickPickItem>): [string | undefined, Thenable<any>] {
    for (const item of qp.items) {
      if (item.label !== this.itemLabel) {
        continue;
      }

      const button = item.buttons?.at(this.buttonIndex);
      if (!button) {
        return [`Item only has ${item.buttons?.length}, but needed at least ${this.buttonIndex+1}`, Promise.resolve()];
      }

      qp.show();
      const fqp = qp as FakeQuickPick<vscode.QuickPickItem>;
      try {
        const promise = fqp.pressItemButton(item, button);
        return [undefined, promise];
      } catch (e) {
        throw new Error(`An error occurred. The most likely cause is that you're creating your QuickPick with vscode.window.createQuickPick() instead of stubbables.createQuickPick(). Actual error is below:\n\n${e}`);
      }
    }

    return [`No items matched the provided text selection`, Promise.resolve()];
  }
}

/*************************************
 * PressUnknownButtonQuickPickAction *
**************************************/

export class PressUnknownButtonQuickPickAction implements QuickPickAction {
  kind = QuickPickActionKind.PressUnknownButton;
  itemLabel: string;

  constructor(itemLabel: string) {
    this.itemLabel = itemLabel;
  }

  static fromJsonifiedObject(action: PressUnknownButtonQuickPickAction): PressUnknownButtonQuickPickAction {
    return new PressUnknownButtonQuickPickAction(action.itemLabel);
  }

  run(qp: vscode.QuickPick<vscode.QuickPickItem>): [string | undefined, Thenable<any>] {
    for (const item of qp.items) {
      if (item.label !== this.itemLabel) {
        continue;
      }

      const unknownButton: vscode.QuickInputButton = new FakeQuickInputButton();
      qp.show();
      const fqp = qp as FakeQuickPick<vscode.QuickPickItem>;
      try {
        const promise = fqp.pressItemButton(item, unknownButton);
        return [undefined, promise];
      } catch (e) {
        throw new Error(`An error occurred. The most likely cause is that you're creating your QuickPick with vscode.window.createQuickPick() instead of stubbables.createQuickPick(). Actual error is below:\n\n${e}`);
      }
    }

    return [`No items matched the provided text selection`, Promise.resolve()];
  }
}

class FakeQuickInputButton implements vscode.QuickInputButton {
  readonly iconPath: vscode.ThemeIcon;
  constructor() {
    this.iconPath = new vscode.ThemeIcon("invalid-icon-path-string");
  }
}

/*****************************
 * Handler Aggregation Types *
******************************/

const quickPickActionHandlers = new Map<QuickPickActionKind, (props: any) => QuickPickAction>([
  [QuickPickActionKind.SelectItem, SelectItemQuickPickAction.fromJsonifiedObject],
  [QuickPickActionKind.Close, CloseQuickPickAction.fromJsonifiedObject],
  [QuickPickActionKind.NoOp, NoOpQuickPickAction.fromJsonifiedObject],
  [QuickPickActionKind.PressItemButton, PressItemButtonQuickPickAction.fromJsonifiedObject],
  [QuickPickActionKind.PressUnknownButton, PressUnknownButtonQuickPickAction.fromJsonifiedObject],
]);

/*********************
 * QuickPick Wrapper *
**********************/

class FakeQuickPick<T extends vscode.QuickPickItem> implements vscode.QuickPick<T> {

  private readonly realQuickPick: vscode.QuickPick<T>;

  private readonly acceptHandlers: ((e: void) => Promise<any>)[];
  private readonly buttonHandlers: ((e: vscode.QuickInputButton) => Promise<any>)[];
  private readonly itemButtonHandlers: ((e: vscode.QuickPickItemButtonEvent<T>) => Promise<any>)[];

  constructor(realQuickPick: vscode.QuickPick<T>) {
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

  public show(): void { this.realQuickPick.show(); }

  public hide(): void { this.realQuickPick.hide(); }

  public get onDidHide(): vscode.Event<void> { return this.realQuickPick.onDidHide; }

  public dispose(): void { this.realQuickPick.dispose(); }
}

/***************************
 * Workspace Configuration *
****************************/

export const CONFIGURATION_TARGET_ORDER = [
  vscode.ConfigurationTarget.WorkspaceFolder,
  vscode.ConfigurationTarget.Workspace,
  vscode.ConfigurationTarget.Global,
];

export type WorkspaceConfiguration = Map<vscode.ConfigurationTarget, Map<string, any>>;

export class FakeWorkspaceConfiguration implements vscode.WorkspaceConfiguration {

  // Map from scope, to subsection, to value
  readonly configurations: WorkspaceConfiguration;

  constructor(startingConfiguration?: WorkspaceConfiguration) {
    this.configurations = startingConfiguration || new Map<vscode.ConfigurationTarget, Map<string, any>>();
  }

  scopedConfiguration(sections: string[]) {
    return new FakeScopedWorkspaceConfiguration(this, sections);
  }

  get<T>(section: string, defaultValue?: T): T | undefined {
    const sectionParts = section.split(".");
    for (const configurationTarget of CONFIGURATION_TARGET_ORDER) {
      const targetMap = this.configurations.get(configurationTarget);
      if (targetMap && nestedHas(targetMap, sectionParts)) {
        return nestedGet(targetMap, sectionParts)!;
      }
    }
    return defaultValue;
  }

  has(section: string): boolean {
    const sectionParts = section.split(".");
    return CONFIGURATION_TARGET_ORDER.some(configurationTarget => {
      const targetMap = this.configurations.get(configurationTarget);
      return !!(targetMap && nestedHas(targetMap, sectionParts));
    });
  }

  inspect<T>(_section: string): { key: string; defaultValue?: T | undefined; globalValue?: T | undefined; workspaceValue?: T | undefined; workspaceFolderValue?: T | undefined; defaultLanguageValue?: T | undefined; globalLanguageValue?: T | undefined; workspaceLanguageValue?: T | undefined; workspaceFolderLanguageValue?: T | undefined; languageIds?: string[] | undefined; } | undefined {
    throw new Error(`FakeWorkspaceConfiguration.inspect is not yet supported`);
  }

  async update(section: string, value: any, unqualifiedConfigurationTarget?: boolean | vscode.ConfigurationTarget | null | undefined, overrideInLanguage?: boolean | undefined): Promise<void> {
    const configurationTarget = this.parseConfigurationTarget(unqualifiedConfigurationTarget);

    if (!!overrideInLanguage) {
      throw new Error(`overrideInLanguage is not yet supported`);
    }

    if (!this.configurations.has(configurationTarget)) {
      this.configurations.set(configurationTarget, new Map<string, any>());
    }
    nestedSet(this.configurations.get(configurationTarget)!, section, value);
    return;
  }

  // This logic was determined by the definition of the configurationTarget argument in the `update` method's javadoc
  // (located in vscode files).
  private parseConfigurationTarget(configurationTarget: boolean | vscode.ConfigurationTarget | null | undefined): vscode.ConfigurationTarget {
    if (configurationTarget === vscode.ConfigurationTarget.Global) {
      return vscode.ConfigurationTarget.Global;
    }

    if (configurationTarget === vscode.ConfigurationTarget.Workspace) {
      return vscode.ConfigurationTarget.Workspace;
    }

    if (configurationTarget === vscode.ConfigurationTarget.WorkspaceFolder) {
      return vscode.ConfigurationTarget.WorkspaceFolder;
    }

    if (configurationTarget === true) {
      return vscode.ConfigurationTarget.Global;
    }

    if (configurationTarget === false) {
      return vscode.ConfigurationTarget.Workspace;
    }

    return vscode.ConfigurationTarget.WorkspaceFolder;
  }
}

class FakeScopedWorkspaceConfiguration implements vscode.WorkspaceConfiguration {

  // Map from scope, to subsection, to value
  readonly globalConfiguration: FakeWorkspaceConfiguration;
  readonly sections: string[];

  constructor(globalConfiguration: FakeWorkspaceConfiguration, sections: string[]) {
    this.globalConfiguration = globalConfiguration;
    this.sections = sections;
  }

  nestedSection(section: string): string {
    return [
      ...this.sections,
      ...section.split("."),
    ].join(".");
  }

  // TODO: nested get with dot notation (e.g. faves.favorite)
  get<T>(section: string, defaultValue?: T): T | undefined {
    return this.globalConfiguration.get(this.nestedSection(section), defaultValue);
  }

  has(section: string): boolean {
    return this.globalConfiguration.has(this.nestedSection(section));
  }

  inspect<T>(_section: string): { key: string; defaultValue?: T | undefined; globalValue?: T | undefined; workspaceValue?: T | undefined; workspaceFolderValue?: T | undefined; defaultLanguageValue?: T | undefined; globalLanguageValue?: T | undefined; workspaceLanguageValue?: T | undefined; workspaceFolderLanguageValue?: T | undefined; languageIds?: string[] | undefined; } | undefined {
    throw new Error(`FakeScopedWorkspaceConfiguration.inspect is not yet supported`);
  }

  async update(section: string, value: any, unqualifiedConfigurationTarget?: boolean | vscode.ConfigurationTarget | null | undefined, overrideInLanguage?: boolean | undefined): Promise<void> {
    return this.globalConfiguration.update(this.nestedSection(section), value, unqualifiedConfigurationTarget, overrideInLanguage);
  }
}

interface WorkspaceConfigurationStub {
  cfg?: FakeWorkspaceConfiguration;
}

const stubWorkspaceConfiguration: WorkspaceConfigurationStub = {};
