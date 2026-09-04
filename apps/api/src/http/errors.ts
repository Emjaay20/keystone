export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code: string
  ) {
    super(message);
  }
}

export const errors = {
  unauthorized: (message = "Authentication required") =>
    new HttpError(401, message, "unauthorized"),
  forbidden: (message = "Not allowed") => new HttpError(403, message, "forbidden"),
  notFound: (message = "Not found") => new HttpError(404, message, "not_found"),
  conflict: (message = "Conflict") => new HttpError(409, message, "conflict"),
  badRequest: (message = "Bad request") => new HttpError(400, message, "bad_request")
};
