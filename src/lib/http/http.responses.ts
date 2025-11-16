/**
 * src/lib/http/http.responses.ts
 *
 * RFC 7807 compliant response helpers
 */

/**
 * 200 Success response
 */
export function successResponse<T>(data: T, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

/**
 * 201 Created response
 */
export function createdResponse<T>(data: T, location?: string, init?: ResponseInit): Response {
  const headers: HeadersInit = {
    "content-type": "application/json",
    ...(init?.headers ?? {}),
  };
  if (location) {
    headers.location = location;
  }
  return new Response(JSON.stringify(data), {
    status: 201,
    ...init,
    headers,
  });
}

/**
 * 204 No Content response
 */
export function noContentResponse(init?: ResponseInit): Response {
  return new Response(null, {
    status: 204,
    ...init,
    headers: {
      ...(init?.headers ?? {}),
    },
  });
}
