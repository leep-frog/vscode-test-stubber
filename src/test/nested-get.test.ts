import * as assert from "assert";

interface TestCase {
  name: string;
};

const testCases: TestCase[] = [
  {
    name: "one",
  },
];

suite('nestedGet tests', () => {
  testCases.forEach(tc => {
    test(tc.name, () => {
      assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    });
  });
});
