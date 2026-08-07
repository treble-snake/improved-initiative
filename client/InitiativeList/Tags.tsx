import * as React from "react";

import Tippy from "@tippyjs/react";
import { TagSaveState, TagState } from "../../common/CombatantState";
import { CommandContext } from "./CommandContext";
import { TextEnricherContext } from "../TextEnricher/TextEnricher";
import { GetTagSaveScheduleDescription } from "../Combatant/TagSaveText";

export function Tags(props: {
  tags: TagState[];
  combatantId: string;
  combatantNamesById: { [id: string]: string };
}) {
  return (
    <ul className="combatant__tags">
      {props.tags.map((tag, i) => (
        <Tag
          combatantId={props.combatantId}
          tag={tag}
          combatantNamesById={props.combatantNamesById}
          key={props.combatantId + "_tag_" + i}
        />
      ))}
    </ul>
  );
}

function Tag(props: {
  combatantId: string;
  tag: TagState;
  combatantNamesById: { [id: string]: string };
}) {
  const commandContext = React.useContext(CommandContext);
  const TextEnricher = React.useContext(TextEnricherContext);
  const saveTooltip = props.tag.Save
    ? GetSaveTooltip(props.tag.Save, props.combatantNamesById)
    : null;

  const removeTag = React.useCallback(
    event => {
      commandContext.RemoveTagFromCombatant(props.combatantId, props.tag);
      event.stopPropagation();
    },
    [commandContext, props.combatantId, props.tag]
  );

  return (
    <li className="tag">
      <span className="tag__text">
        {TextEnricher.EnrichText(props.tag.Text)}
      </span>
      {props.tag.DurationCombatantId.length > 0 && (
        <Tippy content={`Remaining rounds: ${props.tag.DurationRemaining}`}>
          <span className="tag__icon fas fa-hourglass">
            {props.tag.DurationRemaining}
          </span>
        </Tippy>
      )}
      {saveTooltip && (
        <Tippy content={saveTooltip}>
          <span className="tag__icon fas fa-dice-d20" aria-label={saveTooltip}>
            {props.tag.Save.DC}
          </span>
        </Tippy>
      )}
      {props.tag.Hidden && (
        <Tippy content="Tag hidden from Player View">
          <span className="tag__icon fas fa-eye-slash" />
        </Tippy>
      )}

      <Tippy content={`Remove ${props.tag.Text}`}>
        <button
          aria-label={`Remove ${props.tag.Text}`}
          className="tag__button fa-clickable fa-times"
          onClick={removeTag}
        ></button>
      </Tippy>
    </li>
  );
}

/** Formats the at-a-glance save schedule shown on a save-enabled tag. */
export function GetSaveTooltip(
  save: TagSaveState,
  combatantNamesById: { [id: string]: string }
): string {
  const combatantName =
    combatantNamesById[save.CombatantId] || "Unknown combatant";
  return GetTagSaveScheduleDescription(save, combatantName);
}
