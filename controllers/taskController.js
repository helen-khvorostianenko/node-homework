const { StatusCodes } = require("http-status-codes");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema.js");
const prisma = require("../db/prisma.js");

const create = async (req, res) => {
  if (!req.body) req.body = {};
  const { error, value } = taskSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }

  const task = await prisma.task.create({
    data: {
      title: value.title,
      isCompleted: value.isCompleted,
      user: {
        connect: { id: global.user_id },
      },
    },
    select: { id: true, title: true, isCompleted: true },
  });

  return res.status(StatusCodes.CREATED).json(task);
};

const index = async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: {
      userId: global.user_id,
    },
    select: {
      title: true, isCompleted:true, id: true
    }
  })

  if (tasks.length === 0) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "No tasks found" });
  }

  return res.json(tasks);
};

const show = async(req, res, next) => {
  const id = parseInt(req.params?.id);
  if (!id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "The task ID passed is not valid." });
  }

  try {
    const userTask = await prisma.task.findUniqueOrThrow({
      where: {
        id, userId: global.user_id ,
      },
      select: { title: true, isCompleted: true, id: true },
    });
    return res.json(userTask);
  } catch (err) {
    if (err.code === "P2025") {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "That task was not found" });
    }
    return next(err);
  }
};

const update = async (req, res, next) => {
  if (!req.body) req.body = {};

  const id = parseInt(req.params?.id);
  if (!id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "The task ID passed is not valid." });
  }

  const { error, value } = patchTaskSchema.validate(req.body, {
    abortEarly: false,
  });
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }

  let updatedTask = null;
  try {
     updatedTask = await prisma.task.update({
      data: value,
      where: {
        id,
        userId: global.user_id,
      },
      select: { title: true, isCompleted: true, id: true },
    });
  } catch (err) {
    if (err.code === "P2025") {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "That task was not found" });
    }
    return next(err);
  }

  return res.json(updatedTask);
};

const deleteTask = async(req, res, next) => {
  const id = parseInt(req.params?.id);
  if (!id){
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "The task ID passed is not valid." });
  }

  try{
    const deletedTask = await prisma.task.delete({
      where: {
        id,
        userId: global.user_id,
      },
      select: { title: true, isCompleted: true, id: true },
    });
    return res.json(deletedTask);
  } catch (err) {
    if (err.code === "P2025") {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ message: "That task was not found" });
    }
    return next(err);
  } 
};

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
};
