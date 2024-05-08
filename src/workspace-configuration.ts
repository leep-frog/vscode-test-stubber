import * as vscode from 'vscode';
import { nestedGet, nestedHas, nestedSet } from './nested';
import { StubbablesConfigInternal, runStubbableMethodTwoArgs } from './run-stubbable';

export interface GetConfigurationProps {
  section?: string;
  scope?: vscode.ConfigurationScope;
};

export function vscodeWorkspaceGetConfiguration(): (section?: string, scope?: vscode.ConfigurationScope) => vscode.WorkspaceConfiguration {
  return runStubbableMethodTwoArgs<string | undefined, vscode.ConfigurationScope | undefined, vscode.WorkspaceConfiguration>(
    vscode.workspace.getConfiguration,
    (section: string | undefined, scope: vscode.ConfigurationScope | undefined, sc: StubbablesConfigInternal) => {
      if (scope) {
        sc.error = "ConfigurationScope is not yet supported";
        throw new Error("ConfigurationScope is not yet supported");
      }

      if (!stubWorkspaceConfiguration.cfg) {
        stubWorkspaceConfiguration.cfg = new FakeWorkspaceConfiguration(sc, sc.workspaceConfiguration);
      }

      if (section) {
        // The real VS Code implementation does dot-ambiguous logic (e.g. `"faves.favorites": "abc"` is equivalent to `"faves": { "favorites": "abc" }`).
        // That's complicated so our fake abstraction just always separates dots and exlusively uses the latter representation.
        return stubWorkspaceConfiguration.cfg!.scopedConfiguration(section.split("."));
      }

      return stubWorkspaceConfiguration.cfg!;
    },
  );
}

export const CONFIGURATION_TARGET_ORDER = [
  vscode.ConfigurationTarget.WorkspaceFolder,
  vscode.ConfigurationTarget.Workspace,
  vscode.ConfigurationTarget.Global,
];

export type WorkspaceConfiguration = Map<vscode.ConfigurationTarget, Map<string, any>>;

export class FakeWorkspaceConfiguration implements vscode.WorkspaceConfiguration {

  // Map from scope, to subsection, to value
  readonly configurations: WorkspaceConfiguration;
  readonly sc: StubbablesConfigInternal;

  constructor(sc: StubbablesConfigInternal, startingConfiguration?: WorkspaceConfiguration) {
    this.sc = sc;
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
    this.sc.changed = true;
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

export const stubWorkspaceConfiguration: WorkspaceConfigurationStub = {};
