export const auth0Prefix = "auth0|";
import { uniqueNamesGenerator, names } from "unique-names-generator";

export function isGuest(idToken: string) {
  return idToken.substring(0, auth0Prefix.length) !== auth0Prefix;
}

export function randPlayerName(): string {
  return uniqueNamesGenerator({
    dictionaries: [names],
    length: 1,
  }).slice(0, 10);
}
