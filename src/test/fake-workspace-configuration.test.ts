import assert from "assert";
import { FakeWorkspaceConfiguration } from "..";

suite("Error tests", () => {

  test("inspect throws an error", () => {
    const cfg = new FakeWorkspaceConfiguration();
    assert.throws(() => cfg.inspect("section"), new Error("FakeWorkspaceConfiguration.inspect is not yet supported"));

    const scopedCfg = cfg.scopedConfiguration([]);
    assert.throws(() => scopedCfg.inspect("section"), new Error("FakeScopedWorkspaceConfiguration.inspect is not yet supported"));
  });
});
