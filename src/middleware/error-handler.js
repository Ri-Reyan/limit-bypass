/**
 * Centralized Express error handler.
 * Sanitizes errors and returns generic, secure responses without leaking stack traces or credentials.
 */
export function errorHandler(err, req, res, next) {
  // Handle JSON syntax error from malformed body payload
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: 'Malformed JSON in request body',
    });
  }

  // Handle request entity too large (payload limit exceeded)
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Request payload exceeds maximum allowed size (100kb)',
    });
  }

  // Handle CORS rejection
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: Origin is not permitted by CORS policy',
    });
  }

  // Sanitized server-side error logging
  console.error('[Internal Error]', {
    name: err.name,
    message: err.message,
    path: req.originalUrl,
    method: req.method,
  });

  return res.status(500).json({
    success: false,
    error: 'Failed to send email due to an upstream or internal delivery failure',
  });
}

