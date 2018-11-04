const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.get('Authorization');
  if (!authHeader || authHeader.split(' ').length !== 2) {
    req.isAuth = false;
    return next();
  }
  const [_, token] = req.get('Authorization').split(' ');
  let decodedToken = jwt.verify(token, 'secret');
  if (!decodedToken) {
    req.isAuth = false;
    return next();
  }
  req.userId = decodedToken.userId;
  req.isAuth = true;
  next();
};
