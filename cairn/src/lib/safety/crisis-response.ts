import "server-only";

import {
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import type { CairnUIMessage, CrisisNotice } from "./types";

export function createCrisisResponse(notice: CrisisNotice) {
  const stream = createUIMessageStream<CairnUIMessage>({
    execute({ writer }) {
      writer.write({ type: "start" });
      writer.write({
        type: "data-crisis",
        data: notice,
        transient: true,
      });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });

  return createUIMessageStreamResponse({ stream });
}
