import { TagSaveState } from "../../common/CombatantState";
import { StatBlock } from "../../common/StatBlock";
import { Tag } from "../Combatant/Tag";
import { addCombatantFromStatBlock } from "../test/addCombatant";
import { buildEncounter } from "../test/buildEncounter";
import { InitializeTestSettings } from "../test/InitializeTestSettings";

describe("EncounterFlow tag saving throws", () => {
  beforeEach(() => InitializeTestSettings());

  function addSaveTag(
    owner,
    triggerCombatantId: string,
    timing: "StartOfTurn" | "EndOfTurn" = "EndOfTurn",
    duration = -1
  ) {
    const save: TagSaveState = {
      Ability: "Dex",
      DC: 14,
      Timing: timing,
      CombatantId: triggerCombatantId
    };
    const tag = new Tag(
      "Restrained",
      owner,
      false,
      duration,
      timing,
      triggerCombatantId,
      save
    );
    tag.Add();
    return tag;
  }

  test("emits an end-of-turn save added during the same turn", async () => {
    const encounter = buildEncounter();
    const ogre = addCombatantFromStatBlock(encounter, {
      ...StatBlock.Default(),
      Name: "Ogre"
    });
    const cultist = addCombatantFromStatBlock(encounter, {
      ...StatBlock.Default(),
      Name: "Cultist"
    });
    ogre.Initiative(20);
    cultist.Initiative(10);
    encounter.EncounterFlow.StartEncounter();
    const tag = addSaveTag(ogre, ogre.Id);

    const result = await encounter.EncounterFlow.NextTurn(jest.fn());

    expect(result.SaveTriggers).toEqual([{ Tag: tag, Trigger: 1 }]);
    expect(encounter.EncounterFlow.ActiveCombatant()).toBe(cultist);
  });

  test("emits a start-of-turn save only when its timing combatant starts", async () => {
    const encounter = buildEncounter();
    const ogre = addCombatantFromStatBlock(encounter);
    const cultist = addCombatantFromStatBlock(encounter);
    ogre.Initiative(20);
    cultist.Initiative(10);
    encounter.EncounterFlow.StartEncounter();
    const tag = addSaveTag(ogre, cultist.Id, "StartOfTurn");

    const result = await encounter.EncounterFlow.NextTurn(jest.fn());

    expect(result.SaveTriggers).toEqual([{ Tag: tag, Trigger: 1 }]);
  });

  test("timer expiration suppresses a save on the same boundary", async () => {
    const encounter = buildEncounter();
    const ogre = addCombatantFromStatBlock(encounter);
    const cultist = addCombatantFromStatBlock(encounter);
    ogre.Initiative(20);
    cultist.Initiative(10);
    encounter.EncounterFlow.StartEncounter();
    const tag = addSaveTag(ogre, ogre.Id, "EndOfTurn", 1);

    const result = await encounter.EncounterFlow.NextTurn(jest.fn());

    expect(tag.DurationRemaining()).toBe(0);
    expect(tag.IsActive()).toBe(false);
    expect(result.SaveTriggers).toEqual([]);
  });

  test("does not duplicate an unresolved save prompt", async () => {
    const encounter = buildEncounter();
    const ogre = addCombatantFromStatBlock(encounter);
    encounter.EncounterFlow.StartEncounter();
    addSaveTag(ogre, ogre.Id);

    const first = await encounter.EncounterFlow.NextTurn(jest.fn());
    const second = await encounter.EncounterFlow.NextTurn(jest.fn());

    expect(first.SaveTriggers).toHaveLength(1);
    expect(second.SaveTriggers).toHaveLength(0);
  });

  test("dismissed save prompts can trigger again next cycle", async () => {
    const encounter = buildEncounter();
    const ogre = addCombatantFromStatBlock(encounter);
    encounter.EncounterFlow.StartEncounter();
    const tag = addSaveTag(ogre, ogre.Id);

    const first = await encounter.EncounterFlow.NextTurn(jest.fn());
    tag.DismissSavePrompt(first.SaveTriggers[0].Trigger);
    const second = await encounter.EncounterFlow.NextTurn(jest.fn());

    expect(second.SaveTriggers).toEqual([{ Tag: tag, Trigger: 2 }]);
  });

  test("timer expiration invalidates an older unresolved save prompt", async () => {
    const encounter = buildEncounter();
    const ogre = addCombatantFromStatBlock(encounter);
    encounter.EncounterFlow.StartEncounter();
    const tag = addSaveTag(ogre, ogre.Id, "EndOfTurn", 2);

    const first = await encounter.EncounterFlow.NextTurn(jest.fn());
    const second = await encounter.EncounterFlow.NextTurn(jest.fn());

    expect(first.SaveTriggers).toHaveLength(1);
    expect(second.InvalidatedSavePromptTags).toEqual([tag]);
    expect(tag.IsActive()).toBe(false);
  });

  test("rewind restores a success only at its original occurrence", async () => {
    const encounter = buildEncounter();
    const ogre = addCombatantFromStatBlock(encounter);
    encounter.EncounterFlow.StartEncounter();
    const tag = addSaveTag(ogre, ogre.Id);

    const first = await encounter.EncounterFlow.NextTurn(jest.fn());
    tag.ResolveSaveSuccess(first.SaveTriggers[0].Trigger);
    await encounter.EncounterFlow.NextTurn(jest.fn());
    await encounter.EncounterFlow.NextTurn(jest.fn());

    encounter.EncounterFlow.PreviousTurn();
    expect(tag.IsActive()).toBe(false);
    encounter.EncounterFlow.PreviousTurn();
    expect(tag.IsActive()).toBe(false);
    encounter.EncounterFlow.PreviousTurn();
    expect(tag.IsActive()).toBe(true);

    const replay = await encounter.EncounterFlow.NextTurn(jest.fn());
    expect(replay.SaveTriggers).toEqual([{ Tag: tag, Trigger: 1 }]);
  });

  test("rewind reports an unresolved prompt from the boundary it crosses", async () => {
    const encounter = buildEncounter();
    const ogre = addCombatantFromStatBlock(encounter);
    const cultist = addCombatantFromStatBlock(encounter);
    ogre.Initiative(20);
    cultist.Initiative(10);
    encounter.EncounterFlow.StartEncounter();
    const tag = addSaveTag(ogre, ogre.Id);

    await encounter.EncounterFlow.NextTurn(jest.fn());
    const result = encounter.EncounterFlow.PreviousTurn();

    expect(result.InvalidatedSavePromptTags).toEqual([tag]);
  });

  test("a manually removed tag does not trigger or restore", async () => {
    const encounter = buildEncounter();
    const ogre = addCombatantFromStatBlock(encounter);
    encounter.EncounterFlow.StartEncounter();
    const tag = addSaveTag(ogre, ogre.Id);
    tag.Remove();

    const result = await encounter.EncounterFlow.NextTurn(jest.fn());
    encounter.EncounterFlow.PreviousTurn();

    expect(result.SaveTriggers).toEqual([]);
    expect(ogre.Tags()).not.toContain(tag);
  });

  test("a tag on a combatant pending removal does not trigger", async () => {
    const encounter = buildEncounter();
    const ogre = addCombatantFromStatBlock(encounter);
    encounter.EncounterFlow.StartEncounter();
    addSaveTag(ogre, ogre.Id);
    encounter.RemoveCombatant(ogre);

    const result = await encounter.EncounterFlow.NextTurn(jest.fn());

    expect(result.SaveTriggers).toEqual([]);
  });

  test("duration-only tags decrement and restore on matching boundaries", async () => {
    const encounter = buildEncounter();
    const ogre = addCombatantFromStatBlock(encounter);
    encounter.EncounterFlow.StartEncounter();
    const tag = new Tag("Blessed", ogre, false, 2, "EndOfTurn", ogre.Id);
    tag.Add();

    await encounter.EncounterFlow.NextTurn(jest.fn());
    expect(tag.DurationRemaining()).toBe(1);
    encounter.EncounterFlow.PreviousTurn();
    expect(tag.DurationRemaining()).toBe(2);
  });

  test("timer and save configurations operate on independent boundaries", async () => {
    const encounter = buildEncounter();
    const ogre = addCombatantFromStatBlock(encounter);
    const cultist = addCombatantFromStatBlock(encounter);
    ogre.Initiative(20);
    cultist.Initiative(10);
    encounter.EncounterFlow.StartEncounter();
    const tag = new Tag(
      "Restrained",
      ogre,
      false,
      2,
      "StartOfTurn",
      cultist.Id,
      {
        Ability: "Dex",
        DC: 14,
        Timing: "EndOfTurn",
        CombatantId: ogre.Id
      }
    );
    tag.Add();

    const result = await encounter.EncounterFlow.NextTurn(jest.fn());

    expect(result.SaveTriggers).toEqual([{ Tag: tag, Trigger: 1 }]);
    expect(tag.DurationRemaining()).toBe(1);
  });
});
