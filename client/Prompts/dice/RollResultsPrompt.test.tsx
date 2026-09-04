import { fireEvent, render } from "@testing-library/react";
import * as React from "react";

import { DiceRoll } from "../../Rules/Dice";
import { DiceRollResultPrompt } from "./RollResultsPrompt";

describe("DiceRollResultPrompt", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("creates a persistent result prompt focused on its close control", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);
    const prompt = DiceRollResultPrompt(new DiceRoll(1, 20, 2), jest.fn());
    const rendered = render(prompt.children as React.ReactElement);

    expect(prompt.className).toBe("prompt--dice-roll-result");
    expect(prompt.autoFocusSelector).toBe(".prompt__close");
    expect(prompt.initialValues).toEqual({});
    expect(prompt.onSubmit({})).toBe(false);
    expect(rendered.getByText("Rolled 1d20 + 2")).toBeTruthy();
  });

  test("forwards subsequent rolls to the supplied handler", () => {
    jest
      .spyOn(Math, "random")
      .mockReturnValueOnce((4 - 0.5) / 6)
      .mockReturnValueOnce((6 - 0.5) / 6);
    const handleRoll = jest.fn();
    const prompt = DiceRollResultPrompt(new DiceRoll(1, 6, 0), handleRoll);
    const rendered = render(prompt.children as React.ReactElement);

    fireEvent.click(rendered.getByRole("button", { name: "Reroll" }));

    expect((handleRoll.mock.calls[0][0] as DiceRoll).Results).toEqual([6]);
  });
});
