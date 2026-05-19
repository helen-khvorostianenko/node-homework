const express = require("express");
const router = express.Router();
const {
  getUsersWithStats,
  getUserAnalytics,
  search,
} = require("../controllers/analyticsController");

router.route("/users").get(getUsersWithStats);
router.route("/users/:id").get(getUserAnalytics);
router.route("/tasks/search").get(search);

module.exports = router;
