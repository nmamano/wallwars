export const auth0Prefix = "Auth0|";

export function isGuest(idToken: string) {
  return idToken.substring(0, auth0Prefix.length) !== auth0Prefix;
}
