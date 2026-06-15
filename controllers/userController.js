const { StatusCodes } = require("http-status-codes");
const { userSchema } = require("../validation/userSchema.js");
const crypto = require("crypto");
const util = require("util");
const scrypt = util.promisify(crypto.scrypt);
const prisma = require("../db/prisma");
const { error } = require("console");
const { randomUUID } = require("crypto");
const jwt = require("jsonwebtoken");

const cookieFlags = (req) => {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // only when HTTPS is available
    sameSite: "Strict",
  };
};

const setJwtCookie = (req, res, user) => {
  // Sign JWT
  const payload = {
    id: user.id,
    csrfToken: randomUUID(),
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "1h" });
  // Set cookie.  Note that the cookie flags have to be different in production and in test.
  res.cookie("jwt", token, { ...cookieFlags(req), maxAge: 3600000 }); // 1 hour expiration
  return payload.csrfToken;
}

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
  let isPerson = false;
  if (req.body.recaptchaToken) {
    const token = req.body.recaptchaToken;
    const params = new URLSearchParams();
    params.append("secret", process.env.RECAPTCHA_SECRET);
    params.append("response", token);
    params.append("remoteip", req.ip);
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        body: params.toString(),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
    const data = await response.json();
    if (data.success) isPerson = true;
    delete req.body.recaptchaToken;
  } else if (
    process.env.RECAPTCHA_BYPASS &&
    req.get("X-Recaptcha-Test") === process.env.RECAPTCHA_BYPASS
  ) {
    isPerson = true;
  }

  if (!isPerson) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({
        message: "Bot verification failed. Please complete the reCAPTCHA.",
      });
  }

  if (!req.body) req.body = {};
  const { error, value } = userSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }

  try {
    const hashedPassword = await hashPassword(value.password);
    const result = await prisma.$transaction(async (tx) => {
      // Create user account (similar to Assignment 6, but using tx instead of prisma)
      const newUser = await tx.user.create({
        data: { 
          email: value.email.toLowerCase(),
          name: value.name,
          hashedPassword, 
        },
        select: { id: true, email: true, name: true , createdAt: true},
      });

      // Create 3 welcome tasks using createMany
      const welcomeTaskData = [
        {
          title: "Complete your profile",
          userId: newUser.id,
          priority: "medium",
        },
        { title: "Add your first task", userId: newUser.id, priority: "high" },
        { title: "Explore the app", userId: newUser.id, priority: "low" },
      ];
      await tx.task.createMany({ data: welcomeTaskData });

      // Fetch the created tasks to return them
      const welcomeTasks = await tx.task.findMany({
        where: {
          userId: newUser.id,
          title: { in: welcomeTaskData.map((t) => t.title) },
        },
        select: {
          id: true,
          title: true,
          isCompleted: true,
          userId: true,
          priority: true,
          createdAt: true,
        },
      });

      return { user: newUser, welcomeTasks };
    });

    const csrfToken = setJwtCookie(req, res, result.user);

    res.status(StatusCodes.CREATED);
    res.json({
      user: result.user,
      welcomeTasks: result.welcomeTasks,
      transactionStatus: "success",
      csrfToken,
    });
    return;
  } catch (err) {
      if (err.name === "PrismaClientKnownRequestError" && err.code === "P2002") {
        // this means the unique constraint for email was violated
        return res
          .status(StatusCodes.BAD_REQUEST)
          .json({ message: "Email already registered" });
      }
      return next(err); // all other errors get passed to the error handler
  }
};

const logon = async (req, res) => {
  const { email: rawEmail, password } = req.body;
  const email = rawEmail.toLowerCase();
  const result = await prisma.user.findUnique({ 
    where: { email } 
  });
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

  const csrfToken = setJwtCookie(req, res, user);
  return res.status(StatusCodes.OK).json({
    name: user.name,
    email: user.email,
    csrfToken,
  });
};

const logoff = (req, res) => {
  res.clearCookie("jwt", cookieFlags(req));
  return res.sendStatus(StatusCodes.OK);
};

const show = async (req, res) => {
  const userId = parseInt(req.params.id);
  
  if (isNaN(userId)) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ error: "Invalid user ID"});
  }
  
  if (userId !== req.user.id){
    return res
      .status(StatusCodes.FORBIDDEN)
      .json({ error: "You can only view your own profile" });
  }

  const user = await prisma.user.findUnique({
    where: {id: userId},
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      Task: {
        where: { isCompleted: false},
        select: {
          id: true,
          title: true,
          priority: true,
          createdAt: true
        },
        orderBy: {createdAt: 'desc'},
        take: 5
      }
    }
  });

  if (!user){
    return res.status(StatusCodes.NOT_FOUND).json({message: "User not found"});
  }

  res.status(StatusCodes.OK).json(user);
}

module.exports = { register, logon, logoff, show };
