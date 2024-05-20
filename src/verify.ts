import assert from "assert";
import { readFileSync, writeFileSync } from "fs";
import * as vscode from 'vscode';
import { JSONParse, JSONStringify, StubbablesConfig, StubbablesConfigInternal } from "./run-stubbable";

// TODO: Try to move StubbablesConfigInternal data inside of TestData object
// (or confirm why that isn't possible).

// Set of data to store during tests
export interface TestData {
  infoMessages: string[];
  errorMessages: string[];

  /**
   * If any stub-related error occurred during the test.
   */
  error?: string;
}

export const testData: TestData = {
  infoMessages: [],
  errorMessages: [],
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
  testData.error = undefined;

  oneTimeSetup(mustStubbers);

  mustStubbers.forEach(stubber => stubber.setup());
}


export function testVerify(stubbableTestFile: string, stubbers: Stubber[]) {
  // Verify the outcome (assert in order of information (e.g. mismatch in error messages in more useful than text being mismatched)).
  const finalConfig: StubbablesConfigInternal = JSONParse(readFileSync(stubbableTestFile).toString());
  assertUndefined(finalConfig.error, "StubbablesConfig.error");
  assertUndefined(testData.error, "TestData.error");

  const mustStubbers = stubbers || [];

  assert.deepStrictEqual(testData.errorMessages, finalConfig.expectedErrorMessages || [], "Expected ERROR MESSAGES to be exactly equal");
  assert.deepStrictEqual(testData.infoMessages, finalConfig.expectedInfoMessages || [], "Expected INFO MESSAGES to be exactly equal");

  mustStubbers.forEach(stubber => stubber.verify());
}

// Remove class info so deepStrictEqual works on any type
export function classless(obj: any) {
  return JSON.parse(JSON.stringify(obj));
}

export function classlessMap(obj: any) {
  return JSONParse(JSONStringify(obj));
}

export function assertDefined<T>(t: T | undefined, objectName: string): T {
  assert.notEqual(t, undefined, `Expected ${objectName} to be defined, but it was undefined`);
  return t!;
}

export function assertUndefined<T>(t: T | undefined, objectName: string) {
  assert.equal(t, undefined, `Expected ${objectName} to be undefined, but it was defined: ${t}`);
}
