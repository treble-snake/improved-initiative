import { Formik, FormikProps } from "formik";
import * as React from "react";
import { TagState } from "../../../common/CombatantState";
import { PlayerViewCombatantState } from "../../../common/PlayerViewCombatantState";
import {
  BuildTagAutomation,
  GetDefaultTagModel,
  TagModel,
  TagPromptComponent
} from "../../Prompts/TagPrompt";

export class TagSuggestor extends React.Component<TagSuggestorProps> {
  public render() {
    return (
      <Formik
        initialValues={GetDefaultTagModel(
          this.props.activeCombatantId ?? "",
          this.props.targetCombatant.Id
        )}
        onSubmit={model => {
          this.applyTag(model);
        }}
      >
        {(props: FormikProps<any>) => (
          <form className="tag-suggestion" onSubmit={props.handleSubmit}>
            <TagPromptComponent
              targetDisplayNames={this.props.targetCombatant.Name}
              combatantNamesById={this.props.combatantNamesById}
              encounterIsActive={() => this.props.activeCombatantId != null}
            />
          </form>
        )}
      </Formik>
    );
  }

  private applyTag = (model: TagModel) => {
    if (model.tagText.length == 0) {
      return true;
    }

    const automation = BuildTagAutomation(
      model,
      this.props.activeCombatantId != null,
      this.props.activeCombatantId,
      combatantId =>
        Object.prototype.hasOwnProperty.call(
          this.props.combatantNamesById,
          combatantId
        )
    );
    if (automation === null) {
      return false;
    }

    const tagState: TagState = {
      Text: model.tagText,
      DurationCombatantId: automation.Duration?.CombatantId ?? "",
      DurationRemaining: automation.Duration?.Remaining ?? 0,
      DurationTiming: automation.Duration?.Timing ?? null
    };
    if (automation.Save) {
      tagState.Save = automation.Save;
    }

    this.props.onApply(tagState);
    return true;
  };
}

export type ApplyTagCallback = (tagState: TagState) => void;

interface TagSuggestorProps {
  targetCombatant: PlayerViewCombatantState;
  activeCombatantId: string | null;
  combatantNamesById: { [combatantId: string]: string };
  onApply: ApplyTagCallback;
}
