export function isGuest(idToken: string): boolean {
  return idToken.substring(0, 6) !== "Auth0|";
}
