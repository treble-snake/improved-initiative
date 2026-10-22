import { DurationTiming } from "./DurationTiming";
import { AbilityName, StatBlock } from "./StatBlock";

/** Persisted configuration for the saving throw that can end a tag. */
export interface TagSaveState {
  Ability: AbilityName;
  DC: number;
  Timing: DurationTiming;
  CombatantId: string;
}

export interface TagState {
  Text: string;
  DurationRemaining: number;
  DurationTiming: DurationTiming;
  DurationCombatantId: string;
  Save?: TagSaveState;
  Hidden?: boolean;
}

export interface CombatantState {
  Id: string;
  StatBlock: StatBlock;
  PersistentCharacterId?: string;
  CurrentHP: number;
  CurrentNotes?: string;
  Color?: string;
  ReactionsSpent?: number;
  TemporaryHP: number;
  Initiative: number;
  InitiativeGroup?: string;
  Alias: string;
  IndexLabel: number | null;
  Tags: TagState[];
  Hidden: boolean;
  RevealedAC: boolean;
  RoundCounter?: number;
  ElapsedSeconds?: number;
  InterfaceVersion: string;
}
