// Preloaded (node --require) by the tests: the server checks ID tokens against
// the test keys in TEST_JWKS instead of fetching the Auth0 keys.
const path = require("path");
const { createLocalJWKSet } = require("jose");

const auth = require(path.join(__dirname, "..", "dist", "src", "auth.js"));
auth.verifyIdToken = auth.idTokenVerifier(createLocalJWKSet(JSON.parse(process.env.TEST_JWKS)));
