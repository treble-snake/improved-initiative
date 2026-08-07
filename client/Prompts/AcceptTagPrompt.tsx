import * as React from "react";
import { TagState } from "../../common/CombatantState";
import { Combatant } from "../Combatant/Combatant";
import { Tag } from "../Combatant/Tag";
import {
  GetTagSaveScheduleDescription,
  GetTurnScheduleDescription
} from "../Combatant/TagSaveText";
import { SubmitButton } from "../Components/Button";
import { Encounter } from "../Encounter/Encounter";
import { Metrics } from "../Utility/Metrics";
import { PromptProps } from "./PendingPrompts";
import { StandardPromptLayout } from "./StandardPromptLayout";

type AcceptTagModel = {
  accept: boolean;
};

export function AcceptTagPrompt(
  combatant: Combatant,
  encounter: Encounter,
  tagState: TagState
): PromptProps<AcceptTagModel> {
  const automationDescription = getAutomationDescription(encounter, tagState);
  return {
    autoFocusSelector: ".accept",
    children: (
      <StandardPromptLayout
        label={`Add tag "${
          tagState.Text
        }" to ${combatant.DisplayName()}${automationDescription}?`}
        fieldsDoSubmit
      >
        <SubmitButton
          dataTestId="reject-tag-suggestion"
          fontAwesomeIcon="times"
          tooltip="Reject tag suggestion"
        />
        <SubmitButton
          additionalClassNames="accept"
          dataTestId="accept-tag-suggestion"
          tooltip="Accept tag suggestion"
          submitIntent={["accept", true]}
        />
      </StandardPromptLayout>
    ),
    initialValues: { accept: false },
    onSubmit: model => {
      if (!model.accept) {
        return true;
      }

      const hasDuration = tagState.DurationCombatantId.length > 0;
      const tag = new Tag(
        tagState.Text,
        combatant,
        false,
        hasDuration ? tagState.DurationRemaining : -1,
        hasDuration ? tagState.DurationTiming : undefined,
        hasDuration ? tagState.DurationCombatantId : "",
        tagState.Save
      );
      tag.Add();
      Metrics.TrackEvent(
        Metrics.Event.TagAddedFromSuggestion,
        tag.HasDuration
          ? { text: tag.Text, duration: tag.DurationRemaining() }
          : { text: tag.Text }
      );

      return true;
    }
  };
}

function getAutomationDescription(
  encounter: Encounter,
  tagState: TagState
): string {
  const descriptions: string[] = [];
  if (tagState.DurationCombatantId.length > 0) {
    const timingName = getTimingCombatantName(
      encounter,
      tagState.DurationCombatantId
    );
    descriptions.push(
      `${tagState.DurationRemaining}-round timer ${GetTurnScheduleDescription(
        tagState.DurationTiming,
        timingName
      )}`
    );
  }

  if (tagState.Save) {
    const timingName = getTimingCombatantName(
      encounter,
      tagState.Save.CombatantId
    );
    descriptions.push(GetTagSaveScheduleDescription(tagState.Save, timingName));
  }

  return descriptions.length > 0 ? ` (${descriptions.join("; ")})` : "";
}

function getTimingCombatantName(
  encounter: Encounter,
  combatantId: string
): string {
  const timingCombatant = encounter.Combatants().find(c => c.Id == combatantId);
  return timingCombatant ? timingCombatant.DisplayName() : "Unknown combatant";
}
