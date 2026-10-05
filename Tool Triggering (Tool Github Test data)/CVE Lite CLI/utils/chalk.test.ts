import { chalk, stripAnsi } from "../../src/utils/chalk.js";

describe("stripAnsi", () => {
  it("removes ANSI color sequences", () => {
    expect(stripAnsi("\x1b[31mred\x1b[0m")).toBe("red");
    expect(stripAnsi("\x1b[1m\x1b[36mx\x1b[0m")).toBe("x");
  });

  it("leaves text without ANSI sequences unchanged", () => {
    expect(stripAnsi("plain text")).toBe("plain text");
    expect(stripAnsi("")).toBe("");
  });
});

describe("chalk without terminal color support", () => {
  it("returns its input unchanged", () => {
    expect(chalk.red("hi")).toBe("hi");
    expect(chalk.bold("hi")).toBe("hi");
    expect(chalk.bold.cyan("hi")).toBe("hi");
  });
});
