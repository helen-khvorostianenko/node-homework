const { StatusCodes } = require("http-status-codes");
module.exports = function (req, res, next) {
  console.log(global.user_id);
  if (global.user_id === null) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Unauthorized user" });
  } else {
    return next();
  }
};
