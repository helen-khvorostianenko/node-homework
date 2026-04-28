const { StatusCodes } = require("http-status-codes");
const { userSchema } = require("../validation/userSchema.js");
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function comparePassword(inputPassword, storedHash) {
  const [salt, key] = storedHash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = await scrypt(inputPassword, salt, 64);
  return crypto.timingSafeEqual(keyBuffer, derivedKey);
}

const register = async (req, res) => {
  if (!req.body) req.body = {};
  const { error, value } = userSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }

  const { password, ...userWithoutPassword } = value;
  const hashedPassword = await hashPassword(password);
  const newUser = { ...userWithoutPassword, hashedPassword };

  global.users.push(newUser);
  global.user_id = newUser;

  return res.status(StatusCodes.CREATED).json(userWithoutPassword);
};

const logon = async (req, res) => {
  const { email, password } = req.body;
  const user = global.users.find((u) => u.email === email);
  if (!user) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Authentication Failed" });
  }

  const isEqualPassword = await comparePassword(password, user.hashedPassword);
  if (!isEqualPassword) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Authentication Failed" });
  }

  global.user_id = user;
  return res.status(StatusCodes.OK).json({
    name: user.name,
    email: user.email,
  });
};

const logoff = (req, res) => {
  global.user_id = null;
  return res.sendStatus(StatusCodes.OK);
};

module.exports = { register, logon, logoff };
