import { DiceRoll, RollMode, RollModes } from "./Dice";

//Taken from http://codereview.stackexchange.com/a/40996
const DICE_EXPRESSION_PATTERN =
  /(\d+)d(\d+)[\s]*([+-][\s]*\d+)?|([+-][\s]*\d+)/;
const ADV_PREFIX = "adv:";
const DIS_PREFIX = "dis:";

export const GlobalDicePattern =
  /(\d+d\d+(?:[\s]*[+-][\s]*\d+)?|[+-][\s]*\d+)/g;

export const isValidDiceExpression = (source: string): boolean =>
  DICE_EXPRESSION_PATTERN.test(source);

export const rollExpression = (source: string): DiceRoll => {
  let mode: RollMode | undefined;
  let expression = source.trim();

  if (expression.startsWith(ADV_PREFIX)) {
    mode = RollModes.Advantage;
    expression = expression.slice(ADV_PREFIX.length).trimStart();
  } else if (expression.startsWith(DIS_PREFIX)) {
    mode = RollModes.Disadvantage;
    expression = expression.slice(DIS_PREFIX.length).trimStart();
  }

  const match = DICE_EXPRESSION_PATTERN.exec(expression);
  if (!match) {
    throw new Error(`Invalid dice notation: ${source}`);
  }

  const isLooseModifier = typeof match[4] === "string";
  let diceCount = isLooseModifier ? 1 : parseInt(match[1]);
  let dieSize = isLooseModifier ? 20 : parseInt(match[2]);
  if (mode !== undefined) {
    diceCount = 1;
    dieSize = 20;
  }

  let modifier = 0;
  if (isLooseModifier) {
    modifier = parseInt(match[4].replace(/\s/g, ""));
  } else if (typeof match[3] !== "undefined") {
    modifier = parseInt(match[3].replace(/\s/g, ""));
  }

  return new DiceRoll(diceCount, dieSize, modifier, mode);
};

export const toExpression = (roll: DiceRoll): string => {
  let prefix = "";
  if (roll.Mode !== undefined) {
    prefix = roll.Mode === RollModes.Advantage ? ADV_PREFIX : DIS_PREFIX;
  }
  const mod = roll.ModifierText.replaceAll(" ", "");
  return `${prefix}${roll.DiceCount}d${roll.DieSize}${mod}`;
};
