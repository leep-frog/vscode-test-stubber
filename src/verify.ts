import assert from "assert";
import { readFileSync, writeFileSync } from "fs";
import { jsonIgnoreReplacer } from "json-ignore";
import * as vscode from 'vscode';
import { StubbablesConfig, StubbablesConfigInternal } from "./run-stubbable";

/**
 * Setup the stubs for use in the test.
 *
 * @param stubbableTestFile the path to the stubbables test file
 */
export function testSetup(stubbableTestFile: string, config?: StubbablesConfig) {
  const internalCfg: StubbablesConfigInternal = {
    ...config,
  };

  // Assume no configuration changes if expected is not provided.
  if (config?.expectedWorkspaceConfiguration === undefined) {
    internalCfg.expectedWorkspaceConfiguration = config?.workspaceConfiguration;
  }

  writeFileSync(stubbableTestFile, JSON.stringify(internalCfg || {}, jsonIgnoreReplacer));
}


export function testVerify(stubbableTestFile: string) {
  // Verify the outcome (assert in order of information (e.g. mismatch in error messages in more useful than text being mismatched)).
  const finalConfig: StubbablesConfigInternal = JSON.parse(readFileSync(stubbableTestFile).toString(), jsonIgnoreReplacer);
  assertUndefined(finalConfig.error, "StubbablesConfig.error");

  // Verify quick pick interactions
  assert.deepStrictEqual(finalConfig.quickPickActions ?? [], [], "Unused QUICK PICK ACTIONS to be empty");

  const wantQuickPickOptions = (finalConfig.expectedQuickPickExecutions ?? []).map((value: (string | vscode.QuickPickItem)[], index: number, array: (string | vscode.QuickPickItem)[][]) => {
    return value.map((s: string | vscode.QuickPickItem) => {

      if (typeof(s) === typeof("")) {
        return {
          label: s,
        } as vscode.QuickPickItem;
      }

      return (s as vscode.QuickPickItem);
    });
  });
  assert.deepStrictEqual(classless(finalConfig.gotQuickPickOptions ?? []), classless(wantQuickPickOptions), "Expected QUICK PICK OPTIONS to be exactly equal");

  // Verify workspace configuration
  assert.deepStrictEqual(finalConfig.workspaceConfiguration || {}, finalConfig.expectedWorkspaceConfiguration || {});
}

function classless(obj: any) {
  return JSON.parse(JSON.stringify(obj, jsonIgnoreReplacer));
}

function assertUndefined<T>(t: T | undefined, objectName: string) {
  assert.equal(t, undefined, `Expected ${objectName} to be undefined, but it was defined: ${t}`);
}
