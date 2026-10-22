import { fireEvent, render, waitFor } from "@testing-library/react";
import * as React from "react";

import { StatBlock } from "../../common/StatBlock";
import { addCombatantFromStatBlock } from "../test/addCombatant";
import { buildEncounter } from "../test/buildEncounter";
import { InitializeTestSettings } from "../test/InitializeTestSettings";
import { PendingPrompts } from "./PendingPrompts";
import { TagModel, TagPrompt } from "./TagPrompt";

describe("TagPrompt", () => {
  beforeEach(() => InitializeTestSettings());

  function buildActivePrompt() {
    const encounter = buildEncounter();
    const ogre = addCombatantFromStatBlock(encounter, {
      ...StatBlock.Default(),
      Name: "Ogre"
    });
    const goblin = addCombatantFromStatBlock(encounter, {
      ...StatBlock.Default(),
      Name: "Goblin"
    });
    ogre.Initiative(20);
    goblin.Initiative(10);
    encounter.EncounterFlow.StartEncounter();
    const prompt = TagPrompt(encounter, [ogre], jest.fn());
    const removePrompt = jest.fn();
    const view = render(
      <PendingPrompts
        promptsAndIds={[[prompt, "tag-prompt"]]}
        removePrompt={removePrompt}
      />
    );
    return { encounter, goblin, ogre, prompt, removePrompt, view };
  }

  function getFormControl<T extends HTMLElement>(
    container: HTMLElement,
    name: string
  ): T {
    const control = container.querySelector(`[name="${name}"]`);
    if (!control) {
      throw new Error(`Could not find form control named "${name}"`);
    }
    return control as T;
  }

  test("opens with Timer enabled and Save disabled", async () => {
    const { view } = buildActivePrompt();

    expect(view.queryByTestId("tag-timer-toggle")).toBeNull();
    const automationButton = view.getByTestId("tag-automation-toggle");
    expect(automationButton.classList).toContain("add-tag__automation-button");
    fireEvent.mouseEnter(automationButton);
    expect(await view.findByText("Timer and Saves")).toBeTruthy();
    fireEvent.click(automationButton);

    const timerCheckbox = view.getByTestId(
      "tag-timer-toggle"
    ) as HTMLInputElement;
    const saveCheckbox = view.getByTestId(
      "tag-save-toggle"
    ) as HTMLInputElement;
    expect(timerCheckbox.closest("label").textContent).toBe("");
    expect(saveCheckbox.closest("label").textContent).toBe("");
    expect(timerCheckbox.checked).toBe(true);
    expect(timerCheckbox.nextElementSibling.classList).toContain(
      "fa-check-square"
    );
    expect(saveCheckbox.checked).toBe(false);
    expect(saveCheckbox.nextElementSibling.classList).toContain("fa-square");

    expect(
      getFormControl<HTMLSelectElement>(view.container, "saveAbility").disabled
    ).toBe(true);
    expect(
      getFormControl<HTMLSelectElement>(view.container, "saveAbility").value
    ).toBe("Str");
    expect(
      getFormControl<HTMLInputElement>(view.container, "saveDC").disabled
    ).toBe(true);
    expect(
      getFormControl<HTMLInputElement>(view.container, "saveDC").value
    ).toBe("10");
    expect(
      getFormControl<HTMLSelectElement>(view.container, "saveTimingCombatantId")
        .disabled
    ).toBe(true);
    expect(
      (view.getByRole("button", { name: "end" }) as HTMLButtonElement).disabled
    ).toBe(true);
    expect(view.getByRole("button", { name: "start of" })).toBeTruthy();
    expect(
      saveCheckbox.closest(".add-tag__automation-row").classList
    ).toContain("is-disabled");
    expect(saveCheckbox.disabled).toBe(false);

    fireEvent.click(saveCheckbox);
    await waitFor(() => expect(saveCheckbox.checked).toBe(true));
    expect(saveCheckbox.nextElementSibling.classList).toContain(
      "fa-check-square"
    );
  });

  test("clarifies tag automation controls with tooltips", async () => {
    const { view } = buildActivePrompt();
    const expectTooltip = async (element: Element, text: string) => {
      fireEvent.mouseEnter(element);
      expect(await view.findByText(text)).toBeTruthy();
      fireEvent.mouseLeave(element);
    };

    const hideButton = view.getByTestId("tag-visibility-toggle");
    await expectTooltip(hideButton, "Hide tag from Player View");
    fireEvent.click(hideButton);
    await expectTooltip(
      view.getByTestId("tag-visibility-toggle"),
      "Show tag in Player View"
    );
    const submitButton = view.container.querySelector(
      'form.prompt button[type="submit"]'
    ) as HTMLButtonElement;
    await expectTooltip(submitButton, "Add tag");

    fireEvent.click(view.getByTestId("tag-automation-toggle"));
    const timerCheckbox = view.getByTestId(
      "tag-timer-toggle"
    ) as HTMLInputElement;
    const saveCheckbox = view.getByTestId(
      "tag-save-toggle"
    ) as HTMLInputElement;
    await expectTooltip(timerCheckbox.closest("label"), "Disable timer");
    await expectTooltip(
      view.getByRole("button", { name: "start of" }),
      "Timer expires at start of selected combatant's turn"
    );
    await expectTooltip(
      getFormControl<HTMLSelectElement>(view.container, "tagTimingId").closest(
        ".add-tag__control-tooltip"
      ),
      "Choose whose turn advances the timer"
    );
    await expectTooltip(
      getFormControl<HTMLInputElement>(view.container, "tagDuration").closest(
        ".add-tag__control-tooltip"
      ),
      "Rounds until the tag expires"
    );
    await expectTooltip(saveCheckbox.closest("label"), "Enable saving throw");

    fireEvent.click(saveCheckbox);
    await expectTooltip(
      getFormControl<HTMLSelectElement>(view.container, "saveAbility").closest(
        ".add-tag__control-tooltip"
      ),
      "Ability used for the saving throw"
    );
    await expectTooltip(
      getFormControl<HTMLInputElement>(view.container, "saveDC").closest(
        ".add-tag__control-tooltip"
      ),
      "Minimum save total needed to remove the tag"
    );
    await expectTooltip(
      view.getByRole("button", { name: "end" }),
      "Prompt the save at end of selected combatant's turn"
    );
    await expectTooltip(
      getFormControl<HTMLSelectElement>(
        view.container,
        "saveTimingCombatantId"
      ).closest(".add-tag__control-tooltip"),
      "Choose whose turn triggers the saving throw"
    );
  });

  test("shows wrapper tooltips when their child control receives focus", async () => {
    const { view } = buildActivePrompt();
    fireEvent.click(view.getByTestId("tag-automation-toggle"));

    fireEvent.focus(view.getByTestId("tag-timer-toggle"));
    expect(await view.findByText("Disable timer")).toBeTruthy();

    fireEvent.focus(
      getFormControl<HTMLSelectElement>(view.container, "tagTimingId")
    );
    expect(
      await view.findByText("Choose whose turn advances the timer")
    ).toBeTruthy();
  });

  test("defaults save timing to the tagged combatant", () => {
    const { encounter, goblin } = buildActivePrompt();
    const prompt = TagPrompt(encounter, [goblin], jest.fn());

    expect(prompt.initialValues.saveTimingCombatantId).toBe(goblin.Id);
    expect(prompt.initialValues.saveTimingCombatantId).not.toBe(
      encounter.EncounterFlow.ActiveCombatant().Id
    );
  });

  test("submitting without opening automation creates a plain tag", () => {
    const { ogre, prompt } = buildActivePrompt();

    expect(prompt.onSubmit({ ...prompt.initialValues, tagText: "Prone" })).toBe(
      true
    );

    expect(ogre.Tags()).toHaveLength(1);
    expect(ogre.Tags()[0].HasDuration).toBe(false);
    expect(ogre.Tags()[0].HasSave).toBe(false);
  });

  test("creates a save-only tag with end-of-turn defaults", async () => {
    const { encounter, ogre, view } = buildActivePrompt();
    fireEvent.change(view.container.querySelector("input[name='tagText']"), {
      target: { value: "Restrained" }
    });
    fireEvent.click(view.getByTestId("tag-automation-toggle"));
    fireEvent.click(view.getByTestId("tag-timer-toggle"));
    fireEvent.click(view.getByTestId("tag-save-toggle"));
    fireEvent.change(
      getFormControl<HTMLSelectElement>(view.container, "saveAbility"),
      {
        target: { value: "Dex" }
      }
    );
    fireEvent.change(
      getFormControl<HTMLInputElement>(view.container, "saveDC"),
      {
        target: { value: "14" }
      }
    );
    fireEvent.submit(view.container.querySelector("form.prompt"));

    await waitFor(() => expect(ogre.Tags()).toHaveLength(1));
    const tag = ogre.Tags()[0];
    expect(tag.HasDuration).toBe(false);
    expect(tag.Save).toEqual({
      Ability: "Dex",
      DC: 14,
      Timing: "EndOfTurn",
      CombatantId: encounter.EncounterFlow.ActiveCombatant().Id
    });
  });

  test("closing automation disables timer and save before submission", async () => {
    const { ogre, view } = buildActivePrompt();
    const automationButton = view.getByTestId("tag-automation-toggle");
    fireEvent.click(automationButton);
    fireEvent.click(view.getByTestId("tag-save-toggle"));
    fireEvent.change(
      getFormControl<HTMLSelectElement>(view.container, "saveAbility"),
      {
        target: { value: "Wis" }
      }
    );
    fireEvent.change(
      getFormControl<HTMLInputElement>(view.container, "saveDC"),
      {
        target: { value: "16" }
      }
    );

    fireEvent.click(automationButton);
    fireEvent.change(view.container.querySelector("input[name='tagText']"), {
      target: { value: "Frightened" }
    });
    fireEvent.submit(view.container.querySelector("form.prompt"));

    await waitFor(() => expect(ogre.Tags()).toHaveLength(1));
    expect(ogre.Tags()[0].HasDuration).toBe(false);
    expect(ogre.Tags()[0].HasSave).toBe(false);
  });

  test("keeps the timer grace round independent from the save", () => {
    const { encounter, ogre, prompt } = buildActivePrompt();

    expect(
      prompt.onSubmit({
        ...prompt.initialValues,
        tagText: "Slowed",
        useDuration: true,
        tagDuration: 1,
        tagTiming: "EndOfTurn",
        tagTimingId: encounter.EncounterFlow.ActiveCombatant().Id,
        useSave: true,
        saveAbility: "Con",
        saveDC: 13
      })
    ).toBe(true);

    const tag = ogre.Tags()[0];
    expect(tag.DurationRemaining()).toBe(2);
    expect(tag.Save).toMatchObject({
      Ability: "Con",
      DC: 13,
      Timing: "EndOfTurn"
    });
  });

  test("creates independent save tags for every target", async () => {
    const { encounter, goblin, ogre } = buildActivePrompt();
    const prompt = TagPrompt(encounter, [ogre, goblin], jest.fn());

    expect(
      prompt.onSubmit({
        ...prompt.initialValues,
        tagText: "Frightened",
        useSave: true,
        saveAbility: "Wis",
        saveDC: 15
      })
    ).toBe(true);

    expect(ogre.Tags()[0]).not.toBe(goblin.Tags()[0]);
    const result = await encounter.EncounterFlow.NextTurn(jest.fn());
    expect(result.SaveTriggers.map(trigger => trigger.Tag)).toEqual([
      ogre.Tags()[0],
      goblin.Tags()[0]
    ]);
  });

  test("ignores automation while the encounter is inactive", () => {
    const encounter = buildEncounter();
    const ogre = addCombatantFromStatBlock(encounter, {
      ...StatBlock.Default(),
      Name: "Ogre"
    });
    const prompt = TagPrompt(encounter, [ogre], jest.fn());

    expect(
      prompt.onSubmit({
        ...prompt.initialValues,
        tagText: "Restrained",
        useDuration: true,
        tagDuration: 1,
        tagTiming: "EndOfTurn",
        tagTimingId: ogre.Id,
        useSave: true,
        saveAbility: "Dex",
        saveDC: 14,
        saveTiming: "EndOfTurn",
        saveTimingCombatantId: ogre.Id
      })
    ).toBe(true);

    expect(ogre.Tags()[0].HasDuration).toBe(false);
    expect(ogre.Tags()[0].HasSave).toBe(false);
  });

  test.each([
    ["missing ability", { saveAbility: "" }],
    ["blank DC", { saveDC: "" }],
    ["zero DC", { saveDC: 0 }],
    ["negative DC", { saveDC: -1 }],
    ["fractional DC", { saveDC: 12.5 }],
    ["nonnumeric DC", { saveDC: "not-a-number" as any }],
    ["missing timing combatant", { saveTimingCombatantId: "missing" }]
  ])("rejects %s", (_name, invalidValues: Partial<TagModel>) => {
    const { ogre, prompt } = buildActivePrompt();
    const model: TagModel = {
      ...prompt.initialValues,
      tagText: "Restrained",
      useSave: true,
      saveAbility: "Dex",
      saveDC: 14,
      ...invalidValues
    };

    expect(prompt.onSubmit(model)).toBe(false);
    expect(ogre.Tags()).toHaveLength(0);
  });
});
