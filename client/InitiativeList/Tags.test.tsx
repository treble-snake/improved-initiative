import { fireEvent, render } from "@testing-library/react";
import * as React from "react";

import { TagState } from "../../common/CombatantState";
import { Tags } from "./Tags";

describe("Tags", () => {
  const saveTag: TagState = {
    Text: "Restrained",
    DurationRemaining: -1,
    DurationTiming: "StartOfTurn",
    DurationCombatantId: "",
    Save: {
      Ability: "Dex",
      DC: 14,
      Timing: "EndOfTurn",
      CombatantId: "goblin-2"
    }
  };

  test("shows a d20 with the save schedule", async () => {
    const view = render(
      <Tags
        tags={[saveTag]}
        combatantId="target"
        combatantNamesById={{ "goblin-2": "Goblin 2" }}
      />
    );
    const tooltip = "DEX save DC 14 at end of Goblin 2's turn";
    const saveIcon = view.getByLabelText(tooltip);

    expect(saveIcon.classList).toContain("fa-dice-d20");
    expect(saveIcon.textContent).toBe("14");
    expect(view.container.querySelector(".fa-hourglass")).toBeNull();

    fireEvent.mouseEnter(saveIcon);
    expect(await view.findByText(tooltip)).toBeTruthy();

    const removeButton = view.getByRole("button", {
      name: "Remove Restrained"
    });
    fireEvent.mouseEnter(removeButton);
    expect(await view.findByText("Remove Restrained")).toBeTruthy();
  });

  test("shows timer and save indicators together", () => {
    const view = render(
      <Tags
        tags={[
          {
            ...saveTag,
            DurationRemaining: 2,
            DurationTiming: "StartOfTurn",
            DurationCombatantId: "goblin-2"
          }
        ]}
        combatantId="target"
        combatantNamesById={{ "goblin-2": "Goblin 2" }}
      />
    );

    expect(view.container.querySelector(".fa-hourglass")).toBeTruthy();
    expect(view.container.querySelector(".fa-dice-d20")).toBeTruthy();
  });

  test("uses a safe label when the timing combatant is unavailable", () => {
    const view = render(
      <Tags tags={[saveTag]} combatantId="target" combatantNamesById={{}} />
    );

    expect(
      view.getByLabelText("DEX save DC 14 at end of Unknown combatant's turn")
    ).toBeTruthy();
  });

  test("updates the tooltip when a timing combatant is renamed", () => {
    const view = render(
      <Tags
        tags={[saveTag]}
        combatantId="target"
        combatantNamesById={{ "goblin-2": "Goblin 2" }}
      />
    );

    view.rerender(
      <Tags
        tags={[saveTag]}
        combatantId="target"
        combatantNamesById={{ "goblin-2": "Snaggle" }}
      />
    );

    expect(
      view.getByLabelText("DEX save DC 14 at end of Snaggle's turn")
    ).toBeTruthy();
    expect(
      view.queryByLabelText("DEX save DC 14 at end of Goblin 2's turn")
    ).toBeNull();
  });
});
