const express = require("express");
const router = express.Router();
const {
  getUsersWithStats,
  getUserAnalytics,
} = require("../controllers/analyticsController");

router.route("/users").get(getUsersWithStats);
router.route("/users/:id").get(getUserAnalytics);

module.exports = router;
