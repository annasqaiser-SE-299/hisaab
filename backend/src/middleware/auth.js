const { AppError } = require('./errors');
const { verifyToken } = require('../services/auth');
const { getMember } = require('../services/members');

function requireAuth(req, res, next) {
  const [scheme, token] = (req.get('Authorization') || '').split(' ');
  const memberId = scheme === 'Bearer' && token ? verifyToken(token) : null;
  const member = memberId && getMember(memberId);
  if (!member) {
    throw new AppError(401, 'UNAUTHORIZED', 'Please sign in again.');
  }
  req.member = member;
  next();
}

module.exports = requireAuth;
