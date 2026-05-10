const { StatusCodes } = require("http-status-codes");
const { userSchema } = require("../validation/userSchema.js");
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
const pool = require("../db/pg-pool.js");

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

const register = async (req, res, next) => {
  if (!req.body) req.body = {};
  const { error, value } = userSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }

  let user = null;
  try {
    const hashedPassword = await hashPassword(value.password);
    user = await pool.query(
      `INSERT INTO users (email, name, hashed_password) 
      VALUES ($1, $2, $3) RETURNING id, email, name`,
      [value.email, value.name, hashedPassword],
    );
  } catch (e) {
    if (e.code === "23505") {
      // this means the unique constraint for email was violated
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "The unique constraint for email was violated" });
    }
    return next(e); // all other errors get passed to the error handler
  }
  const { id, name, email } = user.rows[0];
  global.user_id = id;
  return res.status(StatusCodes.CREATED).json({ name, email });
};

const logon = async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);
  if (result.rows.length === 0) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Authentication Failed" });
  }
  
  const user = result.rows[0];
  const isEqualPassword = await comparePassword(password, user.hashed_password);
  if (!isEqualPassword) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Authentication Failed" });
  }

  global.user_id = user.id;
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
