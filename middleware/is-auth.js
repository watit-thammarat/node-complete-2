const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  try {
    let error;
    const authHeader = req.get('Authorization');
    if (!authHeader || authHeader.split(' ').length !== 2) {
      error = new Error('Not authenticatated');
      error.statusCode = 401;
      return next(error);
    }
    const [_, token] = req.get('Authorization').split(' ');
    let decodedToken = jwt.verify(token, 'secret');
    if (!decodedToken) {
      error = new Error('Not authenticatated');
      error.statusCode = 401;
      return next(error);
    }
    req.userId = decodedToken.userId;
    next();
  } catch (err) {
    err.statusCode = 500;
    next(err);
  }
};
