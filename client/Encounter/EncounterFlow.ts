import * as ko from "knockout";

import { AutoRerollInitiativeOption } from "../../common/Settings";
import { Combatant } from "../Combatant/Combatant";
import { Tag } from "../Combatant/Tag";
import { DurationTiming } from "../../common/DurationTiming";
import { CurrentSettings } from "../Settings/Settings";
import { CombatTimer } from "../Widgets/CombatTimer";
import { GetTimerReadout } from "../Widgets/GetTimerReadout";
import { Encounter } from "./Encounter";

export class EncounterFlow {
  public ActiveCombatant: KnockoutObservable<Combatant> =
    ko.observable<Combatant>();
  public TurnTimer = new CombatTimer();
  public CombatTimer = new CombatTimer();
  public State: KnockoutObservable<"active" | "inactive"> = ko.observable<
    "active" | "inactive"
  >("inactive");

  private turnTriggeredTags = new Set<Tag>();

  constructor(private encounter: Encounter) {}

  public StateIcon = ko.pureComputed(() =>
    this.State() === "active" ? "fa-play" : "fa-pause"
  );
  public StateTip = ko.pureComputed(() =>
    this.State() === "active" ? "Encounter Active" : "Encounter Inactive"
  );

  public TurnTimerReadout = ko.pureComputed(() =>
    GetTimerReadout(this.TurnTimer.ElapsedSeconds())
  );

  public StartEncounter = () => {
    if (this.encounter.Combatants().length == 0) {
      console.warn("Can't start an encounter with no combatants");
      return;
    }
    this.encounter.SortByInitiative();
    if (this.State() == "inactive") {
      this.CombatTimer.SetElapsedRounds(1);
    }
    this.State("active");
    this.ActiveCombatant(this.encounter.Combatants()[0]);
    this.ActiveCombatant().CombatTimer.Start();
    this.ActiveCombatant().CombatTimer.IncrementCombatRounds();
    this.TurnTimer.Start();
    this.CombatTimer.Start();
  };

  public EndEncounter = () => {
    this.State("inactive");

    if (this.ActiveCombatant() != null) {
      this.ActiveCombatant().CombatTimer.Pause();
    }

    this.CombatTimer.Pause();
    this.TurnTimer.Stop();
    this.ActiveCombatant(null);
    this.encounter.TemporaryBackgroundImageUrl(null);
  };

  public NextTurn = async (promptRerollInitiative: () => Promise<void>) => {
    const activeCombatant = this.ActiveCombatant();
    const endOfTurnResult = this.advanceTurnBoundary(
      activeCombatant,
      "EndOfTurn"
    );

    let nextIndex = this.encounter.Combatants().indexOf(activeCombatant) + 1;
    if (nextIndex >= this.encounter.Combatants().length) {
      nextIndex = 0;
      const autoRerollOption = CurrentSettings().Rules.AutoRerollInitiative;
      if (autoRerollOption == AutoRerollInitiativeOption.Prompt) {
        await promptRerollInitiative();
      }
      if (autoRerollOption == AutoRerollInitiativeOption.Automatic) {
        this.rerollInitiativeWithoutPrompt();
      }
      this.CombatTimer.IncrementCombatRounds();
    }

    const nextCombatant = this.encounter.Combatants()[nextIndex];
    this.ActiveCombatant(nextCombatant);

    activeCombatant.CombatTimer.Pause();
    nextCombatant.CombatTimer.IncrementCombatRounds();
    nextCombatant.CombatTimer.Start();

    const startOfTurnResult = this.advanceTurnBoundary(
      nextCombatant,
      "StartOfTurn"
    );

    nextCombatant.ReactionsSpent(0);

    this.TurnTimer.Reset();

    return {
      SaveTriggers: [
        ...endOfTurnResult.SaveTriggers,
        ...startOfTurnResult.SaveTriggers
      ],
      InvalidatedSavePromptTags: [
        ...endOfTurnResult.InvalidatedSavePromptTags,
        ...startOfTurnResult.InvalidatedSavePromptTags
      ]
    };
  };

  public PreviousTurn = () => {
    const activeCombatant = this.ActiveCombatant();
    const startOfTurnResult = this.rewindTurnBoundary(
      activeCombatant,
      "StartOfTurn"
    );

    let previousIndex =
      this.encounter.Combatants().indexOf(activeCombatant) - 1;

    if (previousIndex < 0) {
      previousIndex = this.encounter.Combatants().length - 1;
      this.CombatTimer.DecrementCombatRounds();
    }

    const previousCombatant = this.encounter.Combatants()[previousIndex];
    this.ActiveCombatant(previousCombatant);

    activeCombatant.CombatTimer.DecrementCombatRounds();
    activeCombatant.CombatTimer.Pause();
    previousCombatant.CombatTimer.Start();

    const endOfTurnResult = this.rewindTurnBoundary(
      previousCombatant,
      "EndOfTurn"
    );

    this.TurnTimer.Reset();

    return {
      SaveTriggers: [],
      InvalidatedSavePromptTags: [
        ...startOfTurnResult.InvalidatedSavePromptTags,
        ...endOfTurnResult.InvalidatedSavePromptTags
      ]
    };
  };

  public AddTurnTriggeredTag = (tag: Tag) => {
    if (tag.HasDuration || tag.HasSave) {
      this.turnTriggeredTags.add(tag);
    }
  };

  public RemoveTurnTriggeredTag = (tag: Tag) => {
    this.turnTriggeredTags.delete(tag);
  };

  public ClearTurnTriggeredTags = () => {
    this.turnTriggeredTags.clear();
  };

  private matchingTags = (
    combatant: Combatant,
    timing: DurationTiming
  ): Tag[] =>
    Array.from(this.turnTriggeredTags).filter(tag => {
      const ownerIsPresent =
        this.encounter.Combatants().indexOf(tag.Combatant) !== -1 &&
        !tag.Combatant.IsPendingRemoval();
      return (
        ownerIsPresent &&
        (this.durationMatches(tag, combatant, timing) ||
          this.saveMatches(tag, combatant, timing))
      );
    });

  private durationMatches = (
    tag: Tag,
    combatant: Combatant,
    timing: DurationTiming
  ): boolean =>
    tag.HasDuration &&
    tag.DurationCombatantId == combatant.Id &&
    tag.DurationTiming == timing;

  private saveMatches = (
    tag: Tag,
    combatant: Combatant,
    timing: DurationTiming
  ): boolean =>
    tag.HasSave &&
    tag.Save.CombatantId == combatant.Id &&
    tag.Save.Timing == timing;

  private advanceTurnBoundary = (
    combatant: Combatant,
    timing: DurationTiming
  ): TurnFlowResult => {
    const matchingTags = this.matchingTags(combatant, timing);

    matchingTags
      .filter(tag => this.durationMatches(tag, combatant, timing))
      .forEach(tag => tag.Decrement());

    const invalidatedSavePromptTags = matchingTags.filter(
      tag => !tag.IsActive() && tag.InvalidatePendingSavePrompt()
    );

    const saveTriggers: TagSaveTrigger[] = [];
    matchingTags
      .filter(tag => this.saveMatches(tag, combatant, timing))
      .forEach(tag => {
        const trigger = tag.AdvanceSaveTrigger();
        if (trigger !== null) {
          saveTriggers.push({ Tag: tag, Trigger: trigger });
        }
      });

    return {
      SaveTriggers: saveTriggers,
      InvalidatedSavePromptTags: invalidatedSavePromptTags
    };
  };

  private rewindTurnBoundary = (
    combatant: Combatant,
    timing: DurationTiming
  ): TurnFlowResult => {
    const matchingTags = this.matchingTags(combatant, timing);
    const invalidatedSavePromptTags: Tag[] = [];

    matchingTags
      .filter(tag => this.saveMatches(tag, combatant, timing))
      .forEach(tag => {
        if (tag.RewindSaveTrigger().PromptInvalidated) {
          invalidatedSavePromptTags.push(tag);
        }
      });

    matchingTags
      .filter(tag => this.durationMatches(tag, combatant, timing))
      .forEach(tag => tag.Increment());

    return {
      SaveTriggers: [],
      InvalidatedSavePromptTags: invalidatedSavePromptTags
    };
  };

  private rerollInitiativeWithoutPrompt = () => {
    const combatants = this.encounter.Combatants();
    combatants.forEach(c => c.Initiative(c.GetInitiativeRoll().finalValue));
    this.encounter.SortByInitiative(false);
  };
}

export interface TagSaveTrigger {
  Tag: Tag;
  Trigger: number;
}

export interface TurnFlowResult {
  SaveTriggers: TagSaveTrigger[];
  InvalidatedSavePromptTags: Tag[];
}
