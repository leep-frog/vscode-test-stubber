import assert from "assert";
import { readFileSync, writeFileSync } from "fs";
import { jsonIgnoreReplacer } from "json-ignore";
import * as vscode from 'vscode';
import { InputBoxExecution, inputBoxSetup, verifyInputBox } from "./input-box";
import { quickPickOneTimeSetup } from "./quick-pick";
import { StubbablesConfig, StubbablesConfigInternal } from "./run-stubbable";

// Set of data to store during tests
export interface TestData {
  infoMessages: string[];
  errorMessages: string[];

  /**
   * The input box executions made during the test
   */
  inputBoxes: InputBoxExecution[];

  /**
   * If any stub-related error occurred during the test.
   */
  error?: string;
}

const testData: TestData = {
  infoMessages: [],
  errorMessages: [],
  inputBoxes: [],
};

let didOneTime = false;

function oneTimeSetup() {
  if (didOneTime) {
    return;
  }

  // TODO: try/finally to ensure these are reset (is this really needed though?)
  const originalShowInfo = vscode.window.showInformationMessage;
  vscode.window.showInformationMessage = async (s: string) => {
    testData.infoMessages.push(s);
    originalShowInfo(s);
  };
  const originalShowError = vscode.window.showErrorMessage;
  vscode.window.showErrorMessage = async (s: string) => {
    testData.errorMessages.push(s);
    originalShowError(s);
  };

  quickPickOneTimeSetup();
  didOneTime = true;
}

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

  // Stub out message functions
  testData.infoMessages = [];
  testData.errorMessages = [];
  testData.inputBoxes = [];

  oneTimeSetup();

  inputBoxSetup(internalCfg, testData);
}


export function testVerify(stubbableTestFile: string) {
  // Verify the outcome (assert in order of information (e.g. mismatch in error messages in more useful than text being mismatched)).
  const finalConfig: StubbablesConfigInternal = JSON.parse(readFileSync(stubbableTestFile).toString(), jsonIgnoreReplacer);
  assertUndefined(finalConfig.error, "StubbablesConfig.error");
  assertUndefined(testData.error, "TestData.error");

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

  assert.deepStrictEqual(testData.errorMessages, finalConfig.expectedErrorMessages || [], "Expected ERROR MESSAGES to be exactly equal");
  assert.deepStrictEqual(testData.infoMessages, finalConfig.expectedInfoMessages || [], "Expected INFO MESSAGES to be exactly equal");

  verifyInputBox(finalConfig, testData);
}

// Remove class info so deepStrictEqual works on any type
function classless(obj: any) {
  return JSON.parse(JSON.stringify(obj, jsonIgnoreReplacer));
}

function assertUndefined<T>(t: T | undefined, objectName: string) {
  assert.equal(t, undefined, `Expected ${objectName} to be undefined, but it was defined: ${t}`);
}
