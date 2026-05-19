const express = require("express");
const router = express.Router();
const {
  getUsersWithStats,
  getUserAnalytics,
  searchTasks,
} = require("../controllers/analyticsController");

router.route("/tasks/search").get(searchTasks);
router.route("/users").get(getUsersWithStats);
router.route("/users/:id").get(getUserAnalytics);

module.exports = router;
