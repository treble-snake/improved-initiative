import { fireEvent, render } from "@testing-library/react";
import * as React from "react";
import { TagSaveState } from "../../common/CombatantState";
import { StatBlock } from "../../common/StatBlock";
import { TextEnricher, TextEnricherContext } from "../TextEnricher/TextEnricher";
import { addCombatantFromStatBlock } from "../test/addCombatant";
import { buildEncounter } from "../test/buildEncounter";
import { InitializeTestSettings } from "../test/InitializeTestSettings";
import { CombatantDetails, FormatTagDetails } from "./CombatantDetails";
import { CombatantViewModel } from "./CombatantViewModel";
import { Tag } from "./Tag";

describe("FormatTagDetails", () => {
  beforeEach(() => InitializeTestSettings());

  const save: TagSaveState = {
    Ability: "Con",
    DC: 12,
    Timing: "EndOfTurn",
    CombatantId: "timing-combatant"
  };
  const cases: [string, number, TagSaveState | undefined, string][] = [
    ["plain", -1, undefined, "Poisoned"],
    ["timer", 8, undefined, "Poisoned (8 more rounds)"],
    ["save", -1, save, "Poisoned (CON save DC 12)"],
    ["timer and save", 8, save, "Poisoned (8 more rounds, CON save DC 12)"]
  ];

  function buildTag(duration: number, tagSave?: TagSaveState) {
    const encounter = buildEncounter();
    const combatant = addCombatantFromStatBlock(encounter);
    return new Tag(
      "Poisoned",
      combatant,
      false,
      duration,
      "StartOfTurn",
      duration >= 0 ? combatant.Id : "",
      tagSave
    );
  }

  test.each(cases)("formats a %s tag", (_name, duration, tagSave, expected) => {
    const tag = buildTag(duration, tagSave);
    expect(FormatTagDetails(tag, tag.DurationRemaining())).toBe(expected);
  });

  function renderSaveTag(options?: {
    duration?: number;
    explicitModifier?: number;
    wisdomScore?: number;
  }) {
    const encounter = buildEncounter();
    const statBlock = StatBlock.Default();
    statBlock.Name = "Ogre";
    statBlock.Abilities.Wis = options?.wisdomScore ?? 10;
    if (options?.explicitModifier !== undefined) {
      statBlock.Saves = [
        { Name: "Wis", Modifier: options.explicitModifier }
      ];
    }
    const combatant = addCombatantFromStatBlock(encounter, statBlock);
    const duration = options?.duration ?? -1;
    combatant.Tags.push(
      new Tag(
        "Charmed",
        combatant,
        false,
        duration,
        "StartOfTurn",
        duration >= 0 ? combatant.Id : "",
        {
          Ability: "Wis",
          DC: 14,
          Timing: "EndOfTurn",
          CombatantId: combatant.Id
        }
      )
    );
    const rollDice = jest.fn();
    const textEnricher = new TextEnricher(
      rollDice,
      jest.fn(),
      jest.fn(),
      () => [],
      () => new RegExp("a^"),
      encounter.Rules
    );
    const combatantViewModel = new CombatantViewModel(
      combatant,
      null,
      jest.fn(),
      jest.fn()
    );
    const view = render(
      <TextEnricherContext.Provider value={textEnricher}>
        <CombatantDetails
          combatantViewModel={combatantViewModel}
          displayMode="status-only"
          key={combatant.Id}
        />
      </TextEnricherContext.Provider>
    );
    return { combatant, rollDice, view };
  }

  test("rolls an explicit save when its save word is clicked", async () => {
    const { combatant, rollDice, view } = renderSaveTag({
      duration: 5,
      explicitModifier: 5
    });

    expect(view.container.textContent).toContain(
      "Charmed (5 more rounds, WIS save DC 14)"
    );
    const saveButton = view.getByRole("button", { name: "Roll WIS save" });
    expect(saveButton.classList).toContain("rollable");
    fireEvent.mouseEnter(saveButton);
    expect(
      await view.findByText(
        "Roll WIS save (will not remove the tag automatically)"
      )
    ).toBeTruthy();
    fireEvent.click(saveButton);

    expect(rollDice).toHaveBeenCalledWith("+5");
    expect(combatant.ActiveTags()).toHaveLength(1);
  });

  test("keyboard-rolls a negative raw modifier when no save is defined", () => {
    const { rollDice, view } = renderSaveTag({ wisdomScore: 8 });

    fireEvent.keyDown(view.getByRole("button", { name: "Roll WIS save" }), {
      key: " "
    });

    expect(rollDice).toHaveBeenCalledWith("-1");
  });
});
