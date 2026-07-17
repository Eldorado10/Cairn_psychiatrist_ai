export type CrisisCategory =
  | "self-harm"
  | "harm-to-others"
  | "acute-crisis";

export type CrisisKeywordRule = {
  id: string;
  category: CrisisCategory;
  pattern: RegExp;
};

export type CrisisKeywordResult =
  | { crisis: false }
  | {
      crisis: true;
      category: CrisisCategory;
      ruleId: string;
      matchedText: string;
    };

// Keep rules specific enough to review, but broad enough that slang and common
// phrasing still trigger. A false positive displays support; a false negative
// can withhold it when it matters most.
export const CRISIS_KEYWORD_RULES: readonly CrisisKeywordRule[] = [
  {
    id: "self-harm-direct-action",
    category: "self-harm",
    pattern:
      /\b(?:kill|hurt|harm|cut|stab|shoot|poison|hang|drown|burn)\s+(?:myself|me)\b/i,
  },
  {
    id: "self-harm-life-ending",
    category: "self-harm",
    pattern: /\b(?:end|take)\s+my\s+(?:own\s+)?life\b/i,
  },
  {
    id: "self-harm-suicidal-language",
    category: "self-harm",
    pattern: /\b(?:suicide|suicidal|suicidal thoughts?)\b/i,
  },
  {
    id: "self-harm-desire-or-plan",
    category: "self-harm",
    pattern:
      /\b(?:want|wish|need|plan|intend|going|trying|tried)\s+to\s+(?:die|kill myself|end my life)\b/i,
  },
  {
    id: "self-harm-no-wish-to-live",
    category: "self-harm",
    pattern:
      /\b(?:do not|don't|dont|no longer)\s+want\s+to\s+(?:live|be alive)\b/i,
  },
  {
    id: "self-harm-death-wish",
    category: "self-harm",
    pattern: /\b(?:wish|hope)\s+i\s+(?:was|were)\s+dead\b/i,
  },
  {
    id: "self-harm-better-off-dead",
    category: "self-harm",
    pattern:
      /\b(?:everyone|they|you|my family)?\s*(?:would be|will be|are)?\s*better off\s+(?:without me|if i (?:was|were) dead)\b/i,
  },
  {
    id: "self-harm-method-access",
    category: "self-harm",
    pattern:
      /\b(?:overdose|take all (?:my|the) pills|suicide plan|method to (?:die|kill myself))\b/i,
  },
  {
    id: "harm-others-direct-action",
    category: "harm-to-others",
    pattern:
      /\b(?:kill|hurt|harm|attack|stab|shoot|poison|strangle|beat)\s+(?:him|her|them|someone|somebody|people|another person|a person|my (?:partner|wife|husband|child|children|boss|coworker|colleague))\b/i,
  },
  {
    id: "harm-others-mass-violence",
    category: "harm-to-others",
    pattern: /\b(?:shoot up|blow up)\s+(?:the |a |my )?(?:school|office|workplace|building|place)\b/i,
  },
  {
    id: "acute-cannot-stay-safe",
    category: "acute-crisis",
    pattern:
      /\b(?:cannot|can't|cant)\s+(?:keep myself safe|stay safe|go on|take it anymore)\b/i,
  },
  {
    id: "acute-no-reason-to-live",
    category: "acute-crisis",
    pattern: /\b(?:there is|there's|theres|i have)\s+no reason\s+(?:for me\s+)?to live\b/i,
  },
  {
    id: "acute-immediate-danger",
    category: "acute-crisis",
    pattern:
      /\b(?:i am|i'm|im)\s+(?:in immediate danger|not safe right now|about to lose control)\b/i,
  },
  {
    id: "acute-final-goodbye",
    category: "acute-crisis",
    pattern:
      /\b(?:this is (?:my )?(?:final )?goodbye|goodbye everyone|this is the end for me)\b/i,
  },
] as const;

const CLEAR_NEGATION_PATTERNS: readonly RegExp[] = [
  /\b(?:i\s+)?(?:would|will|could)\s+never\s+(?:kill|hurt|harm|cut|stab|shoot|poison|attack)\b/i,
  /\b(?:i\s+)?(?:am|i'm|im)\s+not\s+suicidal\b/i,
  /\b(?:i\s+)?(?:am|i'm|im)\s+not\s+(?:going to|planning to|intending to)\s+(?:kill|hurt|harm|cut|stab|shoot|attack)\b/i,
  /\b(?:i\s+)?(?:do not|don't|dont)\s+(?:plan|intend)\s+to\s+(?:kill|hurt|harm|cut|stab|shoot|attack)\b/i,
  /\b(?:i\s+)?have\s+no\s+(?:plan|plans|intention|intent|thoughts?)(?:\s+or\s+(?:plan|plans|intention|intent|thoughts?))?\s+(?:to|of)?\s*(?:kill|hurt|harm|cut|stab|shoot|attack)?\b/i,
  /\b(?:i\s+)?(?:have\s+)?no\s+(?:plan|plans|intention|intent|thoughts?)\s+(?:to|of)\s+(?:kill|hurt|harm|cut|stab|shoot|attack)\b/i,
  /\b(?:i\s+)?(?:do not|don't|dont|never)\s+want\s+to\s+die\b/i,
];

const RESOLVED_PAST_PATTERNS: readonly RegExp[] = [
  /\bused to\b/i,
  /\b(?:was|felt)\s+suicidal\b.{0,40}\b(?:years? ago|in the past|not anymore|no longer|safe now)\b/i,
  /\b(?:suicidal|wanted to die|wanted to kill myself)\b.{0,30}\b(?:years? ago|in the past)\b/i,
];

function isClearlyNegatedOrPast(clause: string) {
  return (
    CLEAR_NEGATION_PATTERNS.some((pattern) => pattern.test(clause)) ||
    RESOLVED_PAST_PATTERNS.some((pattern) => pattern.test(clause))
  );
}

function clauses(message: string) {
  return message
    .normalize("NFKC")
    .split(/[.!?;\n]+|\b(?:but|however|although|though|yet|and)\b/i)
    .map((clause) => clause.trim())
    .filter(Boolean);
}

export function checkCrisisKeywords(message: string): CrisisKeywordResult {
  for (const clause of clauses(message)) {
    for (const rule of CRISIS_KEYWORD_RULES) {
      const match = clause.match(rule.pattern);

      if (!match || isClearlyNegatedOrPast(clause)) {
        continue;
      }

      return {
        crisis: true,
        category: rule.category,
        ruleId: rule.id,
        matchedText: match[0],
      };
    }
  }

  return { crisis: false };
}
