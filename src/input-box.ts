import assert from 'assert';
import * as vscode from 'vscode';
import { StubbablesConfigInternal } from './run-stubbable';
// TODO: Stub show input box and then use SimpleTestCase in groog extension

export interface InputBoxExecution {
  /**
   * The options passed to the input box creation method.
   */
  options?: vscode.InputBoxOptions;

  /**
   * The token passed to the input box creation method.
   */
  token?: vscode.CancellationToken;

  /**
   * The validation message produced by the input box.
   */
  validationMessage?: (string | vscode.InputBoxValidationMessage);
}

export function inputBoxSetup(sc: StubbablesConfigInternal) {
  vscode.window.showInputBox = async (options?: vscode.InputBoxOptions, token?: vscode.CancellationToken) => {
    sc.changed = true;
    if (!sc.inputBoxResponses) {
      sc.error = "Ran out of inputBoxResponses";
      return undefined;
    }

    const response = sc.inputBoxResponses!.shift()!;

    const validationMessage = options?.validateInput ? await options.validateInput(response) : undefined;

    sc.gotInputBoxes?.push({
      options,
      token,
      validationMessage: validationMessage === null ? undefined : validationMessage,
    });

    return validationMessage ? undefined : response;
  };
}

export function verifyInputBox(sc: StubbablesConfigInternal) {
  assert.deepStrictEqual(sc.gotInputBoxes || [], sc.expectedInputBoxes || [], "Expected INPUT BOX VALIDATION MESSAGES to be exactly equal");
}
