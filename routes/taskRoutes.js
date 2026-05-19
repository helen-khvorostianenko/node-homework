const express = require("express");
const router = express.Router();

const {
  create,
  index,
  show,
  update,
  deleteTask,
  bulk
} = require("../controllers/taskController");

router.route("/").post(create).get(index);
router.route("/bulk").post(bulk);
router.route("/:id").get(show).patch(update).delete(deleteTask);

module.exports = router;
