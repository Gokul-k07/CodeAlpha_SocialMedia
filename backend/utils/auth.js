export const getLoginIdentifier = (body = {}) => {
  const { email, username, identifier } = body;
  return identifier || email || username || '';
};

export const getTokenFromRequest = (req) => {
  const bearerToken = req.headers?.authorization?.split(' ')[1];
  return req.cookies?.token || bearerToken || null;
};
