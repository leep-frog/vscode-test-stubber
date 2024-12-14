import assert from 'assert';
import * as vscode from 'vscode';
import { Stubber } from './verify';

export interface InputBoxExecutionOptions extends Omit<vscode.InputBoxOptions, "validateInput"> {
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

export class InputBoxStubber implements Stubber {

  /**
   * The name of the stubber.
   */
  name: string = "InputBoxStubber";

  /**
   * The input box responses to return.
   */
  private inputBoxResponses: (string | undefined)[];

  /**
   * The input box executions made during the test
   */
  private expectedInputBoxExecutions: InputBoxExecution[];

  /**
   * The input box executions actually made during the test
   */
  private inputBoxExecutions: InputBoxExecution[];

  /**
   * Any stubbing errors that occurred during execution.
   */
  error?: string;

  skip: boolean;

  constructor(responses?: (string | undefined)[], expectedExecutions?: InputBoxExecution[]) {
    this.inputBoxExecutions = [];
    this.inputBoxResponses = responses || [];
    this.expectedInputBoxExecutions = expectedExecutions || [];
    this.skip = false;
  }

  oneTimeSetup(): void {

  }

  setup(): void {
    vscode.window.showInputBox = async (options?: vscode.InputBoxOptions, token?: vscode.CancellationToken) => {
      // Need to check length because sometimes array values can be undefined. (TODO: Add test for this)
      if (this.inputBoxResponses.length === 0) {
        this.error = "Ran out of inputBoxResponses";
        return undefined;
      }

      const response = this.inputBoxResponses.shift();

      const validationMessage = options?.validateInput ? await options.validateInput(response || "") : undefined;

      this.inputBoxExecutions.push(createExecution(validationMessage, options));

      return validationMessage ? undefined : response;
    };
  }

  verify(): void {
    assert.deepStrictEqual(this.inputBoxExecutions, this.expectedInputBoxExecutions, "Expected INPUT BOX VALIDATION MESSAGES to be exactly equal");
    assert.deepStrictEqual(this.inputBoxResponses.slice(this.inputBoxExecutions.length), [], "Unused inputBoxResponses");
  }

  cleanup(): void { }
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

  const { validateInput, ...relevantOptions } = options;
  return {
    ...relevantOptions,
    validateInputProvided: validateInput !== undefined,
  };
}
