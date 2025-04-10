const express = require("express");
const router = express.Router();

// Handling request using router
router.get("/home", (req, res, next) => {
  res.send("This is the homepage request");
});

router.get("/home2", (req, res, next) => {
  res.send("This is the homepage2 request");
});

// Exporting the router
module.exports = router;
