class AppError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function notFound(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', 'That resource does not exist.'));
}

// Express recognises error middleware by its four arguments, so `next` must stay.
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }
  // Malformed or oversized JSON bodies come from express.json() as 4xx errors.
  if (err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({
      error: { code: 'VALIDATION_ERROR', message: 'The request body is not valid JSON.', details: {} },
    });
  }
  console.error(err);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on the server.', details: {} },
  });
}

module.exports = { AppError, notFound, errorHandler };
