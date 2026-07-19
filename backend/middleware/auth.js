import jwt from 'jsonwebtoken';
import { getTokenFromRequest } from '../utils/auth.js';

export const protect = (req, res, next) => {
  const token = getTokenFromRequest(req);

  if (!token) {
    return res.status(401).json({ message: 'Not authorized' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    req.user = { ...decoded, id: decoded.id || decoded._id };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};
