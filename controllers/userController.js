const { StatusCodes } = require("http-status-codes");
const { userSchema } = require("../validation/userSchema.js");
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
const prisma = require("../db/prisma");

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
    user = await prisma.user.create({
      data: {
        email: value.email,
        name: value.name,
        hashedPassword, 
      },
      select: { id: true, email: true, name: true }, 
    });
  } catch (err) {
    if (err.name === "PrismaClientKnownRequestError" && err.code === "P2002") {
      // this means the unique constraint for email was violated
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json({ message: "Email already registered" });
    }
    return next(err); // all other errors get passed to the error handler
  }
  const { id, name, email } = user;
  global.user_id = id;
  return res.status(StatusCodes.CREATED).json({ name, email });
};

const logon = async (req, res) => {
  const { email: rawEmail, password } = req.body;
  const email = rawEmail;
  const result = await prisma.user.findUnique({ where: { email } });
  if (!result) {
    return res
      .status(StatusCodes.UNAUTHORIZED)
      .json({ message: "Authentication Failed" });
  }
  
  const user = result;
  const isEqualPassword = await comparePassword(password, user.hashedPassword);
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
