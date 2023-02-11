import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  res.send({ response: "Server is online" }).status(200);
});

export default router;
