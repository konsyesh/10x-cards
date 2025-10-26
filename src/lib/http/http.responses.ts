export interface FieldError {
  field: string;
  message: string;
}

export function successResponse<T>(data: T, status = 200): Response {
  const body = {
    data,
    meta: {
      timestamp: new Date().toISOString(),
      status: "success",
    },
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

export function errorResponse(args: {
  code: string; // np. "VALIDATION_ERROR"
  message: string; // np. "Walidacja parametrów nie powiodła się"
  status: number; // np. 422
  details?: FieldError[]; // np. [ { field: "source_text", message: "..."} ]
  instance?: string; // np. "/api/generations"
  hint?: string; // opcjonalnie podpowiedź dla klienta
  docs?: string; // opcjonalnie link do dokumentacji błędu
  traceId?: string; // opcjonalnie ID requestu do logów
}): Response {
  const body = {
    error: {
      code: args.code,
      message: args.message,
      details: args.details,
      httpStatus: args.status,
      instance: args.instance,
      hint: args.hint,
      docs: args.docs,
      traceId: args.traceId,
    },
    meta: {
      timestamp: new Date().toISOString(),
      status: "error",
    },
  };

  return new Response(JSON.stringify(body), {
    status: args.status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
