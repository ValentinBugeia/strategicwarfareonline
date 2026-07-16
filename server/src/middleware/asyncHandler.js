// Express 4 does not forward rejected promises from async route handlers
// to the error middleware - without this wrapper a DB failure would leave
// the request hanging forever instead of returning a 500.
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
