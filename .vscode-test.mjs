import { defineConfig } from '@vscode/test-cli';

export default defineConfig({
  files: 'out/test/**/*.test.js',
  // useInstallation: {
    // fromMachine: true,
    // This needs to be a different version than the one I'm actually using, otherwise test doesn't run
    // fromPath: path.resolve(".vscode-test", "vscode-win32-x64-archive-1.86.0", "Code.exe"),
  // },
  // workspaceFolder: path.resolve("src", "test", "test-workspace"),
  env: {
    VSCODE_STUBBABLE_TEST_FILE: `C:\\Users\\gleep\\Desktop\\Coding\\vs-code\\vscode-test-stubber\\.vscode-test\\stubbable-file.json`,
  },
  mocha: {
    timeout: 60000,
    // bail: true,
  },
});
