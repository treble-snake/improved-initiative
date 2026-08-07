import * as ko from "knockout";

import { TagSaveState, TagState } from "../../common/CombatantState";
import { DurationTiming } from "../../common/DurationTiming";
import { Combatant } from "./Combatant";

export const StartOfTurn: DurationTiming = "StartOfTurn";
export const EndOfTurn: DurationTiming = "EndOfTurn";

export class Tag {
  constructor(
    public Text: string,
    public Combatant: Combatant,
    public HiddenFromPlayerView: boolean,
    duration = -1,
    public DurationTiming = StartOfTurn,
    public DurationCombatantId = "",
    public Save?: TagSaveState
  ) {
    this.HasDuration = duration > -1;
    this.HasSave = Save !== undefined;
    this.DurationRemaining = ko.observable(duration);
  }

  public HasDuration: boolean;
  public HasSave: boolean;
  public DurationRemaining: KnockoutObservable<number>;

  private saveTriggerCount = 0;
  private saveSucceededAtTrigger = ko.observable<number | null>(null);
  private pendingSaveTrigger: number | null = null;
  private removalCallbacks = new Set<() => void>();

  public GetState = ko.pureComputed<TagState>(() => {
    const state: TagState = {
      Text: this.Text,
      Hidden: this.HiddenFromPlayerView,
      DurationRemaining: this.DurationRemaining(),
      DurationTiming: this.DurationTiming,
      DurationCombatantId: this.DurationCombatantId
    };

    if (this.Save) {
      state.Save = this.Save;
    }

    return state;
  });

  public Decrement = () => this.DurationRemaining(this.DurationRemaining() - 1);

  public Increment = () => this.DurationRemaining(this.DurationRemaining() + 1);

  public NotExpired = ko.pureComputed(() => {
    return !this.HasDuration || this.DurationRemaining() > 0;
  });

  public IsActive = ko.pureComputed(
    () => this.NotExpired() && this.saveSucceededAtTrigger() === null
  );

  /**
   * Records a matching forward boundary and reserves its save prompt. The
   * counter advances while inactive so rewind can locate an earlier success.
   */
  public AdvanceSaveTrigger = (): number | null => {
    if (!this.HasSave) {
      return null;
    }

    this.saveTriggerCount += 1;
    if (!this.IsActive() || this.pendingSaveTrigger !== null) {
      return null;
    }

    this.pendingSaveTrigger = this.saveTriggerCount;
    return this.pendingSaveTrigger;
  };

  public DismissSavePrompt = (trigger: number): void => {
    if (this.pendingSaveTrigger === trigger) {
      this.pendingSaveTrigger = null;
    }
  };

  /** Invalidates any unresolved prompt when another lifecycle event ends it. */
  public InvalidatePendingSavePrompt = (): boolean => {
    if (this.pendingSaveTrigger === null) {
      return false;
    }

    this.pendingSaveTrigger = null;
    return true;
  };

  public ResolveSaveSuccess = (trigger: number): boolean => {
    if (
      this.pendingSaveTrigger !== trigger ||
      this.Combatant.Tags().indexOf(this) === -1
    ) {
      return false;
    }

    this.pendingSaveTrigger = null;
    this.saveSucceededAtTrigger(trigger);
    return true;
  };

  public RewindSaveTrigger = (): TagSaveRewindResult => {
    if (!this.HasSave || this.saveTriggerCount === 0) {
      return { PromptInvalidated: false, TagRestored: false };
    }

    this.saveTriggerCount -= 1;

    const promptInvalidated =
      this.pendingSaveTrigger !== null &&
      this.pendingSaveTrigger > this.saveTriggerCount;
    if (promptInvalidated) {
      this.pendingSaveTrigger = null;
    }

    const succeededAt = this.saveSucceededAtTrigger();
    const tagRestored =
      succeededAt !== null && succeededAt > this.saveTriggerCount;
    if (tagRestored) {
      // Replaying initiative after a rewind should ask for a new decision.
      this.saveSucceededAtTrigger(null);
    }

    return {
      PromptInvalidated: promptInvalidated,
      TagRestored: tagRestored
    };
  };

  public OnRemove = (callback: () => void): (() => void) => {
    this.removalCallbacks.add(callback);
    return () => {
      this.removalCallbacks.delete(callback);
    };
  };

  /** Adds the tag and registers any turn-bound automation as one operation. */
  public Add = (): boolean => {
    if (this.Combatant.Tags().indexOf(this) !== -1) {
      return false;
    }

    this.Combatant.Encounter.EncounterFlow.AddTurnTriggeredTag(this);
    this.Combatant.Tags.push(this);
    return true;
  };

  public Remove = () => {
    const removed = this.Combatant.Tags.remove(this).length > 0;
    if (!removed) {
      return;
    }

    this.Combatant.Encounter.EncounterFlow.RemoveTurnTriggeredTag(this);
    this.removalCallbacks.forEach(callback => callback());
    this.removalCallbacks.clear();
  };

  public static FromTagStates = (
    tags: TagState[],
    combatant: Combatant
  ): Tag[] => {
    return tags.map(
      tag =>
        new Tag(
          tag.Text,
          combatant,
          tag.Hidden || false,
          tag.DurationRemaining,
          tag.DurationTiming,
          tag.DurationCombatantId,
          tag.Save
        )
    );
  };
}

export interface TagSaveRewindResult {
  PromptInvalidated: boolean;
  TagRestored: boolean;
}
