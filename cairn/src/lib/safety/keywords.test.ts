import { describe, expect, it } from "vitest";
import { checkCrisisKeywords } from "./keywords";

describe("checkCrisisKeywords", () => {
  describe("true positives", () => {
    it.each([
      ["I want to kill myself", "self-harm"],
      ["I have a plan to end my life tonight", "self-harm"],
      ["There is no reason for me to live anymore", "acute-crisis"],
      ["I keep thinking everyone would be better off if I were dead", "self-harm"],
      ["I am going to cut myself", "self-harm"],
      ["I want to stab him", "harm-to-others"],
      ["I might hurt someone at work today", "harm-to-others"],
      ["I cannot keep myself safe right now", "acute-crisis"],
      ["I tried to kill myself last night", "self-harm"],
    ])("flags %s", (message, category) => {
      const result = checkCrisisKeywords(message);

      // Narrow the union before reading the crisis-only fields.
      if (!result.crisis) {
        throw new Error(`Expected a crisis result for: ${message}`);
      }

      expect(result.category).toBe(category);
      expect(result.ruleId).toBeTruthy();
    });

    it("still fires when a negated phrase is followed by a current threat", () => {
      const result = checkCrisisKeywords(
        "I would never hurt myself, but I am going to hurt them tonight",
      );

      if (!result.crisis) {
        throw new Error("Expected a crisis result for a current threat");
      }

      expect(result.category).toBe("harm-to-others");
    });

    it.each([
      "I am not suicidal and I plan to kill myself tonight",
      "I would never hurt myself and I want to hurt someone",
    ])("does not let one negated thought hide a later threat: %s", (message) => {
      expect(checkCrisisKeywords(message).crisis).toBe(true);
    });
  });

  describe("clear negation and resolved past-tense cases", () => {
    it.each([
      "I would never kill myself",
      "I am not suicidal",
      "I have no plan or intention to hurt myself",
      "I have no plan and no intention to hurt myself",
      "I used to want to die, but I do not feel that way anymore",
      "I was suicidal years ago, but I am safe now",
      "I would never hurt another person",
      "I am not going to harm them",
      "I used to feel that way",
    ])("does not flag %s", (message) => {
      expect(checkCrisisKeywords(message)).toEqual({ crisis: false });
    });
  });
});
