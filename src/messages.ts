import assert from "assert";
import * as vscode from 'vscode';
import { Stubber } from "./verify";

/**
 * Base class for all message type stubber.
 */
abstract class MessageStubber implements Stubber {

  abstract name: string;
  private readonly messages: string[] = [];
  private readonly expectedMessages: string[];
  error?: string;
  skip: boolean;

  abstract readonly messageName: string;
  abstract readonly originalFunc: <T extends string> (message: string, ...items: T[]) => Thenable<T | undefined>;
  abstract setOriginalFunc(f: <T extends string> (message: string, ...items: T[]) => Thenable<T | undefined>): void;

  constructor(...expectedMessages: string[]) {
    this.expectedMessages = expectedMessages;
    this.skip = false;
  }

  oneTimeSetup(): void { }

  setup(): void {
    this.setOriginalFunc(async (s: string): Promise<undefined> => {
      this.messages.push(s);
      this.originalFunc(s);
      return;
    });
  }

  verify(): void {
    assert.deepStrictEqual(this.messages, this.expectedMessages, `Expected ${this.messageName} to be exactly equal`);
  }

  cleanup(): void {
    this.setOriginalFunc(this.originalFunc);
  }
}

/**
 * Stubber for capturing and verifying info messages.
 */
export class InfoMessageStubber extends MessageStubber {
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
export class WarningMessageStubber extends MessageStubber {
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
export class ErrorMessageStubber extends MessageStubber {
  name: string = "ErrorgMessageStubber";
  messageName: string = "ERROR MESSAGES";
  originalFunc: <T extends string>(message: string, ...items: T[]) => Thenable<T | undefined> = vscode.window.showErrorMessage;
  setOriginalFunc(f: <T extends string>(message: string, ...items: T[]) => Thenable<T | undefined>): void {
    vscode.window.showErrorMessage = f;
  }
}
