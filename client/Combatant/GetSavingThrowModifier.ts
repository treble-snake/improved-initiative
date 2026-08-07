import { AbilityName, StatBlock } from "../../common/StatBlock";
import { IRules } from "../Rules/Rules";

const fullAbilityNames: Record<AbilityName, string> = {
  Str: "Strength",
  Dex: "Dexterity",
  Con: "Constitution",
  Int: "Intelligence",
  Wis: "Wisdom",
  Cha: "Charisma"
};

export interface SavingThrowModifier {
  Modifier: number;
  IsAbilityModifierFallback: boolean;
}

/**
 * Uses a statblock's explicit saving throw total when one is present. Imported
 * and user-authored statblocks may use either abbreviations or full names, so
 * both forms are matched without requiring stored content to be normalized.
 */
export function GetSavingThrowModifier(
  statBlock: StatBlock,
  ability: AbilityName,
  rules: IRules
): SavingThrowModifier {
  const fullAbilityName = fullAbilityNames[ability];
  const acceptedNames = [ability, fullAbilityName].map(name =>
    name.toLocaleLowerCase()
  );
  const explicitSave = statBlock.Saves.find(save =>
    acceptedNames.includes(save.Name.trim().toLocaleLowerCase())
  );

  if (explicitSave !== undefined) {
    return {
      Modifier: explicitSave.Modifier,
      IsAbilityModifierFallback: false
    };
  }

  return {
    Modifier: rules.GetModifierFromScore(statBlock.Abilities[ability]),
    IsAbilityModifierFallback: true
  };
}
