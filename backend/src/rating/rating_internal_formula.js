// Taken from https://www.npmjs.com/package/glicko-two and converted to js.

var Outcome;
(function (Outcome) {
  Outcome[(Outcome["Win"] = 1)] = "Win";
  Outcome[(Outcome["Loss"] = 0)] = "Loss";
  Outcome[(Outcome["Tie"] = 0.5)] = "Tie";
})(Outcome || (Outcome = {}));

class Player {
  constructor({
    defaultRating,
    opponentRatingDeviations,
    opponentRatings,
    outcomes,
    rating,
    ratingDeviation,
    tau,
    volatility,
  }) {
    this._opponentRatingDeviations = [];
    this._opponentRatings = [];
    this._outcomes = [];
    this.tau = tau;
    this.defaultRating = defaultRating;
    this._rating = (rating - defaultRating) / Player.scalingFactor;
    this._ratingDeviation = ratingDeviation / Player.scalingFactor;
    this._volatility = volatility;
    if (
      Array.isArray(opponentRatingDeviations) ||
      Array.isArray(opponentRatings) ||
      Array.isArray(outcomes)
    ) {
      if (
        (outcomes || []).length !== (opponentRatings || []).length ||
        (outcomes || []).length !== (opponentRatingDeviations || []).length
      ) {
        throw new Error(
          "opponentRatingDeviations, opponentRatings, outcomes must be of equal size"
        );
      }
      this._opponentRatingDeviations = opponentRatingDeviations;
      this._opponentRatings = opponentRatings;
      this._outcomes = outcomes;
    }
  }
  static compositePlayer(players) {
    if (players.length === 0) {
      throw new Error("Cannot create a composite of 0 players");
    }
    const [refPlayer] = players;
    let rating = 0;
    let ratingDeviation = 0;
    players.forEach((p, i) => {
      if (!refPlayer.isCompatiblePlayer(p)) {
        throw new Error("All players must have equal tau and defaultRating");
      }
      // Cumulative moving average
      rating = rating + (p.rating - rating) / (i + 1);
      ratingDeviation =
        ratingDeviation + (p.ratingDeviation - ratingDeviation) / (i + 1);
    });
    return new Player({
      defaultRating: refPlayer.defaultRating,
      rating,
      ratingDeviation,
      tau: refPlayer.tau,
      // This is a pseudo player whose resulting volatility is irrelevant
      volatility: refPlayer.volatility,
    });
  }
  get opponentRatingDeviations() {
    return [...this._opponentRatingDeviations];
  }
  get opponentRatings() {
    return [...this._opponentRatings];
  }
  get outcomes() {
    return [...this._outcomes];
  }
  get rating() {
    return this._rating * Player.scalingFactor + this.defaultRating;
  }
  get ratingDeviation() {
    return this._ratingDeviation * Player.scalingFactor;
  }
  get volatility() {
    return this._volatility;
  }
  addResult(opponent, outcome) {
    this._opponentRatings.push(opponent._rating);
    this._opponentRatingDeviations.push(opponent._ratingDeviation);
    this._outcomes.push(outcome);
  }
  // Calculates the new rating and rating deviation of the player.
  // Follows the steps of the algorithm described here:
  // http://www.glicko.net/glicko/glicko2.pdf
  updateRating() {
    if (!this.hasPlayed()) {
      // Applies only the Step 6 of the algorithm
      this.preRatingDeviation();
      return;
    }
    // Step 1: done by Player initialization
    // Step 2: done by set _rating and set _ratingDeviation
    // Step 3
    const v = this.variance();
    // Step 4
    const delta = this.delta(v);
    // Step 5
    this._volatility = this.volatilityAlgorithm(v, delta);
    // Step 6
    this.preRatingDeviation();
    // Step 7
    this._ratingDeviation =
      1 / Math.sqrt(1 / Math.pow(this._ratingDeviation, 2) + 1 / v);
    let tempSum = 0;
    for (let i = 0, len = this._opponentRatings.length; i < len; i++) {
      tempSum +=
        this.g(this._opponentRatingDeviations[i]) *
        (this._outcomes[i] -
          this.E(this._opponentRatings[i], this._opponentRatingDeviations[i]));
    }
    this._rating += Math.pow(this._ratingDeviation, 2) * tempSum;
    // Step 8: done by getters of `rating` and `ratingDeviation`
    // Cleanup
    this.cleanPreviousMatches();
  }
  isCompatiblePlayer(player) {
    return (
      player.tau === this.tau && player.defaultRating === this.defaultRating
    );
  }
  cleanPreviousMatches() {
    this._opponentRatings = [];
    this._opponentRatingDeviations = [];
    this._outcomes = [];
  }
  hasPlayed() {
    return this._outcomes.length > 0;
  }
  volatilityAlgorithm(v, delta) {
    // Step 5.1
    let A = Math.log(Math.pow(this._volatility, 2));
    const f = this.fFactory(delta, v, A);
    const epsilon = 0.000001;
    // Step 5.2
    let B, k;
    if (Math.pow(delta, 2) > Math.pow(this._ratingDeviation, 2) + v) {
      B = Math.log(Math.pow(delta, 2) - Math.pow(this._ratingDeviation, 2) - v);
    } else {
      k = 1;
      while (f(A - k * this.tau) < 0) {
        k = k + 1;
      }
      B = A - k * this.tau;
    }
    // Step 5.3
    let fA = f(A);
    let fB = f(B);
    // Step 5.4
    let C, fC;
    while (Math.abs(B - A) > epsilon) {
      C = A + ((A - B) * fA) / (fB - fA);
      fC = f(C);
      if (fC * fB < 0) {
        A = B;
        fA = fB;
      } else {
        fA = fA / 2;
      }
      B = C;
      fB = fC;
    }
    // Step 5.5
    return Math.exp(A / 2);
  }
  // Calculates and updates the player's rating deviation for the beginning of a
  // rating period.
  preRatingDeviation() {
    this._ratingDeviation = Math.sqrt(
      Math.pow(this._ratingDeviation, 2) + Math.pow(this._volatility, 2)
    );
  }
  // Calculation of the estimated variance of the player's rating based on game
  // _outcomes
  variance() {
    let tempSum = 0;
    for (let i = 0, len = this._opponentRatings.length; i < len; i++) {
      const tempE = this.E(
        this._opponentRatings[i],
        this._opponentRatingDeviations[i]
      );
      tempSum +=
        Math.pow(this.g(this._opponentRatingDeviations[i]), 2) *
        tempE *
        (1 - tempE);
    }
    return 1 / tempSum;
  }
  // The Glicko E function.
  E(p2rating, p2ratingDeviation) {
    return (
      1 /
      (1 + Math.exp(-1 * this.g(p2ratingDeviation) * (this._rating - p2rating)))
    );
  }
  // The Glicko2 g(ratingDeviation) function.
  g(ratingDeviation) {
    return (
      1 /
      Math.sqrt(1 + (3 * Math.pow(ratingDeviation, 2)) / Math.pow(Math.PI, 2))
    );
  }
  // The delta function of the Glicko2 system.
  // Calculation of the estimated improvement in rating (step 4 of the algorithm)
  delta(v) {
    let tempSum = 0;
    for (let i = 0, len = this._opponentRatings.length; i < len; i++) {
      tempSum +=
        this.g(this._opponentRatingDeviations[i]) *
        (this._outcomes[i] -
          this.E(this._opponentRatings[i], this._opponentRatingDeviations[i]));
    }
    return v * tempSum;
  }
  fFactory(delta, v, a) {
    return (x) => {
      return (
        (Math.exp(x) *
          (Math.pow(delta, 2) -
            Math.pow(this._ratingDeviation, 2) -
            v -
            Math.exp(x))) /
          (2 *
            Math.pow(Math.pow(this._ratingDeviation, 2) + v + Math.exp(x), 2)) -
        (x - a) / Math.pow(this.tau, 2)
      );
    };
  }
}
Player.scalingFactor = 173.7178;

exports.Player = Player;
