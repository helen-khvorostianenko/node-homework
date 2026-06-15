const express = require("express");
const router = express.Router();
const {
  register,
  logon,
  logoff,
  show,
  googleLogon,
} = require("../controllers/userController");

router.route("/register").post(register);
router.route("/logon").post(logon);
router.route("/logoff").post(logoff);
router.route("/googleLogon").post(googleLogon);
router.route("/:id").get(show);

module.exports = router;
