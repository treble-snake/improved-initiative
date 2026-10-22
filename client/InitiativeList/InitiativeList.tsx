import * as React from "react";

import { CombatantState } from "../../common/CombatantState";
import { EncounterState } from "../../common/EncounterState";
import { CombatantRow } from "./CombatantRow";
import { InitiativeListHeader } from "./InitiativeListHeader";
import { RestoreCombatants } from "./RestoreCombatants";

export function InitiativeList(props: {
  encounterState: EncounterState<CombatantState>;
  selectedCombatantIds: string[];
  combatantCountsByName: { [name: string]: number };
}) {
  const encounterState = props.encounterState;
  const combatantNamesById = encounterState.Combatants.reduce(
    (namesById, combatantState) => {
      const siblingCount =
        props.combatantCountsByName[combatantState.StatBlock.Name] || 1;
      namesById[combatantState.Id] = GetCombatantDisplayName(
        combatantState,
        siblingCount > 1
      );
      return namesById;
    },
    {} as { [id: string]: string }
  );

  return (
    <div className="initiative-list">
      <h2>Combatants by Initiative</h2>
      <table className="combatants">
        <InitiativeListHeader
          encounterActive={encounterState.ActiveCombatantId != null}
        />
        <tbody>
          {encounterState.Combatants.map((combatantState, index) => {
            const siblingCount =
              props.combatantCountsByName[combatantState.StatBlock.Name] || 1;

            return (
              <CombatantRow
                key={combatantState.Id}
                combatantState={combatantState}
                isActive={encounterState.ActiveCombatantId == combatantState.Id}
                isSelected={props.selectedCombatantIds.some(
                  id => id == combatantState.Id
                )}
                initiativeIndex={index}
                combatantNamesById={combatantNamesById}
              />
            );
          })}
        </tbody>
      </table>
      <RestoreCombatants />
    </div>
  );
}

/** Applies the same alias and duplicate-index policy everywhere names appear. */
export function GetCombatantDisplayName(
  combatantState: CombatantState,
  showIndexLabel: boolean
): string {
  if (combatantState.Alias?.length) {
    return combatantState.Alias;
  }
  if (showIndexLabel) {
    return `${combatantState.StatBlock.Name} ${combatantState.IndexLabel}`;
  }
  return combatantState.StatBlock.Name;
}
