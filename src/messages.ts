import assert from "assert";
import * as vscode from 'vscode';
import { ErrorMessageStub, InformationMessageStub, MessageStub, WarningMessageStub } from "./test-case";
import { Stubber } from "./verify";

/**
 * Base class for all message type stubber.
 */
abstract class MessageStubber<T extends MessageStub> implements Stubber {

  abstract name: string;
  private readonly messages: string[] = [];
  private readonly expectedMessages: string[];
  private readonly ignoreOrder: boolean;
  error?: string;

  abstract readonly messageName: string;
  abstract readonly originalFunc: <T extends string> (message: string, ...items: T[]) => Thenable<T | undefined>;
  abstract setOriginalFunc(f: <T extends string> (message: string, ...items: T[]) => Thenable<T | undefined>): void;

  constructor(stub?: T) {
    this.expectedMessages = stub?.expectedMessages || [];
    this.ignoreOrder = !!stub?.ignoreOrder;
  }

  oneTimeSetup(): void { }

  setup(): void {
    this.setOriginalFunc(async (s: string): Promise<undefined> => {
      this.messages.push(s);
      await this.originalFunc(s);
      return;
    });
  }

  verify(): void {
    // Copy arrays so sorting doesn't change the order.
    const got = [...this.messages];
    const want = [...this.expectedMessages];

    if (this.ignoreOrder) {
      got.sort();
      want.sort();
    }

    assert.deepStrictEqual(got, want, `Expected ${this.messageName} to be exactly equal${this.ignoreOrder ? " (ignoring order)" : ""}`);
  }

  cleanup(): void {
    this.setOriginalFunc(this.originalFunc);
  }
}

/**
 * Stubber for capturing and verifying info messages.
 */
export class InfoMessageStubber extends MessageStubber<InformationMessageStub> {
  name: string = "InfoMessageStubber";
  messageName: string = "INFO MESSAGES";
  originalFunc: <T extends string>(message: string, ...items: T[]) => Thenable<T | undefined> = vscode.window.showInformationMessage;
  setOriginalFunc(f: <T extends string>(message: string, ...items: T[]) => Thenable<T | undefined>): void {
    vscode.window.showInformationMessage = f;
  }
}

/**
 * Stubber for capturing and verifying warning messages.
 */
export class WarningMessageStubber extends MessageStubber<WarningMessageStub> {
  name: string = "WarningMessageStubber";
  messageName: string = "WARNING MESSAGES";
  originalFunc: <T extends string>(message: string, ...items: T[]) => Thenable<T | undefined> = vscode.window.showWarningMessage;
  setOriginalFunc(f: <T extends string>(message: string, ...items: T[]) => Thenable<T | undefined>): void {
    vscode.window.showWarningMessage = f;
  }
}

/**
 * Stubber for capturing and verifying error messages.
 */
export class ErrorMessageStubber extends MessageStubber<ErrorMessageStub> {
  name: string = "ErrorgMessageStubber";
  messageName: string = "ERROR MESSAGES";
  originalFunc: <T extends string>(message: string, ...items: T[]) => Thenable<T | undefined> = vscode.window.showErrorMessage;
  setOriginalFunc(f: <T extends string>(message: string, ...items: T[]) => Thenable<T | undefined>): void {
    vscode.window.showErrorMessage = f;
  }
}
