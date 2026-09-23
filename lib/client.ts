export class ClientError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
export async function api<T>(url: string, data?: unknown): Promise<T> {
  let response: Response;
  const multipart = data instanceof FormData;
  try {
    response = await fetch(url, {
      method: data === undefined ? "GET" : "POST",
      headers:
        data === undefined || multipart ? {} : { "Content-Type": "application/json" },
      body: data === undefined ? undefined : multipart ? data : JSON.stringify(data),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ClientError(
      "ارتباط اینترنت برقرار نیست. اتصال را بررسی کنید و دوباره تلاش کنید.",
      0,
    );
  }
  let result: { error?: string } & T;
  try {
    result = (await response.json()) as { error?: string } & T;
  } catch {
    throw new ClientError(
      "ارتباط با سرویس برقرار نشد. لطفاً دوباره تلاش کنید.",
      response.status,
    );
  }
  if (!response.ok)
    throw new ClientError(
      result.error ?? "درخواست انجام نشد.",
      response.status,
    );
  return result;
}
