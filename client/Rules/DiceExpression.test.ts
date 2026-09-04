import { RollModes } from "./Dice";
import {
  GlobalDicePattern,
  isValidDiceExpression,
  rollExpression,
  toExpression
} from "./DiceExpression";

describe("rollExpression", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test.each([
    {
      description: "one die without a modifier",
      expression: "1d20",
      results: [1],
      modifier: 0,
      dieSize: 20,
      total: 1
    },
    {
      description: "several dice with a positive modifier",
      expression: "3d6 + 2",
      results: [1, 1, 1],
      modifier: 2,
      dieSize: 6,
      total: 5
    },
    {
      description: "several dice with a negative modifier",
      expression: "2d8 - 3",
      results: [1, 1],
      modifier: -3,
      dieSize: 8,
      total: -1
    },
    {
      description: "a loose positive modifier",
      expression: "+5",
      results: [1],
      modifier: 5,
      dieSize: 20,
      total: 6
    },
    {
      description: "a loose negative modifier with whitespace",
      expression: "- 4",
      results: [1],
      modifier: -4,
      dieSize: 20,
      total: -3
    }
  ])(
    "rolls $description",
    ({ expression, results, modifier, dieSize, total }) => {
      jest.spyOn(Math, "random").mockReturnValue(0);

      const roll = rollExpression(expression);

      expect(roll.Results).toEqual(results);
      expect(roll.Modifier).toBe(modifier);
      expect(roll.DieSize).toBe(dieSize);
      expect(roll.Mode).toBeUndefined();
      expect(roll.Total).toBe(total);
    }
  );

  test.each([
    {
      mode: RollModes.Advantage,
      expression: "adv:8d6 + 5",
      total: 25
    },
    {
      mode: RollModes.Disadvantage,
      expression: "dis:2d100 - 4",
      total: -3
    }
  ])(
    "overrides the dice with two d20s for $mode",
    ({ mode, expression, total }) => {
      jest
        .spyOn(Math, "random")
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(0.999999);

      const roll = rollExpression(expression);

      expect(roll.Results).toEqual([1, 20]);
      expect(roll.DiceCount).toBe(1);
      expect(roll.DieSize).toBe(20);
      expect(roll.Mode).toBe(mode);
      expect(roll.Total).toBe(total);
    }
  );

  test("uses a loose modifier when rolling in a mode", () => {
    jest.spyOn(Math, "random").mockReturnValue(0);

    const roll = rollExpression("adv:+5");

    expect(roll.Results).toEqual([1, 1]);
    expect(roll.Modifier).toBe(5);
    expect(roll.DieSize).toBe(20);
    expect(roll.Mode).toBe(RollModes.Advantage);
  });

  test("rejects an invalid expression without rolling", () => {
    jest.spyOn(Math, "random");

    expect(() => rollExpression("not dice")).toThrow();
    expect(Math.random).not.toHaveBeenCalled();
  });
});

describe("isValidDiceExpression", () => {
  test.each(["1d20", "2d6 + 3", "+5", "adv:1d20", "dis:1d20 - 2"])(
    "accepts %s",
    expression => {
      expect(isValidDiceExpression(expression)).toBe(true);
    }
  );

  test.each(["", "df", "adv:not dice"])("rejects %s", expression => {
    expect(isValidDiceExpression(expression)).toBe(false);
  });
});

describe("toExpression", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test.each([
    {
      expression: " 1d20 + 5 ",
      expected: "1d20+5"
    },
    {
      expression: "adv:8d6 + 5",
      expected: "adv:1d20+5"
    },
    {
      expression: "dis:2d100 - 4",
      expected: "dis:1d20-4"
    }
  ])("normalizes $expression", ({ expression, expected }) => {
    jest.spyOn(Math, "random").mockReturnValue(0);

    expect(toExpression(rollExpression(expression))).toBe(expected);
  });
});

describe("GlobalDicePattern", () => {
  test("finds dice expressions and loose modifiers in text", () => {
    expect("Hit +7; damage 2d6 + 3 and - 2".match(GlobalDicePattern)).toEqual([
      "+7",
      "2d6 + 3",
      "- 2"
    ]);
  });
});
