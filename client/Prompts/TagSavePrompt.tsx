import * as React from "react";
import { toModifierString } from "../../common/Toolbox";

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

/** Creates the optional-roll prompt for one specific tag trigger occurrence. */
export function TagSavePrompt(
  tag: Tag,
  trigger: number,
  rollDice: (expression: string) => void
): PromptProps<TagSavePromptModel> {
  if (!tag.Save) {
    throw new Error("Cannot prompt a saving throw for a tag without save data");
  }

  return {
    children: <TagSavePromptContent tag={tag} rollDice={rollDice} />,
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

function TagSavePromptContent(props: {
  tag: Tag;
  rollDice: (expression: string) => void;
}) {
  const { tag } = props;
  const save = tag.Save;
  const rollTooltip = GetTagSaveRollTooltip(save.Ability);

  const rollSave = () => {
    const modifier = GetSavingThrowModifier(
      tag.Combatant.StatBlock(),
      save.Ability,
      tag.Combatant.Encounter.Rules
    );
    props.rollDice(toModifierString(modifier.Modifier));
  };

  return (
    <div className="p-tag-save">
      <div className="p-tag-save__content">
        <p className="p-tag-save__label">
          {tag.Combatant.DisplayName()}: make a {GetTagSaveLabel(save)} to stop{" "}
          {tag.Text}
        </p>
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
