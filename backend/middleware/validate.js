const { validationResult } = require('express-validator');

// Runs after express-validator check() chains; returns 422 with details if any failed
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ error: 'Validation failed', details: errors.array() });
  }
  next();
}

module.exports = validate;
