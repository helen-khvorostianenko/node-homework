const express = require("express");
const router = express.Router();
const jwtMiddleware = require("../middleware/jwtMiddleware");

const {
  create,
  index,
  show,
  update,
  deleteTask,
  showTrash,
  deleteTrash,
  restoreTask,
  bulkCreate,
} = require("../controllers/taskController");

router.use(jwtMiddleware);
router.route("/").post(create).get(index);
router.route("/bulk").post(bulkCreate);
router.route("/trash").get(showTrash).delete(deleteTrash);
router.route("/:id").get(show).patch(update).delete(deleteTask);
router.route("/:id/restore").patch(restoreTask);

module.exports = router;
