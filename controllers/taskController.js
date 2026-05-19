const { StatusCodes } = require("http-status-codes");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema.js");
const prisma = require("../db/prisma.js");

const getOrderBy = (query) => {
  const validSortFields = [
    "title",
    "priority",
    "createdAt",
    "id",
    "isCompleted",
  ];
  const sortBy = query.sortBy || "createdAt";
  const sortDirection = query.sortDirection === "asc" ? "asc" : "desc";

  if (validSortFields.includes(sortBy)) {
    return {
      [sortBy]: sortDirection,
    };
  }
  return { createdAt: "desc" };
};

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
      User: {
        connect: { id: global.user_id },
      },
    },
    select: { id: true, title: true, isCompleted: true, priority: true },
  });

  return res.status(StatusCodes.CREATED).json(task);
};

const index = async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const { find, isCompleted, min_date, max_date, priority } = req.query;
  
  const whereClause = {
    userId: global.user_id
  };

  if (find) {
    whereClause.title = {
      contains: find,
      mode: "insensitive",
    };
  }

  if (isCompleted !== undefined) {
    whereClause.isCompleted = isCompleted === "true";
  }

  if (min_date) {
    whereClause.createdAt = {
      ...whereClause.createdAt,
      gte: new Date(min_date),
    };
  }
  if (max_date) {
    whereClause.createdAt = {
      ...whereClause.createdAt,
      lte: new Date(max_date),
    };
  }
  if (priority && ["low", "medium", "high"].includes(priority)) {
    whereClause.priority = priority;
  }

  const tasks = await prisma.task.findMany({
    where: whereClause,
    select: {
      id: true,
      title: true,
      isCompleted: true,
      priority: true,
      createdAt: true,
      User: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    skip: skip,
    take: limit,
    orderBy: getOrderBy(req.query),
  });

  if (tasks.length === 0) {
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "No tasks found" });
  }

  const totalTasks = await prisma.task.count({
    where: whereClause,
  });

  const pagination = {
    page,
    limit,
    total: totalTasks,
    pages: Math.ceil(totalTasks / limit),
    hasNext: page * limit < totalTasks,
    hasPrev: page > 1,
  };

  return res.status(StatusCodes.OK).json({
    tasks,
    pagination
  });
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
        id,
        userId: global.user_id,
      },
      select: { title: true, isCompleted: true, id: true, priority: true},
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
