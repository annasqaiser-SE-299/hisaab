const { AppError } = require('./errors');

// Replaces req[source] with the parsed value, so handlers only see clean data.
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source] ?? {});
    if (!result.success) {
      const issues = result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
      throw new AppError(400, 'VALIDATION_ERROR', issues[0].message, { issues });
    }
    req[source] = result.data;
    next();
  };
}

module.exports = validate;
