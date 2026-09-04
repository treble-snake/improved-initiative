import { fireEvent, render } from "@testing-library/react";
import * as React from "react";

import { DiceRoll, RollMode, RollModes } from "../../../Rules/Dice";
import { RollResultComponent } from "./RollResults";

function CreateDiceRoll(
  results: number[],
  modifier: number,
  dieSize: number,
  mode?: RollMode
): DiceRoll {
  const random = jest.spyOn(Math, "random");
  results.forEach(result =>
    random.mockReturnValueOnce((result - 0.5) / dieSize)
  );
  return new DiceRoll(
    mode === undefined ? results.length : 1,
    dieSize,
    modifier,
    mode
  );
}

function RenderRollResult(result: DiceRoll, handleRoll = jest.fn()) {
  return {
    ...render(
      <RollResultComponent initialRoll={result} handleRoll={handleRoll} />
    ),
    handleRoll
  };
}

function ReadRolls(container: HTMLElement): string[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(".p-roll-dice-result__roll")
  ).map(roll => roll.textContent || "");
}

describe("RollResultComponent", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test.each([
    {
      description: "one die without a modifier",
      results: [13],
      modifier: 0,
      dieSize: 20,
      expression: "Rolled 1d20",
      calculation: "= 13",
      total: "13"
    },
    {
      description: "several dice without a modifier",
      results: [2, 5],
      modifier: 0,
      dieSize: 6,
      expression: "Rolled 2d6",
      calculation: "= 7",
      total: "7"
    },
    {
      description: "one die with a positive modifier",
      results: [4],
      modifier: 2,
      dieSize: 8,
      expression: "Rolled 1d8 + 2",
      calculation: "+ 2 = 6",
      total: "6"
    },
    {
      description: "several dice with a negative modifier",
      results: [3, 8, 9],
      modifier: -4,
      dieSize: 10,
      expression: "Rolled 3d10 - 4",
      calculation: "- 4 = 16",
      total: "16"
    }
  ])(
    "renders $description",
    ({ results, modifier, dieSize, expression, calculation, total }) => {
      const result = CreateDiceRoll(results, modifier, dieSize);
      const rendered = RenderRollResult(result);

      expect(rendered.getByText(expression)).toBeTruthy();
      expect(rendered.getByText(calculation)).toBeTruthy();
      expect(
        rendered.container.querySelector(".p-roll-dice-result__total")!
          .textContent
      ).toBe(total);
      expect(ReadRolls(rendered.container)).toEqual(
        result.Results.map(value => value.toString())
      );
    }
  );

  test.each([
    {
      mode: RollModes.Advantage,
      buttonName: "Add advantage",
      addedRoll: 17,
      expectedTotal: "19",
      expectedKeptIndex: 1
    },
    {
      mode: RollModes.Disadvantage,
      buttonName: "Add disadvantage",
      addedRoll: 3,
      expectedTotal: "5",
      expectedKeptIndex: 1
    }
  ])(
    "adds $mode to a single d20 roll",
    ({ mode, buttonName, addedRoll, expectedTotal, expectedKeptIndex }) => {
      const random = jest
        .spyOn(Math, "random")
        .mockReturnValueOnce((8 - 0.5) / 20)
        .mockReturnValueOnce((addedRoll - 0.5) / 20);
      const rendered = RenderRollResult(new DiceRoll(1, 20, 2));

      fireEvent.click(rendered.getByRole("button", { name: buttonName }));

      const updatedRoll = rendered.handleRoll.mock.calls[0][0] as DiceRoll;
      const chips = Array.from(
        rendered.container.querySelectorAll<HTMLElement>(
          ".p-roll-dice-result__roll"
        )
      );
      expect(updatedRoll.Mode).toBe(mode);
      expect(updatedRoll.Results).toEqual([8, addedRoll]);
      expect(rendered.getByText(`Rolled 1d20 + 2 with ${mode}`)).toBeTruthy();
      expect(
        rendered.container
          .querySelector(".p-roll-dice-result")!
          .classList.contains("p-roll-dice-result--advantage")
      ).toBe(mode === RollModes.Advantage);
      expect(
        rendered.container.querySelector(".p-roll-dice-result__total")!
          .textContent
      ).toBe(expectedTotal);
      expect(chips[expectedKeptIndex].classList).toContain(
        "p-roll-dice-result__roll--kept"
      );
      expect(chips[1 - expectedKeptIndex].classList).toContain(
        "p-roll-dice-result__roll--discarded"
      );
      expect(
        rendered.queryByRole("button", { name: "Add advantage" })
      ).toBeNull();
      expect(
        rendered.queryByRole("button", { name: "Add disadvantage" })
      ).toBeNull();
      expect(random).toHaveBeenCalledTimes(2);
    }
  );

  test.each([
    { diceCount: 2, dieSize: 20 },
    { diceCount: 1, dieSize: 6 }
  ])(
    "does not offer roll modes for $diceCount d$dieSize",
    ({ diceCount, dieSize }) => {
      jest.spyOn(Math, "random").mockReturnValue(0);
      const rendered = RenderRollResult(new DiceRoll(diceCount, dieSize, 0));

      expect(
        rendered.queryByRole("button", { name: "Add advantage" })
      ).toBeNull();
      expect(
        rendered.queryByRole("button", { name: "Add disadvantage" })
      ).toBeNull();
    }
  );

  test("rerolls both dice in the selected mode", () => {
    const random = jest
      .spyOn(Math, "random")
      .mockReturnValueOnce((4 - 0.5) / 20)
      .mockReturnValueOnce((18 - 0.5) / 20)
      .mockReturnValueOnce((12 - 0.5) / 20)
      .mockReturnValueOnce((7 - 0.5) / 20);
    const rendered = RenderRollResult(
      new DiceRoll(1, 20, -1, RollModes.Advantage)
    );

    fireEvent.click(
      rendered.getByRole("button", { name: "Reroll with advantage" })
    );

    const updatedRoll = rendered.handleRoll.mock.calls[0][0] as DiceRoll;
    expect(updatedRoll.Results).toEqual([12, 7]);
    expect(updatedRoll.Total).toBe(11);
    expect(updatedRoll.Mode).toBe(RollModes.Advantage);
    expect(ReadRolls(rendered.container)).toEqual(["12", "7"]);
    expect(random).toHaveBeenCalledTimes(4);
  });
});
