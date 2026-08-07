import { TagSaveState } from "../../common/CombatantState";
import { DurationTiming } from "../../common/DurationTiming";
import { AbilityName } from "../../common/StatBlock";

export function GetTagSaveLabel(
  save: Pick<TagSaveState, "Ability" | "DC">
): string {
  return `${save.Ability.toUpperCase()} save DC ${save.DC}`;
}

export function GetTagSaveRollTooltip(ability: AbilityName): string {
  return (
    `Roll ${ability.toUpperCase()} save ` +
    "(will not remove the tag automatically)"
  );
}

export function GetTurnScheduleDescription(
  timing: DurationTiming,
  combatantName: string
): string {
  const boundary = timing == "StartOfTurn" ? "start" : "end";
  return `at ${boundary} of ${combatantName}'s turn`;
}

export function GetTagSaveScheduleDescription(
  save: TagSaveState,
  combatantName: string
): string {
  return `${GetTagSaveLabel(save)} ${GetTurnScheduleDescription(
    save.Timing,
    combatantName
  )}`;
}
