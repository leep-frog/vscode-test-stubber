import assert from "assert";
import { readFileSync, writeFileSync } from "fs";
import * as vscode from 'vscode';
import { InputBoxExecution, inputBoxSetup, verifyInputBox } from "./input-box";
import { quickPickOneTimeSetup } from "./quick-pick";
import { JSONParse, JSONStringify, StubbablesConfig, StubbablesConfigInternal } from "./run-stubbable";

// TODO: Try to move StubbablesConfigInternal data inside of TestData object
// (or confirm why that isn't possible).

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

  /**
   * The quick pick executions made during the test.
   */
  quickPicks: vscode.QuickPickItem[][];
}

export const testData: TestData = {
  infoMessages: [],
  errorMessages: [],
  inputBoxes: [],
  quickPicks: [],
};

export interface Stubber/*<T>*/ {
  oneTimeSetup(): void;
  setup(): void;
  verify(): void;
  // get(td: TestData): T;
}

let didOneTime = false;

function oneTimeSetup(stubbers: Stubber[]) {
  if (didOneTime) {
    return;
  }

  stubbers.forEach(stubber => stubber.oneTimeSetup());

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
export function testSetup(stubbableTestFile: string, stubbers: Stubber[], config?: StubbablesConfig) {
  const internalCfg: StubbablesConfigInternal = {
    ...config,
  };

  const mustStubbers = stubbers || [];

  writeFileSync(stubbableTestFile, JSONStringify(internalCfg || {}));

  // Stub out message functions
  testData.infoMessages = [];
  testData.errorMessages = [];
  testData.inputBoxes = [];
  testData.quickPicks = [];
  testData.error = undefined;

  oneTimeSetup(mustStubbers);

  mustStubbers.forEach(stubber => stubber.setup());

  inputBoxSetup(internalCfg, testData);
}


export function testVerify(stubbableTestFile: string, stubbers: Stubber[]) {
  // Verify the outcome (assert in order of information (e.g. mismatch in error messages in more useful than text being mismatched)).
  const finalConfig: StubbablesConfigInternal = JSONParse(readFileSync(stubbableTestFile).toString());
  assertUndefined(finalConfig.error, "StubbablesConfig.error");
  assertUndefined(testData.error, "TestData.error");

  const mustStubbers = stubbers || [];

  // Verify quick pick interactions
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
  assert.deepStrictEqual(classless(testData.quickPicks), classless(wantQuickPickOptions), "Expected QUICK PICK OPTIONS to be exactly equal");

  assert.deepStrictEqual(testData.errorMessages, finalConfig.expectedErrorMessages || [], "Expected ERROR MESSAGES to be exactly equal");
  assert.deepStrictEqual(testData.infoMessages, finalConfig.expectedInfoMessages || [], "Expected INFO MESSAGES to be exactly equal");

  verifyInputBox(finalConfig, testData);

  mustStubbers.forEach(stubber => stubber.verify());
}

// Remove class info so deepStrictEqual works on any type
export function classless(obj: any) {
  return JSON.parse(JSON.stringify(obj));
}

export function classlessMap(obj: any) {
  return JSONParse(JSONStringify(obj));
}

function assertUndefined<T>(t: T | undefined, objectName: string) {
  assert.equal(t, undefined, `Expected ${objectName} to be undefined, but it was defined: ${t}`);
}
