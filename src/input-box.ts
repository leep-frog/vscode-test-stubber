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
    if (!sc.inputBoxResponses || sc.inputBoxResponses.length === 0) {
      td.error = "Ran out of inputBoxResponses";
      return undefined;
    }

    const response = sc.inputBoxResponses!.shift()!;

    const validationMessage = options?.validateInput ? await options.validateInput(response) : undefined;

    td.inputBoxes.push(createExecution(validationMessage, options));

    return validationMessage ? undefined : response;
  };
}

function createExecution(validationMessage?: string | vscode.InputBoxValidationMessage | null, options?: vscode.InputBoxOptions): InputBoxExecution {
  const exOpts = createExecutionOptions(options);

  // This weirdness is needed, otherwise assert.deepStrictEqual returns an error when undefined
  if (validationMessage === undefined || validationMessage === null) {
    return {
      options: exOpts,
    };
  }
  return {
    options: exOpts,
    validationMessage: validationMessage,
  };
}

function createExecutionOptions(options?: vscode.InputBoxOptions): InputBoxExecutionOptions | undefined {
  if (!options) {
    return;
  }

  const {validateInput, ...relevantOptions} = options;
  return {
    ...relevantOptions,
    validateInputProvided: validateInput !== undefined,
  };
}

export function verifyInputBox(sc: StubbablesConfigInternal, td: TestData) {
  assert.deepStrictEqual(td.inputBoxes, sc.expectedInputBoxes || [], "Expected INPUT BOX VALIDATION MESSAGES to be exactly equal");
  assert.deepStrictEqual((sc.inputBoxResponses || []).slice(td.inputBoxes.length), [], "Unused inputBoxResponses");
}
