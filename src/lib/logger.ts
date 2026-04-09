type LogLevel = "info" | "warn" | "error";

type LogPayload = {
  level: LogLevel;
  event: string;
  message?: string;
  requestId?: string;
  route?: string;
  method?: string;
  status?: number;
  latencyMs?: number;
  user?: string | null;
  provider?: string;
  errorCode?: string;
  details?: unknown;
};

function safeSerialize(details: unknown): unknown {
  if (!details) return undefined;
  if (details instanceof Error) {
    return {
      name: details.name,
      message: details.message,
      stack: details.stack,
    };
  }
  return details;
}

export function logEvent(payload: LogPayload) {
  const record = {
    ts: new Date().toISOString(),
    ...payload,
    details: safeSerialize(payload.details),
  };
  const line = JSON.stringify(record);

  if (payload.level === "error") {
    console.error(line);
    return;
  }
  if (payload.level === "warn") {
    console.warn(line);
    return;
  }
  console.log(line);
}

