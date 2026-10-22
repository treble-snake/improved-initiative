import { StatBlock } from "../../common/StatBlock";
import { DefaultRules } from "../Rules/Rules";
import { GetSavingThrowModifier } from "./GetSavingThrowModifier";

describe("GetSavingThrowModifier", () => {
  const rules = new DefaultRules();

  test.each(["Dex", "DEX", "  Dexterity  "])(
    "uses an explicit %s saving throw",
    name => {
      const statBlock = {
        ...StatBlock.Default(),
        Saves: [{ Name: name, Modifier: 3 }]
      };

      expect(GetSavingThrowModifier(statBlock, "Dex", rules)).toEqual({
        Modifier: 3,
        IsAbilityModifierFallback: false
      });
    }
  );

  test("treats an explicit zero as a specified save", () => {
    const statBlock = {
      ...StatBlock.Default(),
      Saves: [{ Name: "Wis", Modifier: 0 }]
    };

    expect(GetSavingThrowModifier(statBlock, "Wis", rules)).toMatchObject({
      Modifier: 0,
      IsAbilityModifierFallback: false
    });
  });

  test.each([
    [18, 4],
    [10, 0],
    [8, -1]
  ])("falls back from a %i score to a %i modifier", (score, modifier) => {
    const statBlock = StatBlock.Default();
    statBlock.Abilities.Str = score;

    expect(GetSavingThrowModifier(statBlock, "Str", rules)).toEqual({
      Modifier: modifier,
      IsAbilityModifierFallback: true
    });
  });

  test("does not mutate the statblock", () => {
    const statBlock = StatBlock.Default();
    const before = JSON.stringify(statBlock);

    GetSavingThrowModifier(statBlock, "Cha", rules);

    expect(JSON.stringify(statBlock)).toBe(before);
  });
});
