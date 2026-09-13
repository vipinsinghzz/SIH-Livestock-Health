const errorHandler = (err, req, res, next) => {
  console.error('[Error Middleware]:', err.stack || err.message);

  let error = { ...err };
  error.message = err.message;

  // Mongoose Bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id ${err.value}`;
    return res.status(404).json({ success: false, message });
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    const message = `Duplicate value entered for '${field}'. Please provide a unique value.`;
    return res.status(400).json({ success: false, message });
  }

  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({ success: false, message: messages.join(', ') });
  }

  // CORS rejection
  if (err.message && err.message.startsWith('CORS policy rejection')) {
    return res.status(403).json({
      success: false,
      message: err.message
    });
  }

  const statusCode = error.statusCode || 500;
  const clientMessage = (process.env.NODE_ENV === 'production' && statusCode >= 500)
    ? 'Internal Server Error'
    : (error.message || 'Internal Server Error');

  res.status(statusCode).json({
    success: false,
    message: clientMessage
  });
};

module.exports = errorHandler;
