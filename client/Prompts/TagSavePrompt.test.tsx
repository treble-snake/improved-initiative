import { fireEvent, render, waitFor } from "@testing-library/react";
import * as React from "react";

import { StatBlock } from "../../common/StatBlock";
import { Tag } from "../Combatant/Tag";
import { addCombatantFromStatBlock } from "../test/addCombatant";
import { buildEncounter } from "../test/buildEncounter";
import { InitializeTestSettings } from "../test/InitializeTestSettings";
import { PendingPrompts } from "./PendingPrompts";
import { TagSavePrompt } from "./TagSavePrompt";

describe("TagSavePrompt", () => {
  beforeEach(() => InitializeTestSettings());

  function buildPrompt(options?: {
    explicitModifier?: number;
    abilityScore?: number;
    dc?: number;
    alias?: string;
  }) {
    const encounter = buildEncounter();
    const statBlock = StatBlock.Default();
    statBlock.Name = "Ogre";
    statBlock.Abilities.Dex = options?.abilityScore ?? 12;
    if (options?.explicitModifier !== undefined) {
      statBlock.Saves = [{ Name: "Dex", Modifier: options.explicitModifier }];
    }
    const combatant = addCombatantFromStatBlock(encounter, statBlock);
    combatant.Alias(options?.alias || "");
    const tag = new Tag("Restrained", combatant, false, -1, "StartOfTurn", "", {
      Ability: "Dex",
      DC: options?.dc ?? 14,
      Timing: "EndOfTurn",
      CombatantId: combatant.Id
    });
    combatant.Tags.push(tag);
    const trigger = tag.AdvanceSaveTrigger();
    const rollDice = jest.fn();
    const prompt = TagSavePrompt(tag, trigger, rollDice);
    const removePrompt = jest.fn();
    const view = render(
      <PendingPrompts
        promptsAndIds={[[prompt, "prompt-id"]]}
        removePrompt={removePrompt}
      />
    );
    return { combatant, tag, prompt, removePrompt, view, rollDice };
  }

  test("uses the combatant display name and does not roll on render", () => {
    const random = jest.spyOn(Math, "random");
    const { view, prompt, removePrompt } = buildPrompt();
    random.mockClear();
    view.rerender(
      <PendingPrompts
        promptsAndIds={[[prompt, "prompt-id"]]}
        removePrompt={removePrompt}
      />
    );

    expect(
      view.getByText("Ogre: make a DEX save DC 14 to stop Restrained")
    ).toBeTruthy();
    expect(view.queryByText(/ = /)).toBeNull();
    expect(random).not.toHaveBeenCalled();
    random.mockRestore();
  });

  test("does not focus any control when the prompt opens", async () => {
    const { view } = buildPrompt();

    await new Promise(resolve => setTimeout(resolve));

    expect(document.activeElement).toBe(document.body);
    expect(view.queryByRole("tooltip")).toBeNull();
  });

  test("clarifies the Roll, Success, and Fail actions", async () => {
    const { view } = buildPrompt();
    const tooltips = [
      ["Roll", "Roll DEX save (will not remove the tag automatically)"],
      ["Success", "Successful save: remove Restrained"],
      ["Fail", "Failed save: keep Restrained"]
    ];

    for (const [buttonName, tooltip] of tooltips) {
      fireEvent.mouseEnter(view.getByRole("button", { name: buttonName }));
      expect(await view.findByText(tooltip)).toBeTruthy();
    }
  });

  test.each([
    [{ explicitModifier: 5 }, "+5"],
    [{ explicitModifier: 0 }, "+0"],
    [{ explicitModifier: -2 }, "-2"],
    [{ abilityScore: 12 }, "+1"],
    [{ abilityScore: 8 }, "-1"]
  ])(
    "opens the regular roll with the current modifier: %j",
    (options, expression) => {
      const { view, tag, rollDice, removePrompt } = buildPrompt(options);

      expect(rollDice).not.toHaveBeenCalled();
      fireEvent.click(view.getByRole("button", { name: /Roll/ }));

      expect(rollDice).toHaveBeenCalledWith(expression);
      expect(view.container.querySelector(".p-tag-save__result")).toBeNull();
      expect(tag.IsActive()).toBe(true);
      expect(removePrompt).not.toHaveBeenCalled();
    }
  );

  test("uses the current combatant alias", () => {
    const { view } = buildPrompt({ alias: "The Brute" });

    expect(
      view.getByText("The Brute: make a DEX save DC 14 to stop Restrained")
    ).toBeTruthy();
  });

  test("Success works without rolling and inactivates only this tag", async () => {
    const { combatant, tag, view, removePrompt } = buildPrompt();
    const sameNamedTag = new Tag("Restrained", combatant, false);
    combatant.Tags.push(sameNamedTag);

    fireEvent.click(view.getByRole("button", { name: /Success/ }));

    await waitFor(() => expect(removePrompt).toHaveBeenCalledWith("prompt-id"));
    expect(tag.IsActive()).toBe(false);
    expect(sameNamedTag.IsActive()).toBe(true);
  });

  test("Fail works without rolling and leaves the tag active", async () => {
    const { tag, view, removePrompt } = buildPrompt();

    fireEvent.click(view.getByRole("button", { name: /Fail/ }));

    await waitFor(() => expect(removePrompt).toHaveBeenCalledWith("prompt-id"));
    expect(tag.IsActive()).toBe(true);
  });

  test("dismiss leaves the tag active and permits a later occurrence", () => {
    const { tag, prompt } = buildPrompt();

    prompt.onDismiss?.();

    expect(tag.IsActive()).toBe(true);
    expect(tag.AdvanceSaveTrigger()).toBe(2);
  });
});
