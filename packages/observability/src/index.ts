export type RequestLogEntry = Readonly<{
  event: "request.completed" | "request.failed";
  requestId: string;
  service: string;
  route: string;
  status: number;
  durationMs: number;
  errorCode?: "unhandled_exception";
}>;

type RequestHandler<Arguments extends unknown[]> = (
  request: Request,
  ...arguments_: Arguments
) => Response | Promise<Response>;

type LogSink = Readonly<{
  log: (entry: RequestLogEntry) => void;
  warn: (entry: RequestLogEntry) => void;
  error: (entry: RequestLogEntry) => void;
}>;

type Dependencies = Readonly<{
  clock: () => number;
  createRequestId: () => string;
  sink: LogSink;
}>;

const SAFE_LABEL = /^[A-Za-z0-9/*:_-]{1,100}$/;
const SAFE_REQUEST_ID = /^[A-Za-z0-9-]{1,100}$/;

export function instrumentRequestHandler<Arguments extends unknown[]>(
  options: Readonly<{ service: string; route: string }>,
  handler: RequestHandler<Arguments>,
  dependencies: Partial<Dependencies> = {},
): RequestHandler<Arguments> {
  assertSafeLabel("service", options.service);
  assertSafeLabel("route", options.route);

  const clock = dependencies.clock ?? (() => performance.now());
  const createRequestId =
    dependencies.createRequestId ?? (() => crypto.randomUUID());
  const sink = dependencies.sink ?? console;

  return async (request, ...arguments_) => {
    const startedAt = clock();
    const rayId = request.headers.get("cf-ray");
    const requestId =
      rayId && SAFE_REQUEST_ID.test(rayId) ? rayId : createRequestId();

    try {
      const response = await handler(request, ...arguments_);
      writeLog(
        {
          event: "request.completed",
          requestId,
          service: options.service,
          route: options.route,
          status: response.status,
          durationMs: duration(startedAt, clock()),
        },
        sink,
      );
      return response;
    } catch {
      writeLog(
        {
          event: "request.failed",
          requestId,
          service: options.service,
          route: options.route,
          status: 500,
          durationMs: duration(startedAt, clock()),
          errorCode: "unhandled_exception",
        },
        sink,
      );
      return Response.json(
        { error: "internal_error" },
        { status: 500, headers: { "cache-control": "no-store" } },
      );
    }
  };
}

function assertSafeLabel(name: string, value: string): void {
  if (!SAFE_LABEL.test(value)) {
    throw new Error(`${name} must be a static observability label`);
  }
}

function duration(startedAt: number, completedAt: number): number {
  return Math.max(0, Math.round(completedAt - startedAt));
}

function writeLog(entry: RequestLogEntry, sink: LogSink): void {
  if (entry.status >= 500) {
    sink.error(entry);
  } else if (entry.status >= 400) {
    sink.warn(entry);
  } else {
    sink.log(entry);
  }
}
