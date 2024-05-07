import assert from 'assert';
import * as vscode from 'vscode';
import { StubbablesConfigInternal } from './run-stubbable';
import { TestData } from './verify';

export interface InputBoxExecutionOptions extends Omit<vscode.InputBoxOptions, "validateInput">{
  /**
   * Whether or not the validateInput method was provided
   */
  validateInputProvided?: boolean;
}

export interface InputBoxExecution {
  /**
   * The options passed to the input box creation method.
   */
  options?: InputBoxExecutionOptions;

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

    const exOptions: InputBoxExecutionOptions | undefined = options ? {
      ...options,
      validateInputProvided: !!(options?.validateInput),
    } : undefined;

    td.inputBoxes.push({
      options: exOptions,
      validationMessage: validationMessage === null ? undefined : validationMessage,
    });

    return validationMessage ? undefined : response;
  };
}

export function verifyInputBox(sc: StubbablesConfigInternal, td: TestData) {
  assert.deepStrictEqual(td.inputBoxes, sc.expectedInputBoxes || [], "Expected INPUT BOX VALIDATION MESSAGES to be exactly equal");
}
