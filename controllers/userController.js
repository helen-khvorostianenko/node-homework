const { StatusCodes } = require("http-status-codes");
  
const register = (req, res) => {
  const newUser = { ...req.body };
  global.users.push(newUser);
  global.user_id = newUser;
  delete req.body.password;
  res.status(StatusCodes.CREATED).json(req.body);
}

const logon = (req, res) => {
  const { email, password } = req.body;
  const user = global.users.find((u) => u.email === email);

  if (!user || user.password !== password) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Authentication Failed" });
  }

  global.user_id = user;

  res.status(StatusCodes.OK).json({
    name: user.name,
    email: user.email,
  });
};

const logoff = (req, res) => {
  global.user_id = null;
  res.sendStatus(StatusCodes.OK);
};

module.exports = { register, logon, logoff} ;