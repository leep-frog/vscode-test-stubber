import assert from "assert";
import { JSONParse, JSONStringify } from "./json";

export interface Stubber {
  name: string;
  oneTimeSetup(): void;
  setup(): void;
  verify(): void;
  cleanup(): void;
  error?: string;
}

export interface Stub {
  /**
  * If true, then the logic for the stub will not be run and the normal VS Code
  * execution will be done.
  */
  skip?: boolean;

  /**
  * If true, then no verification logic for the stub will be executed.
  */
  skipVerify?: boolean;
}

export interface StubInfo {
  stub?: Stub;
  stubber: Stubber;
}

let didOneTime = false;

export function oneTimeSetup(stubInfos: StubInfo[]) {
  if (didOneTime) {
    return;
  }

  stubInfos.forEach(stubInfo => stubInfo.stubber.oneTimeSetup());

  didOneTime = true;
}

/**
 * Setup the stubs for use in the test.
 *
 * @param stubbers the set of stubbers to use
 */
export function testSetup(stubInfos: StubInfo[]) {
  oneTimeSetup(stubInfos);

  stubInfos.forEach(stubInfos => {
    if (!stubInfos.stub?.skip) {
      stubInfos.stubber.setup();
    }
  });
}


export function testVerify(stubInfos: StubInfo[]) {
  stubInfos.forEach(stubInfos => {
    assertUndefined(stubInfos.stubber.error, `${stubInfos.stubber.name}.error`);

    if (!stubInfos.stub?.skip && !stubInfos.stub?.skipVerify) {
      stubInfos.stubber.verify();
    }
  });
}

export function testCleanup(stubInfos: StubInfo[]) {
  stubInfos.forEach(stubInfos => {
    if (!stubInfos.stub?.skip) {
      stubInfos.stubber.cleanup();
    }
  });
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
