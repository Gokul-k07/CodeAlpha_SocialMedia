export const attachPostCount = (user, postCount = 0) => ({
  ...user,
  postCount,
});
