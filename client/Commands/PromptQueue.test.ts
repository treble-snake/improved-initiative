import { PromptQueue } from "./PromptQueue";
import { PromptProps } from "../Prompts/PendingPrompts";

function MockPrompt(): PromptProps<Record<string, never>> {
  return {
    autoFocusSelector: "",
    children: null,
    initialValues: {},
    onSubmit: jest.fn(() => true)
  };
}

describe("PromptQueue", () => {
  it("Can list prompts", () => {
    const promptQueue = new PromptQueue();
    const prompt = MockPrompt();
    promptQueue.Add(prompt);
    expect(promptQueue.GetPrompts()[0][0]).toBe(prompt);
  });

  it("Does not call onSubmit when dismissing a prompt", () => {
    const promptQueue = new PromptQueue();
    const prompt = MockPrompt();
    const promptId = promptQueue.Add(prompt);
    promptQueue.Remove(promptId);
    expect(prompt.onSubmit).not.toHaveBeenCalled();
  });

  it("Calls an optional dismissal callback exactly once", () => {
    const promptQueue = new PromptQueue();
    const onDismiss = jest.fn();
    const prompt = { ...MockPrompt(), onDismiss };
    const promptId = promptQueue.Add(prompt);

    promptQueue.Remove(promptId);
    promptQueue.Remove(promptId);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
