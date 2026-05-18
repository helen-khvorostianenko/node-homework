const express = require("express");
const router = express.Router();
const { register, logon, logoff, show } = require("../controllers/userController");
const middleware = require('../middleware/auth');

router.route("/register").post(register);
router.route("/logon").post(logon);
router.route("/logoff").post(logoff);
router.route("/:id").get(middleware, show);

module.exports = router;
