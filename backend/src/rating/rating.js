const { Player } = require("./rating_internal_formula");

const defaultRating = 1500;
// result should be 0, 0.5, or 1.
// each player has rating, deviation, volatility.
// functinal-style wrapper around the OOP library in rating_internal_formula
const updateRating = (player, opponent, result) => {
  const tau = 0.06;
  const player_ = new Player({
    defaultRating: defaultRating,
    rating: player.rating,
    ratingDeviation: player.ratingDeviation,
    tau: tau,
    volatility: player.ratingVolatility,
  });
  const opponent_ = new Player({
    defaultRating: defaultRating,
    rating: opponent.rating,
    ratingDeviation: opponent.ratingDeviation,
    tau: tau,
    volatility: opponent.ratingVolatility,
  });
  player_.addResult(opponent_, result);
  player_.updateRating();
  return {
    rating: player_.rating,
    deviation: player_.ratingDeviation,
    volatility: player_.volatility,
  };
};

const initialRating = () => {
  return {
    rating: defaultRating,
    deviation: 350,
    volatility: 0.06,
  };
};

exports.initialRating = initialRating;
exports.updateRating = updateRating;
