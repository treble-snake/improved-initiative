import { fireEvent, render } from "@testing-library/react";
import * as React from "react";

import { TagState } from "../../common/CombatantState";
import { StatBlock } from "../../common/StatBlock";
import { addCombatantFromStatBlock } from "../test/addCombatant";
import { buildEncounter } from "../test/buildEncounter";
import { InitializeTestSettings } from "../test/InitializeTestSettings";
import { AcceptTagPrompt } from "./AcceptTagPrompt";
import { PendingPrompts } from "./PendingPrompts";

describe("AcceptTagPrompt", () => {
  beforeEach(() => InitializeTestSettings());

  test("describes and accepts a save-only tag suggestion", async () => {
    const encounter = buildEncounter();
    const ogre = addCombatantFromStatBlock(encounter, {
      ...StatBlock.Default(),
      Name: "Ogre"
    });
    encounter.EncounterFlow.StartEncounter();
    const tagState: TagState = {
      Text: "Restrained",
      DurationRemaining: -1,
      DurationTiming: null,
      DurationCombatantId: "",
      Save: {
        Ability: "Dex",
        DC: 14,
        Timing: "EndOfTurn",
        CombatantId: ogre.Id
      }
    };
    const prompt = AcceptTagPrompt(ogre, encounter, tagState);
    const view = render(
      <PendingPrompts
        promptsAndIds={[[prompt, "accept-tag"]]}
        removePrompt={jest.fn()}
      />
    );

    expect(
      view.getByText(
        `Add tag "Restrained" to Ogre (DEX save DC 14 at end of Ogre's turn)?`
      )
    ).toBeTruthy();

    expect(prompt.onSubmit({ accept: true })).toBe(true);
    expect(ogre.Tags()).toHaveLength(1);
    expect(ogre.Tags()[0].HasDuration).toBe(false);
    expect(ogre.Tags()[0].Save).toEqual(tagState.Save);

    const turnResult = await encounter.EncounterFlow.NextTurn(jest.fn());
    expect(turnResult.SaveTriggers).toEqual([
      { Tag: ogre.Tags()[0], Trigger: 1 }
    ]);
  });

  test("describes both timer and save automation", () => {
    const encounter = buildEncounter();
    const ogre = addCombatantFromStatBlock(encounter, {
      ...StatBlock.Default(),
      Name: "Ogre"
    });
    const tagState: TagState = {
      Text: "Slowed",
      DurationRemaining: 2,
      DurationTiming: "EndOfTurn",
      DurationCombatantId: ogre.Id,
      Save: {
        Ability: "Con",
        DC: 13,
        Timing: "StartOfTurn",
        CombatantId: ogre.Id
      }
    };
    const prompt = AcceptTagPrompt(ogre, encounter, tagState);
    const view = render(
      <PendingPrompts
        promptsAndIds={[[prompt, "accept-tag"]]}
        removePrompt={jest.fn()}
      />
    );

    expect(
      view.getByText(
        `Add tag "Slowed" to Ogre (2-round timer at end of Ogre's turn; CON save DC 13 at start of Ogre's turn)?`
      )
    ).toBeTruthy();
  });

  test("clarifies suggestion response buttons", async () => {
    const encounter = buildEncounter();
    const ogre = addCombatantFromStatBlock(encounter);
    const prompt = AcceptTagPrompt(ogre, encounter, {
      Text: "Restrained",
      DurationRemaining: -1,
      DurationTiming: null,
      DurationCombatantId: ""
    });
    const view = render(
      <PendingPrompts
        promptsAndIds={[[prompt, "accept-tag"]]}
        removePrompt={jest.fn()}
      />
    );

    const buttonsAndTooltips = [
      ["reject-tag-suggestion", "Reject tag suggestion"],
      ["accept-tag-suggestion", "Accept tag suggestion"]
    ];
    for (const [testId, tooltip] of buttonsAndTooltips) {
      fireEvent.mouseEnter(view.getByTestId(testId));
      expect(await view.findByText(tooltip)).toBeTruthy();
    }
  });

  test("rejecting a suggestion changes nothing", () => {
    const encounter = buildEncounter();
    const ogre = addCombatantFromStatBlock(encounter);
    const tagState: TagState = {
      Text: "Restrained",
      DurationRemaining: -1,
      DurationTiming: null,
      DurationCombatantId: "",
      Save: {
        Ability: "Dex",
        DC: 14,
        Timing: "EndOfTurn",
        CombatantId: ogre.Id
      }
    };

    expect(
      AcceptTagPrompt(ogre, encounter, tagState).onSubmit({ accept: false })
    ).toBe(true);
    expect(ogre.Tags()).toEqual([]);
  });
});
