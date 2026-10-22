import { TagSaveState } from "../../common/CombatantState";
import { StatBlock } from "../../common/StatBlock";
import { addCombatantFromStatBlock } from "../test/addCombatant";
import { buildEncounter } from "../test/buildEncounter";
import { InitializeTestSettings } from "../test/InitializeTestSettings";
import { Tag } from "./Tag";

describe("Tag saving throws", () => {
  beforeEach(() => InitializeTestSettings());

  const save: TagSaveState = {
    Ability: "Dex",
    DC: 14,
    Timing: "EndOfTurn",
    CombatantId: "trigger"
  };

  test("round-trips optional save state", () => {
    const encounter = buildEncounter();
    const combatant = addCombatantFromStatBlock(encounter, StatBlock.Default());
    const tag = new Tag(
      "Restrained",
      combatant,
      false,
      -1,
      "StartOfTurn",
      "",
      save
    );

    expect(tag.GetState()).toEqual({
      Text: "Restrained",
      Hidden: false,
      DurationRemaining: -1,
      DurationTiming: "StartOfTurn",
      DurationCombatantId: "",
      Save: save
    });

    expect(Tag.FromTagStates([tag.GetState()], combatant)[0].Save).toEqual(
      save
    );
  });

  test("does not add a Save property to an ordinary tag state", () => {
    const encounter = buildEncounter();
    const combatant = addCombatantFromStatBlock(encounter);
    const tag = new Tag("Prone", combatant, false);

    expect(tag.GetState()).not.toHaveProperty("Save");
  });

  test("adds and registers an automated tag only once", async () => {
    const encounter = buildEncounter();
    const combatant = addCombatantFromStatBlock(encounter);
    encounter.EncounterFlow.StartEncounter();
    const tag = new Tag("Restrained", combatant, false, -1, "StartOfTurn", "", {
      ...save,
      CombatantId: combatant.Id
    });

    tag.Add();
    tag.Add();

    expect(combatant.Tags()).toEqual([tag]);
    const turnResult = await encounter.EncounterFlow.NextTurn(jest.fn());
    expect(turnResult.SaveTriggers).toEqual([{ Tag: tag, Trigger: 1 }]);
  });

  test("round-trips a combined timer and save", () => {
    const encounter = buildEncounter();
    const combatant = addCombatantFromStatBlock(encounter);
    const tag = new Tag(
      "Restrained",
      combatant,
      false,
      2,
      "EndOfTurn",
      "trigger",
      save
    );

    const restored = Tag.FromTagStates([tag.GetState()], combatant)[0];

    expect(restored.HasDuration).toBe(true);
    expect(restored.DurationRemaining()).toBe(2);
    expect(restored.Save).toEqual(save);
  });

  test("success inactivates a tag until its exact trigger is rewound", () => {
    const encounter = buildEncounter();
    const combatant = addCombatantFromStatBlock(encounter);
    const tag = new Tag(
      "Restrained",
      combatant,
      false,
      -1,
      "StartOfTurn",
      "",
      save
    );
    combatant.Tags.push(tag);

    const trigger = tag.AdvanceSaveTrigger();
    expect(tag.ResolveSaveSuccess(trigger)).toBe(true);
    expect(tag.IsActive()).toBe(false);

    tag.AdvanceSaveTrigger();
    expect(tag.RewindSaveTrigger().TagRestored).toBe(false);
    expect(tag.IsActive()).toBe(false);

    expect(tag.RewindSaveTrigger().TagRestored).toBe(true);
    expect(tag.IsActive()).toBe(true);
  });

  test("rewind invalidates only the pending occurrence it crosses", () => {
    const encounter = buildEncounter();
    const combatant = addCombatantFromStatBlock(encounter);
    const tag = new Tag(
      "Restrained",
      combatant,
      false,
      -1,
      "StartOfTurn",
      "",
      save
    );

    tag.AdvanceSaveTrigger();
    tag.AdvanceSaveTrigger();

    expect(tag.RewindSaveTrigger().PromptInvalidated).toBe(false);
    expect(tag.RewindSaveTrigger().PromptInvalidated).toBe(true);
  });

  test("manual removal notifies listeners and cannot be repeated", () => {
    const encounter = buildEncounter();
    const combatant = addCombatantFromStatBlock(encounter);
    const tag = new Tag("Restrained", combatant, false);
    const onRemove = jest.fn();
    tag.OnRemove(onRemove);
    combatant.Tags.push(tag);

    tag.Remove();
    tag.Remove();

    expect(combatant.Tags()).not.toContain(tag);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
