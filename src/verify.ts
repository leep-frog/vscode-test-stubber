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

let didOneTime = false;

export function oneTimeSetup(stubbers: Stubber[]) {
  if (didOneTime) {
    return;
  }

  stubbers.forEach(stubber => stubber.oneTimeSetup());

  didOneTime = true;
}

/**
 * Setup the stubs for use in the test.
 *
 * @param stubbers the set of stubbers to use
 */
export function testSetup(stubbers: Stubber[]) {
  const mustStubbers = stubbers || [];

  oneTimeSetup(mustStubbers);

  mustStubbers.forEach(stubber => stubber.setup());
}


export function testVerify(stubbers: Stubber[]) {
  const mustStubbers = stubbers || [];

  mustStubbers.forEach(stubber => {
    assertUndefined(stubber.error, `${stubber.name}.error`);
    stubber.verify();
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
