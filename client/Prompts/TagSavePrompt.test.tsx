import {
  fireEvent,
  render,
  RenderResult,
  waitFor
} from "@testing-library/react";
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
    const prompt = TagSavePrompt(tag, trigger);
    const removePrompt = jest.fn();
    const view = render(
      <PendingPrompts
        promptsAndIds={[[prompt, "prompt-id"]]}
        removePrompt={removePrompt}
      />
    );
    return { combatant, tag, prompt, removePrompt, view };
  }

  function getRollText(view: RenderResult): string {
    const result = view.container.querySelector(".p-tag-save__result");
    return Array.from(result.children)
      .filter(element => !element.classList.contains("screen-reader-only"))
      .map(element => element.textContent.trim())
      .filter(Boolean)
      .join(" ");
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

  test("Roll identifies an explicit positive save modifier and succeeds at exact DC", async () => {
    const { view, tag } = buildPrompt({ explicitModifier: 1, dc: 14 });
    const random = jest.spyOn(Math, "random").mockReturnValue(13 / 20);

    fireEvent.click(view.getByRole("button", { name: /Roll/ }));

    const result = view.container.querySelector(".p-tag-save__result");
    expect(result.querySelector(".fa-dice-d20")).toBeTruthy();
    expect(getRollText(view)).toContain("13 + (DEX) 1 = 14");
    expect(view.getByText("Save succeeds")).toBeTruthy();
    expect(view.queryByText("*")).toBeNull();
    fireEvent.mouseEnter(view.getByText("(DEX)"));
    expect(await view.findByText("DEX save +1")).toBeTruthy();
    expect(tag.IsActive()).toBe(true);
    expect(random).toHaveBeenCalledTimes(1);
    random.mockRestore();
  });

  test("Roll identifies a raw ability modifier fallback and displays failure", async () => {
    const { view } = buildPrompt({ abilityScore: 12, dc: 14 });
    const random = jest.spyOn(Math, "random").mockReturnValue(10 / 20);

    fireEvent.click(view.getByRole("button", { name: /Roll/ }));

    expect(getRollText(view)).toContain("10 + (DEX) 1 = 11");
    expect(view.queryByText("*")).toBeNull();
    expect(view.getByText("Save fails")).toBeTruthy();
    fireEvent.focus(view.getByText("(DEX)"));
    expect(
      await view.findByText(
        "No DEX save, using straight DEX modifier"
      )
    ).toBeTruthy();
    random.mockRestore();
  });

  test("formats zero and negative modifiers with the correct operator", async () => {
    const zero = buildPrompt({ explicitModifier: 0 });
    const random = jest.spyOn(Math, "random").mockReturnValue(10 / 20);
    fireEvent.click(zero.view.getByRole("button", { name: /Roll/ }));
    expect(getRollText(zero.view)).toContain("10 + (DEX) 0 = 10");
    zero.view.unmount();
    random.mockRestore();

    const negative = buildPrompt({ explicitModifier: -2 });
    const negativeRandom = jest.spyOn(Math, "random").mockReturnValue(10 / 20);
    fireEvent.click(negative.view.getByRole("button", { name: /Roll/ }));
    expect(getRollText(negative.view)).toContain("10 - (DEX) 2 = 8");
    fireEvent.mouseEnter(negative.view.getByText("(DEX)"));
    expect(await negative.view.findByText("DEX save -2")).toBeTruthy();
    negativeRandom.mockRestore();
  });

  test("uses the current combatant alias", () => {
    const { view } = buildPrompt({ alias: "The Brute" });

    expect(
      view.getByText("The Brute: make a DEX save DC 14 to stop Restrained")
    ).toBeTruthy();
  });

  test("natural 1 and 20 have no special result rules", () => {
    const naturalOne = buildPrompt({ explicitModifier: 0, dc: 1 });
    const random = jest.spyOn(Math, "random").mockReturnValue(1 / 20);
    fireEvent.click(naturalOne.view.getByRole("button", { name: /Roll/ }));
    expect(naturalOne.view.getByText("Save succeeds")).toBeTruthy();
    naturalOne.view.unmount();
    random.mockRestore();

    const naturalTwenty = buildPrompt({ explicitModifier: -20, dc: 1 });
    const naturalTwentyRandom = jest.spyOn(Math, "random").mockReturnValue(1);
    fireEvent.click(naturalTwenty.view.getByRole("button", { name: /Roll/ }));
    expect(naturalTwenty.view.getByText("Save fails")).toBeTruthy();
    naturalTwentyRandom.mockRestore();
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
