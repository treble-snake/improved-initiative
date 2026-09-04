import { render } from "@testing-library/react";
import * as React from "react";

import { RolledDieChip } from "./DieChip";

function RenderChip(
  value: number,
  max = 6,
  isKept = false,
  isDiscarded = false
) {
  const rendered = render(
    <RolledDieChip
      value={value}
      max={max}
      isKept={isKept}
      isDiscarded={isDiscarded}
    />
  );
  return rendered.container.firstElementChild!;
}

describe("RolledDieChip", () => {
  test("marks a minimum roll", () => {
    const chip = RenderChip(1);

    expect(chip.classList).toContain("p-roll-dice-result__roll--min");
    expect(chip.classList).not.toContain("p-roll-dice-result__roll--max");
  });

  test("marks a maximum roll", () => {
    const chip = RenderChip(6);

    expect(chip.classList).toContain("p-roll-dice-result__roll--max");
    expect(chip.classList).not.toContain("p-roll-dice-result__roll--min");
  });

  test("does not mark a regular roll as a minimum or maximum", () => {
    const chip = RenderChip(3);

    expect(chip.classList).not.toContain("p-roll-dice-result__roll--min");
    expect(chip.classList).not.toContain("p-roll-dice-result__roll--max");
  });

  test("marks the roll selected by the active mode", () => {
    expect(RenderChip(4, 20, true).classList).toContain(
      "p-roll-dice-result__roll--kept"
    );
  });

  test("marks the roll discarded by the active mode", () => {
    expect(RenderChip(4, 20, false, true).classList).toContain(
      "p-roll-dice-result__roll--discarded"
    );
  });
});
