# VS Code Test Stubber

The [VS Code Test CLI](https://github.com/microsoft/vscode-test-cli) makes it possible
to run tests against your VS Code extension. However, it can be tricky to set up
or verify interactions with the VS Code API (e.g. validating configuration changes,
mimicing user interactions with prompts, etc.).

This package aims to solve that problem by stubbing out a subset of elements
of the VS Code API and exposing a `UserInteraction` type that allows you to
mimic user interactions in your test (e.g. selecting an item from a prompt).

## Test Case

All of the VS Code capabilites covered and mocked by this package are listed in the below sections. The
best way to use this package is to define a list of `TestCase` objects to run in
your test file and then set the appropriate fields in `SimpleTestCaseProps` as needed:

```typescript
import {
  SimpleTestCase,
  SimpleTestCaseProps,
  UserInteraction,
  cmd,
} from "@leep-frog/vscode-test-stubber";

interface TestCase extends SimpleTestCaseProps {
  name: string;
}

const testCases: TestCase[] = [
  {
    name: "Does something",
    // Starting editor text
    text: [""],
    // User interactions to run
    userInteractions: [
      cmd("myExtension.typeHello"),
      // ...
    ],
    // Expected editor text
    expectedText: ["hello"],
    // etc.
  },
];

suite("My Extension Test Suite", () => {
  testCases.forEach((tc) => {
    test(tc.name, async () => {
      await new SimpleTestCase(tc.stc).runTest();
    });
  });
});
```

## Stubbed VS Code Components

The below sections enumerate the components of the VS Code API that are stubbed
by this package and how to properly interact with and test them via `SimpleTestCaseProps`.

### Text Editor

To set up your editor at the start of the test, use any of the following `SimpleTestCaseProps`:

- `text`: If provided, starts the test with an untitled editor with the provided text (joined with newline characters)
- `file`: If provided, starts the test with an editor for the file referenced by this file path
- `selections`: If provided, the set of cursor selections that will be configured at the start of the test

> If neither `text` nor `file` are provided, then no text editor will be opened.

To verify elements of the active text editor at the end of your test, use the following `SimpleTestCaseProps` fields:

- `expectedText`: The expected text contents (joined by newline characters) of the active text editor (or undefined if no editor is expected to be active or open).
- `expectedSelections`: The expected set of cursor selections at the end of the test.

### Notification Messages

Use the following fields in `SimpleTestCaseProps` to verify the notifications that
were sent during the test.

- `expectedInfoMessages`
- `expectedWarningMessages`
- `expectedErrorMessages`

### Input Boxes

Simply set the following fields in `SimpleTestCaseProps`:

- `inputBoxResponses`: The list of input box responses
  to return during your test execution. Note, the test will fail if there are any
  unused responses.
- `expectedInputBoxes`: The expected list of input box
  prompts and executions that were generated.

### Quick Pick

To configure interactions with a quick pick, use the following `UserInteraction`
objects in your test case:

- `SelectItemQuickPickAction`: Selects a set of items
- `SelectActiveItems`: Selects all currently active items
- `CloseQuickPickAction`: Closes the quick pick
- `PressItemButtonQuickPickAction`: Presses an item button
- `PressUnknownButtonQuickPickAction`: Presses an unknown item button

### Quick Pick

To configure interactions with a quick pick, use the following `UserInteraction`
objects in your test case:

- `SelectItemQuickPickAction`: Selects a set of items
- `SelectActiveItems`: Selects all currently active items
- `CloseQuickPickAction`: Closes the quick pick
- `PressItemButtonQuickPickAction`: Presses an item button
- `PressUnknownButtonQuickPickAction`: Presses an unknown item button

To verify the quick pick configurations that were created and executed during the
test, set the `expectedQuickPicks` field in `SimpleTestCaseProps`.

### Workspace Configuration

Simply set the following fields in `SimpleTestCaseProps`:

- `workspaceConfiguration`: The initial workspace configuration to start the test with.
- `expectedInputBoxes`: The expected workspace configuration at the end of the
  test (if undefined, then verify no changes).

## Additional UserInteractions

There are additional `UserInteractions` aside from the ones specific to a VS Code feature mentioned in earlier sections. See the below list for additional, useful `UserInteractions` that can be used in your tests.

They can be imported with the following statement:

```typescript
import { cmd, delay, Waiter } from "@leep-frog/vscode-test-stubber";
```

- `cmd(vscodeCommandName, ...args)`: This is simply a `UserInteraction` wrapper for VS Code command strings that
  are normally executed via `vscode.commands.executeCommand(cmd, ...args)`
- `Waiter(delayMs, doneFunc)`: This is a class that continually calls doneFunc (ever `delayMs`) until it returns true. This is super useful if your extension has async logic that can take a while.
- `delay(timeInMs)`: This simply waits for the specified amount of time (in case you need to wait for an async operation), although it's use is **not encouraged** (see `Waiter` for a better alternative)
