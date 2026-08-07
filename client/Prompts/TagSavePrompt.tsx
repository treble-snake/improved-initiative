import Tippy from "@tippyjs/react";
import * as React from "react";

import { GetSavingThrowModifier } from "../Combatant/GetSavingThrowModifier";
import { Tag } from "../Combatant/Tag";
import {
  GetTagSaveLabel,
  GetTagSaveRollTooltip
} from "../Combatant/TagSaveText";
import { Button, SubmitButton } from "../Components/Button";
import { PromptProps } from "./PendingPrompts";

type TagSaveResolution = "success" | "fail" | null;

interface TagSavePromptModel {
  resolution: TagSaveResolution;
}

interface SaveRoll {
  NaturalRoll: number;
  Modifier: number;
  Total: number;
  IsAbilityModifierFallback: boolean;
}

/** Creates the optional-roll prompt for one specific tag trigger occurrence. */
export function TagSavePrompt(
  tag: Tag,
  trigger: number
): PromptProps<TagSavePromptModel> {
  if (!tag.Save) {
    throw new Error("Cannot prompt a saving throw for a tag without save data");
  }

  return {
    children: <TagSavePromptContent tag={tag} />,
    initialValues: { resolution: null },
    onSubmit: model => {
      if (model.resolution === null) {
        return false;
      }
      if (model.resolution === "success") {
        tag.ResolveSaveSuccess(trigger);
      }
      return true;
    },
    onDismiss: () => tag.DismissSavePrompt(trigger)
  };
}

function TagSavePromptContent(props: { tag: Tag }) {
  const { tag } = props;
  const save = tag.Save;
  const [roll, setRoll] = React.useState<SaveRoll | null>(null);
  const rollTooltip = GetTagSaveRollTooltip(save.Ability);

  const rollSave = () => {
    const modifier = GetSavingThrowModifier(
      tag.Combatant.StatBlock(),
      save.Ability,
      tag.Combatant.Encounter.Rules
    );
    const result = tag.Combatant.Encounter.Rules.AbilityCheck(
      modifier.Modifier
    );
    setRoll({
      NaturalRoll: result.rolls[0],
      Modifier: modifier.Modifier,
      Total: result.finalValue,
      IsAbilityModifierFallback: modifier.IsAbilityModifierFallback
    });
  };

  return (
    <div className="p-tag-save">
      <div className="p-tag-save__content">
        <p className="p-tag-save__label">
          {tag.Combatant.DisplayName()}: make a {GetTagSaveLabel(save)} to stop{" "}
          {tag.Text}
        </p>
        {roll && (
          <SaveRollResult roll={roll} dc={save.DC} ability={save.Ability} />
        )}
      </div>
      <div className="p-tag-save__buttons">
        <Button
          additionalClassNames="p-tag-save__roll"
          text="Roll"
          fontAwesomeIcon="dice-d20"
          tooltip={rollTooltip}
          onClick={rollSave}
        />
        <SubmitButton
          text="Success"
          additionalClassNames="p-tag-save__success"
          tooltip={`Successful save: remove ${tag.Text}`}
          submitIntent={["resolution", "success"]}
        />
        <SubmitButton
          text="Fail"
          fontAwesomeIcon="times"
          tooltip={`Failed save: keep ${tag.Text}`}
          submitIntent={["resolution", "fail"]}
        />
      </div>
    </div>
  );
}

function SaveRollResult(props: {
  roll: SaveRoll;
  dc: number;
  ability: string;
}) {
  const { roll } = props;
  const succeeded = roll.Total >= props.dc;
  const operator = roll.Modifier < 0 ? "-" : "+";
  const ability = props.ability.toUpperCase();
  const modifierTooltip = roll.IsAbilityModifierFallback
    ? `No ${ability} save, using straight ${ability} modifier`
    : `${ability} save ${operator}${Math.abs(roll.Modifier)}`;

  return (
    <div className="p-tag-save__result" aria-live="polite">
      <span className="fas fa-dice-d20" aria-hidden="true" />
      <span>{roll.NaturalRoll}</span>
      <span>{operator}</span>
      <Tippy content={modifierTooltip}>
        <span
          className="p-tag-save__modifier-source"
          aria-label={modifierTooltip}
          tabIndex={0}
        >
          ({ability})
        </span>
      </Tippy>
      <span>{Math.abs(roll.Modifier)}</span>
      <span>= {roll.Total}</span>
      <span
        className={`p-tag-save__result-icon fas fa-${
          succeeded ? "check" : "times"
        }`}
        aria-hidden="true"
      />
      <span className="screen-reader-only">
        {succeeded ? "Save succeeds" : "Save fails"}
      </span>
    </div>
  );
}
