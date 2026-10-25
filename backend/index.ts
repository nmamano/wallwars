import express from "express";
import mongoose from "mongoose";
const router = express.Router();

router.get("/", (req, res) => {
  res.send({ response: "Server is online" }).status(200);
});

// Health check for the container and the dead-man: 200 only when mongoose is
// connected (readyState 1). Games still run while the DB is down, so a 503 here
// marks the container unhealthy but does not restart it.
router.get("/healthz", (req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).send({ db: dbUp ? "up" : "down" });
});

export default router;
