import * as React from "react";
import Tippy from "@tippyjs/react";

import { toModifierString } from "../../common/Toolbox";
import { StatBlockComponent } from "../Components/StatBlock";
import { StatBlockHeader } from "../Components/StatBlockHeader";
import { TextEnricherContext } from "../TextEnricher/TextEnricher";
import { CombatantViewModel } from "./CombatantViewModel";
import { useSubscription } from "./linkComponentToObservables";
import { SettingsContext } from "../Settings/SettingsContext";
import { Tag } from "./Tag";
import { useContext } from "react";
import { GetSavingThrowModifier } from "./GetSavingThrowModifier";
import { GetTagSaveLabel, GetTagSaveRollTooltip } from "./TagSaveText";

interface CombatantDetailsProps {
  combatantViewModel: CombatantViewModel;
  displayMode: "default" | "active" | "status-only";
  key: string;
}

export function CombatantDetails(props: CombatantDetailsProps): JSX.Element {
  const TextEnricher = useContext(TextEnricherContext);
  const currentHp = useSubscription(props.combatantViewModel.HP);
  const currentHPPercentage = useSubscription(
    props.combatantViewModel.HPPercentage
  );
  const name = useSubscription(props.combatantViewModel.Name);
  const tags = useSubscription(props.combatantViewModel.Combatant.ActiveTags);
  const notes = useSubscription(
    props.combatantViewModel.Combatant.CurrentNotes
  );
  const statBlock = useSubscription(
    props.combatantViewModel.Combatant.StatBlock
  );

  const { DisplayHPBar } = useContext(SettingsContext).TrackerView;
  if (!props.combatantViewModel) {
    return null;
  }

  const renderedNotes = notes.length
    ? TextEnricher.EnrichText(
        notes,
        props.combatantViewModel.Combatant.CurrentNotes
      )
    : null;

  return (
    <div className="c-combatant-details">
      <StatBlockHeader
        name={name}
        statBlockName={statBlock.Name}
        source={statBlock.Source}
        type={statBlock.Type}
        imageUrl={statBlock.ImageURL}
      />
      <div className="c-combatant-details__hp">
        <span className="stat-label">Current HP</span>
        <span>
          {currentHp}
          {DisplayHPBar && (
            <span className="combatant__hp-bar">
              <span
                className="combatant__hp-bar--filled"
                style={renderHPBarStyle(currentHPPercentage)}
              />
            </span>
          )}
        </span>
      </div>
      {tags.length > 0 && (
        <div className="c-combatant-details__tags">
          <span className="stat-label">Tags</span>{" "}
          <span className="stat-value">
            {tags.map((tag, index) => (
              <React.Fragment key={index}>
                <TagDetails tag={tag} />
              </React.Fragment>
            ))}
          </span>
        </div>
      )}
      {props.displayMode !== "status-only" && (
        <StatBlockComponent
          statBlock={statBlock}
          displayMode={props.displayMode}
          hideName
        />
      )}
      {renderedNotes && (
        <div className="c-combatant-details__notes">{renderedNotes}</div>
      )}
    </div>
  );
}

function TagDetails(props: { tag: Tag }) {
  const durationRemaining = useSubscription(props.tag.DurationRemaining);
  const details = GetTagDetails(props.tag, durationRemaining);

  return (
    <span className="stat-value__item">
      {props.tag.Text}
      {details.length > 0 && (
        <>
          {" ("}
          {details.map((detail, index) => (
            <React.Fragment key={index}>
              {index > 0 && ", "}
              {detail.Type == "save" ? (
                <TagSaveDetails tag={props.tag} />
              ) : (
                detail.Text
              )}
            </React.Fragment>
          ))}
          {`)`}
        </>
      )}
    </span>
  );
}

function TagSaveDetails(props: { tag: Tag }) {
  const TextEnricher = useContext(TextEnricherContext);
  const save = props.tag.Save;
  const ability = save.Ability.toUpperCase();
  const modifier = GetSavingThrowModifier(
    props.tag.Combatant.StatBlock(),
    save.Ability,
    props.tag.Combatant.Encounter.Rules
  ).Modifier;
  const tooltip = GetTagSaveRollTooltip(save.Ability);

  return (
    <Tippy content={tooltip}>
      {TextEnricher.EnrichRollableText(
        GetTagSaveLabel(save),
        toModifierString(modifier),
        `Roll ${ability} save`
      )}
    </Tippy>
  );
}

interface TagDetail {
  Type: "duration" | "save";
  Text: string;
}

function GetTagDetails(tag: Tag, durationRemaining: number): TagDetail[] {
  const details: TagDetail[] = [];
  if (tag.HasDuration) {
    details.push({
      Type: "duration",
      Text: `${durationRemaining} more rounds`
    });
  }
  if (tag.Save) {
    details.push({
      Type: "save",
      Text: GetTagSaveLabel(tag.Save)
    });
  }
  return details;
}

/** Formats a tag's timer and save metadata for the selected-combatant panel. */
export function FormatTagDetails(tag: Tag, durationRemaining: number): string {
  const details = GetTagDetails(tag, durationRemaining).map(
    detail => detail.Text
  );

  return details.length > 0 ? `${tag.Text} (${details.join(", ")})` : tag.Text;
}
function renderHPBarStyle(currentHPPercentage) {
  return { width: currentHPPercentage };
}
