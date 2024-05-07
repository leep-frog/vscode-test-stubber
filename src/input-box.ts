import assert from 'assert';
import * as vscode from 'vscode';
import { StubbablesConfigInternal } from './run-stubbable';
import { TestData } from './verify';

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

export function inputBoxSetup(sc: StubbablesConfigInternal, td: TestData) {
  vscode.window.showInputBox = async (options?: vscode.InputBoxOptions, token?: vscode.CancellationToken) => {
    if (!sc.inputBoxResponses) {
      td.error = "Ran out of inputBoxResponses";
      return undefined;
    }

    const response = sc.inputBoxResponses!.shift()!;

    const validationMessage = options?.validateInput ? await options.validateInput(response) : undefined;

    td.inputBoxes.push({
      options,
      token,
      validationMessage: validationMessage === null ? undefined : validationMessage,
    });

    return validationMessage ? undefined : response;
  };
}

export function verifyInputBox(sc: StubbablesConfigInternal, td: TestData) {
  assert.deepStrictEqual(td.inputBoxes, sc.expectedInputBoxes || [], "Expected INPUT BOX VALIDATION MESSAGES to be exactly equal");
}
