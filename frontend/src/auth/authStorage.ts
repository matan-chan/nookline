const KEY = "nookline_auth_token";

export const getStoredToken = () => localStorage.getItem(KEY);

export const setStoredToken = (t: string | null) => {
  if (t == null) localStorage.removeItem(KEY);
  else localStorage.setItem(KEY, t);
};

export const buildAuthHeader = (token: string | null): Record<string, string> =>
  token == null || token.length === 0 ? {} : { Authorization: `Bearer ${token}` };
