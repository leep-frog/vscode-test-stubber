import * as vscode from 'vscode';
import { nestedGet, nestedHas, nestedSet } from './nested';
import { StubbablesConfigInternal, runStubbableMethodTwoArgs, updateConfig } from './run-stubbable';

// The real VS Code implementation does dot-ambiguous logic (e.g. `"faves.favorites": "abc"` is equivalent to `"faves": { "favorites": "abc" }`).
// That's complicated so our fake abstraction just always separates dots and exlusively uses the latter representation.

export function vscodeWorkspaceGetConfiguration(): (section?: string, scope?: vscode.ConfigurationScope) => vscode.WorkspaceConfiguration {
  return runStubbableMethodTwoArgs<string | undefined, vscode.ConfigurationScope | undefined, vscode.WorkspaceConfiguration>(
    vscode.workspace.getConfiguration,
    (section: string | undefined, scope: vscode.ConfigurationScope | undefined, sc: StubbablesConfigInternal) => {

      const languageId = getLanguageId(scope, sc);

      // Ensure all fields are set (and ensure that we assing this in the sc object if undefined).
      sc.workspaceConfiguration = mustWorkspaceConfiguration(sc.workspaceConfiguration);

      const sectionParts = section === undefined ? [] : section.split(".");

      // We already applied must above, so just cast it here
      return new FakeScopedWorkspaceConfiguration(sc, (sc.workspaceConfiguration as MustWorkspaceConfiguration), sectionParts, languageId);
    },
  );
}

interface SerializedMap {
  type: string;
  entries: [any, any][];
}

export function replacer(this: any, key: string, value: any): any {
  if (!(value instanceof Map)) {
    return value;
  }

  const entries = [...(value as Map<any, any>).entries()];
  const sm: SerializedMap = {
    type: "@SerializedMap",
    entries,
  };
  return sm;
}

export function reviver(this: any, key: string, value: any): any {
  const sm = (value as SerializedMap);
  if (sm?.type && sm.type === "@SerializedMap") {
    return new Map<any ,any>(sm.entries);
  }
  return value;
}

function getLanguageId(scope: vscode.ConfigurationScope | undefined, sc: StubbablesConfigInternal): string | undefined {
  if (!scope) {
    return;
  }

  const languageScope = scope as { languageId: string };
  if (languageScope.languageId) {
    return languageScope.languageId;
  }

  sc.error = "Only languageId is supported for ConfigurationScope";
  updateConfig(sc);
  throw new Error("Only languageId is supported for ConfigurationScope");
}

export const CONFIGURATION_TARGET_ORDER = [
  vscode.ConfigurationTarget.WorkspaceFolder,
  vscode.ConfigurationTarget.Workspace,
  vscode.ConfigurationTarget.Global,
];

export interface WorkspaceConfiguration {
  configuration?: Map<vscode.ConfigurationTarget, Map<string, any>>;
  languageConfiguration?: Map<string, Map<vscode.ConfigurationTarget, Map<string, any>>>;
}

interface MustWorkspaceConfiguration {
  configuration: Map<vscode.ConfigurationTarget, Map<string, any>>;
  languageConfiguration: Map<string, Map<vscode.ConfigurationTarget, Map<string, any>>>;
}

export function mustWorkspaceConfiguration(maybeCfg?: WorkspaceConfiguration): MustWorkspaceConfiguration {
  return {
    configuration: maybeCfg?.configuration || new Map<vscode.ConfigurationTarget, Map<string, any>>(),
    languageConfiguration: maybeCfg?.languageConfiguration || new Map<string, Map<vscode.ConfigurationTarget, Map<string, any>>>(),
  };
}

export class FakeScopedWorkspaceConfiguration implements vscode.WorkspaceConfiguration {

  readonly sc: StubbablesConfigInternal;
  readonly globalConfiguration: MustWorkspaceConfiguration;
  readonly sections: string[];
  readonly languageId?: string;

  constructor(sc: StubbablesConfigInternal, globalConfiguration: MustWorkspaceConfiguration, sections?: string[], languageId?: string) {
    this.sc = sc;
    this.globalConfiguration = globalConfiguration;
    this.sections = sections || [];
    this.languageId = languageId;
  }

  private currentConfiguration(props?: {
    must?: boolean;
    noLanguageId?: boolean;
  }): Map<vscode.ConfigurationTarget, Map<string, any>> | undefined {
    if (this.languageId === undefined || props?.noLanguageId) {
      return this.globalConfiguration.configuration;
    }

    if (props?.must && !this.globalConfiguration.languageConfiguration.has(this.languageId)) {
      this.globalConfiguration.languageConfiguration.set(this.languageId, new Map<vscode.ConfigurationTarget, Map<string, any>>());
    }
    return this.globalConfiguration.languageConfiguration.get(this.languageId);
  }

  get<T>(section: string, defaultValue?: T): T | undefined {
    const sectionParts = [...this.sections, ...section.split(".")];
    for (const configurationTarget of CONFIGURATION_TARGET_ORDER) {
      const targetMap = this.currentConfiguration()?.get(configurationTarget);
      if (targetMap && nestedHas(targetMap, sectionParts)) {
        return nestedGet(targetMap, sectionParts)!;
      }
    }
    return defaultValue;
  }

  has(section: string): boolean {
    const sectionParts = [...this.sections, ...section.split(".")];
    return CONFIGURATION_TARGET_ORDER.some(configurationTarget => {
      const targetMap = this.currentConfiguration()?.get(configurationTarget);
      return !!(targetMap && nestedHas(targetMap, sectionParts));
    });
  }

  inspect<T>(_section: string): { key: string; defaultValue?: T | undefined; globalValue?: T | undefined; workspaceValue?: T | undefined; workspaceFolderValue?: T | undefined; defaultLanguageValue?: T | undefined; globalLanguageValue?: T | undefined; workspaceLanguageValue?: T | undefined; workspaceFolderLanguageValue?: T | undefined; languageIds?: string[] | undefined; } | undefined {
    throw new Error(`FakeScopedWorkspaceConfiguration.inspect is not yet supported`);
  }

  async update(section: string, value: any, unqualifiedConfigurationTarget?: boolean | vscode.ConfigurationTarget | null | undefined, overrideInLanguage?: boolean | undefined): Promise<void> {
    const configurationTarget = this.parseConfigurationTarget(unqualifiedConfigurationTarget);

    const currentCfg = this.currentConfiguration({
      must: true,
      noLanguageId: !overrideInLanguage,
    })!;
    if (!currentCfg.has(configurationTarget)) {
      currentCfg.set(configurationTarget, new Map<string, any>());
    }
    nestedSet(currentCfg.get(configurationTarget)!, [...this.sections, section].join("."), value);

    this.sc.gotWorkspaceConfiguration = this.globalConfiguration;
    updateConfig(this.sc);
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
