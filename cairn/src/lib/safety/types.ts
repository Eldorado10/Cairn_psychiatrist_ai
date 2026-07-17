import type { UIMessage } from "ai";

export type CrisisTriggerSource = "keyword" | "model";

export type CrisisNotice = {
  eventId: string | null;
  triggerSource: CrisisTriggerSource;
};

export type CairnUIData = {
  crisis: CrisisNotice;
};

export type CairnUIMessage = UIMessage<unknown, CairnUIData>;
