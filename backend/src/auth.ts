import { createRemoteJWKSet, jwtVerify, JWTVerifyGetKey } from "jose";

// Public values of the wallwars.net Auth0 application (the frontend bundle
// has them too).
const AUTH0_DOMAIN = "dev-l7k7kmidqclptw4l.us.auth0.com";
const AUTH0_CLIENT_ID = "xhKCco1nI2npeCFC1Q6opf2mHmtKjwDG";

// Returns a function that checks an Auth0 ID token (signature, issuer,
// audience, expiry) and gives its user id (sub), or null if the token is not
// valid. The keys are a parameter so that tests can use their own.
export function idTokenVerifier(keys: JWTVerifyGetKey) {
  return async function (idToken: unknown): Promise<string | null> {
    if (typeof idToken !== "string" || idToken === "") return null;
    try {
      const { payload } = await jwtVerify(idToken, keys, {
        issuer: `https://${AUTH0_DOMAIN}/`,
        audience: AUTH0_CLIENT_ID,
        algorithms: ["RS256"],
        clockTolerance: 60,
      });
      if (typeof payload.sub !== "string" || payload.sub === "") return null;
      return payload.sub;
    } catch (err) {
      console.error(`ID token refused: ${(err as Error).message}`);
      return null;
    }
  };
}

// The keys come from Auth0 on first use, and jose keeps them in memory.
export const verifyIdToken = idTokenVerifier(
  createRemoteJWKSet(new URL(`https://${AUTH0_DOMAIN}/.well-known/jwks.json`))
);
