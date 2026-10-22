import * as _ from "lodash";
import * as React from "react";

import Tippy from "@tippyjs/react";
import { Field, FieldProps } from "formik";
import { TagSaveState } from "../../common/CombatantState";
import { DurationTiming } from "../../common/DurationTiming";
import { AbilityName, StatBlock } from "../../common/StatBlock";
import { Combatant } from "../Combatant/Combatant";
import { EndOfTurn, StartOfTurn, Tag } from "../Combatant/Tag";
import { linkComponentToObservables } from "../Combatant/linkComponentToObservables";
import { Button, SubmitButton } from "../Components/Button";
import { Encounter } from "../Encounter/Encounter";
import { Conditions2025 } from "../Rules/Conditions";
import { EnumToggle } from "../StatBlockEditor/EnumToggle";
import { AutocompleteTextInput } from "../StatBlockEditor/components/AutocompleteTextInput";
import { Metrics } from "../Utility/Metrics";
import { PromptProps } from "./PendingPrompts";

interface TagPromptProps {
  targetDisplayNames: string;
  combatantNamesById: { [id: string]: string };
  encounterIsActive: () => boolean;
}

interface TagPromptState {
  advancedMode: boolean;
}

export class TagPromptComponent extends React.Component<
  TagPromptProps,
  TagPromptState
> {
  constructor(props) {
    super(props);
    this.state = {
      advancedMode: false
    };
    linkComponentToObservables(this);
  }

  public render() {
    const encounterIsActive = this.props.encounterIsActive();
    const autoCompleteOptions = _.keys(Conditions2025).concat(
      _.values(this.props.combatantNamesById)
    );
    return (
      <>
        <div className="add-tag">
          <div className="add-tag__main">
            <label className="add-tag__label" htmlFor="tagText">
              Add a tag to {this.props.targetDisplayNames}
            </label>
            <AutocompleteTextInput
              fieldName="tagText"
              options={autoCompleteOptions}
              autoFocus
            />
            <Field name="tagHidden">
              {(fieldApi: FieldProps) => {
                const isHidden = fieldApi.field.value === true;
                const actionText = isHidden
                  ? "Show tag in Player View"
                  : "Hide tag from Player View";
                const icon = isHidden ? "eye-slash" : "eye";
                return (
                  <Button
                    dataTestId="tag-visibility-toggle"
                    fontAwesomeIcon={icon}
                    tooltip={actionText}
                    onClick={() =>
                      fieldApi.form.setFieldValue(
                        fieldApi.field.name,
                        !isHidden
                      )
                    }
                  />
                );
              }}
            </Field>
            {/* This legacy field now controls the combined Timer and Saves UI. */}
            <Field name="useDuration">
              {(fieldApi: FieldProps) => {
                const automationEnabled =
                  fieldApi.form.values.useDuration ||
                  fieldApi.form.values.useSave;
                return (
                  <Button
                    additionalClassNames={`add-tag__automation-button${
                      automationEnabled ? " add-tag__automation-enabled" : ""
                    }`}
                    dataTestId="tag-automation-toggle"
                    fontAwesomeIcon="hourglass"
                    tooltip="Timer and Saves"
                    onClick={() => this.toggleAdvanced(fieldApi)}
                  />
                );
              }}
            </Field>
            <SubmitButton tooltip="Add tag" />
          </div>
          {this.state.advancedMode &&
            this.renderAdvancedFields(encounterIsActive)}
        </div>
      </>
    );
  }

  private toggleAdvanced = (fieldApi: FieldProps) => {
    const toggledMode = !this.state.advancedMode;
    if (toggledMode) {
      fieldApi.form.setFieldValue("useDuration", true);
    } else {
      // Closing the section retains the legacy meaning: submit a plain tag,
      // regardless of which automation controls were previously enabled.
      fieldApi.form.setFieldValue("useDuration", false);
      fieldApi.form.setFieldValue("useSave", false);
    }
    this.setState({ advancedMode: toggledMode });
  };

  private renderAdvancedFields = (encounterIsActive: boolean) => {
    if (!encounterIsActive) {
      return (
        <div className="add-tag__advanced">
          Start Encounter to enable tag timers and saves.
        </div>
      );
    }

    return (
      <Field>
        {(fieldApi: FieldProps) => (
          <div className="add-tag__advanced">
            {this.renderTimerRow(fieldApi)}
            {this.renderSaveRow(fieldApi)}
          </div>
        )}
      </Field>
    );
  };

  private renderTimerRow = (fieldApi: FieldProps) => {
    const enabled = fieldApi.form.values.useDuration;
    return (
      <div
        className={`add-tag__automation-row${enabled ? "" : " is-disabled"}`}
      >
        <AutomationToggle
          fieldName="useDuration"
          testId="tag-timer-toggle"
          tooltipLabel="timer"
        />
        <div className="add-tag__automation-controls">
          ...until
          <EnumToggle
            fieldName="tagTiming"
            disabled={!enabled}
            labelsByOption={{
              [StartOfTurn]: "start of",
              [EndOfTurn]: "end of"
            }}
            tooltipsByOption={{
              [StartOfTurn]:
                "Timer expires at start of selected combatant's turn",
              [EndOfTurn]: "Timer expires at end of selected combatant's turn"
            }}
          />
          <ControlTooltip content="Choose whose turn advances the timer">
            <Field component="select" name="tagTimingId" disabled={!enabled}>
              {this.renderCombatantOptions()}
            </Field>
          </ControlTooltip>
          's turn in{" "}
          <ControlTooltip content="Rounds until the tag expires">
            <Field
              type="number"
              name="tagDuration"
              min={1}
              step={1}
              required={enabled}
              disabled={!enabled}
            />
          </ControlTooltip>{" "}
          round
        </div>
      </div>
    );
  };

  private renderSaveRow = (fieldApi: FieldProps) => {
    const enabled = fieldApi.form.values.useSave;
    return (
      <div
        className={`add-tag__automation-row${enabled ? "" : " is-disabled"}`}
      >
        <AutomationToggle
          fieldName="useSave"
          testId="tag-save-toggle"
          tooltipLabel="saving throw"
        />
        <div className="add-tag__automation-controls">
          <ControlTooltip content="Ability used for the saving throw">
            <Field
              className="add-tag__save-ability"
              component="select"
              name="saveAbility"
              required={enabled}
              disabled={!enabled}
            >
              {StatBlock.AbilityNames.map(ability => (
                <option key={ability} value={ability}>
                  {ability.toUpperCase()}
                </option>
              ))}
            </Field>
          </ControlTooltip>{" "}
          save DC{" "}
          <ControlTooltip content="Minimum save total needed to remove the tag">
            <Field
              type="number"
              name="saveDC"
              min={1}
              step={1}
              required={enabled}
              disabled={!enabled}
            />
          </ControlTooltip>{" "}
          at
          <EnumToggle
            fieldName="saveTiming"
            disabled={!enabled}
            labelsByOption={{
              [StartOfTurn]: "start",
              [EndOfTurn]: "end"
            }}
            tooltipsByOption={{
              [StartOfTurn]:
                "Prompt the save at start of selected combatant's turn",
              [EndOfTurn]: "Prompt the save at end of selected combatant's turn"
            }}
          />
          of
          <ControlTooltip content="Choose whose turn triggers the saving throw">
            <Field
              component="select"
              name="saveTimingCombatantId"
              required={enabled}
              disabled={!enabled}
            >
              {this.renderCombatantOptions()}
            </Field>
          </ControlTooltip>
          's turn
        </div>
      </div>
    );
  };

  private renderCombatantOptions = () =>
    _.toPairs(this.props.combatantNamesById).map(([id, name]) => (
      <option key={id} value={id}>
        {name}
      </option>
    ));
}

/** Keeps native checkbox behavior while using Font Awesome for presentation. */
function AutomationToggle(props: {
  fieldName: string;
  testId: string;
  tooltipLabel: string;
}) {
  return (
    <Field name={props.fieldName}>
      {(fieldApi: FieldProps) => (
        <Tippy
          content={`${fieldApi.field.value ? "Disable" : "Enable"} ${
            props.tooltipLabel
          }`}
          trigger="mouseenter focusin"
        >
          <label className="add-tag__automation-toggle">
            <input
              className="add-tag__automation-checkbox"
              data-testid={props.testId}
              type="checkbox"
              name={fieldApi.field.name}
              checked={Boolean(fieldApi.field.value)}
              onBlur={fieldApi.field.onBlur}
              onChange={fieldApi.field.onChange}
            />
            <span
              className={`add-tag__automation-checkbox-icon ${
                fieldApi.field.value ? "fas fa-check-square" : "far fa-square"
              }`}
            />
          </label>
        </Tippy>
      )}
    </Field>
  );
}

/** Provides a hover/focus target for form controls, including disabled ones. */
function ControlTooltip(props: {
  children: React.ReactElement;
  content: string;
}) {
  return (
    <Tippy content={props.content} trigger="mouseenter focusin">
      <span className="add-tag__control-tooltip">{props.children}</span>
    </Tippy>
  );
}

export interface TagModel {
  tagText: string;
  tagDuration?: number;
  tagTimingId?: string;
  tagTiming?: DurationTiming;
  useDuration: boolean;
  useSave: boolean;
  saveAbility?: AbilityName | "";
  saveDC?: number | "";
  saveTiming?: DurationTiming;
  saveTimingCombatantId?: string;
  tagHidden: boolean;
}

/** Creates shared host/Player View defaults with target-specific save timing. */
export function GetDefaultTagModel(
  activeCombatantId: string,
  targetCombatantId: string
): TagModel {
  return {
    tagText: "",
    tagTimingId: activeCombatantId,
    tagTiming: StartOfTurn,
    tagDuration: 1,
    useDuration: false,
    useSave: false,
    saveAbility: StatBlock.AbilityNames[0],
    saveDC: 10,
    saveTiming: EndOfTurn,
    saveTimingCombatantId: targetCombatantId,
    tagHidden: false
  };
}

export interface TagAutomation {
  Duration?: {
    Remaining: number;
    Timing: DurationTiming;
    CombatantId: string;
  };
  Save?: TagSaveState;
}

/**
 * Validates the shared host/Player View form and builds independent timer and
 * save configurations. Only timers receive the existing end-of-turn grace.
 */
export function BuildTagAutomation(
  model: TagModel,
  encounterIsActive: boolean,
  activeCombatantId: string | null,
  combatantExists: (combatantId: string) => boolean
): TagAutomation | null {
  const useDuration = encounterIsActive && model.useDuration;
  const useSave = encounterIsActive && model.useSave;
  const duration = Number(model.tagDuration);
  const saveDC = Number(model.saveDC);

  if (
    useDuration &&
    (!Number.isInteger(duration) ||
      duration < 1 ||
      !model.tagTimingId ||
      !model.tagTiming ||
      !combatantExists(model.tagTimingId))
  ) {
    return null;
  }

  if (
    useSave &&
    (StatBlock.AbilityNames.indexOf(model.saveAbility as AbilityName) === -1 ||
      !Number.isInteger(saveDC) ||
      saveDC < 1 ||
      !model.saveTiming ||
      !model.saveTimingCombatantId ||
      !combatantExists(model.saveTimingCombatantId))
  ) {
    return null;
  }

  const automation: TagAutomation = {};
  if (useDuration) {
    const graceRound =
      model.tagTimingId == activeCombatantId && model.tagTiming == EndOfTurn
        ? 1
        : 0;
    automation.Duration = {
      Remaining: duration + graceRound,
      Timing: model.tagTiming,
      CombatantId: model.tagTimingId
    };
  }

  if (useSave) {
    automation.Save = {
      Ability: model.saveAbility as AbilityName,
      DC: saveDC,
      Timing: model.saveTiming,
      CombatantId: model.saveTimingCombatantId
    };
  }

  return automation;
}

export function TagPrompt(
  encounter: Encounter,
  targetCombatants: Combatant[],
  logEvent: (message: string) => void
): PromptProps<TagModel> {
  const activeCombatantId = encounter.EncounterFlow.ActiveCombatant()
    ? encounter.EncounterFlow.ActiveCombatant().Id
    : "";
  const combatantsById = _.keyBy(encounter.Combatants(), c => c.Id);
  const combatantNamesById = _.mapValues(combatantsById, c => c.DisplayName());
  const defaultSaveCombatantId = targetCombatants[0]?.Id ?? activeCombatantId;

  return {
    initialValues: GetDefaultTagModel(
      activeCombatantId,
      defaultSaveCombatantId
    ),
    children: (
      <TagPromptComponent
        combatantNamesById={combatantNamesById}
        targetDisplayNames={targetCombatants
          .map(t => t.DisplayName())
          .join(", ")}
        encounterIsActive={() => encounter.EncounterFlow.State() == "active"}
      />
    ),
    onSubmit: (model: TagModel) => {
      if (model.tagText.length == 0) {
        return true;
      }

      const encounterIsActive = encounter.EncounterFlow.State() == "active";
      const automation = BuildTagAutomation(
        model,
        encounterIsActive,
        encounter.EncounterFlow.ActiveCombatant()?.Id ?? null,
        combatantId => encounter.Combatants().some(c => c.Id == combatantId)
      );
      if (automation === null) {
        return false;
      }

      for (const combatant of targetCombatants) {
        const tag = new Tag(
          model.tagText,
          combatant,
          model.tagHidden,
          automation.Duration?.Remaining ?? -1,
          automation.Duration?.Timing ?? StartOfTurn,
          automation.Duration?.CombatantId ?? "",
          automation.Save
        );
        tag.Add();
        if (tag.HasDuration) {
          Metrics.TrackEvent(Metrics.Event.TagAdded, {
            text: tag.Text,
            duration: tag.DurationRemaining()
          });
        } else {
          Metrics.TrackEvent(Metrics.Event.TagAdded, { text: tag.Text });
        }
      }

      logEvent(
        `Added "${model.tagText}" tag to ${targetCombatants
          .map(c => c.DisplayName())
          .join(", ")}`
      );

      return true;
    },
    autoFocusSelector: "input"
  };
}
