const { StatusCodes } = require("http-status-codes");
const { taskSchema, patchTaskSchema } = require("../validation/taskSchema.js");
const { paginationSchema } = require("../validation/paginationSchema.js");
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

const buildSelect = (query) => {
  const defaultSelect = {
    id: true,
    title: true,
    isCompleted: true,
    priority: true,
    createdAt: true,
    User: { select: { name: true, email: true } },
  };

  if (!query.fields) {
    return defaultSelect;
  }

  const allowed = ["id", "title", "isCompleted", "priority", "createdAt"];

  const requested = query.fields.split(",").map((f) => f.trim());
  const select = {};
  for (const field of requested) {
    if (allowed.includes(field)) {
      select[field] = true;
    }
  }

  if (Object.keys(select).length === 0) return defaultSelect;

  select.id = true;

  return select;
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
      priority: value.priority,
      User: {
        connect: { id: req.user.id },
      },
    },
    select: { id: true, title: true, isCompleted: true, priority: true },
  });

  return res.status(StatusCodes.CREATED).json(task);
};

const index = async (req, res) => {
  const { error, value } = paginationSchema.validate(req.query);
  if (error) {
    return res.status(StatusCodes.BAD_REQUEST).json({ message: error.message });
  }

  const { page, limit } = value;
  const skip = (page - 1) * limit;
  const { find, isCompleted, min_date, max_date, priority } = req.query;

  const whereClause = {
    userId: req.user.id,
    deletedAt: null,
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
    select: buildSelect(req.query),
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
    pagination,
  });
};

const show = async (req, res, next) => {
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
        userId: req.user.id,
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
        deletedAt: true,
        User: {
          select: { name: true, email: true },
        },
      },
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

const showTrash = async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: {
        userId: req.user.id,
        deletedAt: { not: null },
      },
    });
    res.json(tasks);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: error.message,
    });
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
        userId: req.user.id,
      },
      select: {
        title: true,
        isCompleted: true,
        id: true,
        priority: true,
        createdAt: true,
      },
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

const restoreTask = async (req, res) => {
  const id = parseInt(req.params?.id);
  if (!id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "The task ID passed is not valid." });
  }

  try {
    const task = await prisma.task.findUnique({
      where: { id: id },
    });

    if (!task || task.userId !== req.user.id) {
      return res
        .status(StatusCodes.FORBIDDEN)
        .json({ error: "Not authorized" });
    }

    const restored = await prisma.task.update({
      where: {
        id: id,
      },
      data: { deletedAt: null },
    });
    return res.json(restored);
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      error: error.message,
    });
  }
};

const deleteTrash = async (req, res) => {
  try {
    const result = await prisma.task.deleteMany({
      where: {
        userId: req.user.id,
        deletedAt: { not: null },
      },
    });
    res.json({ deleted: result.count });
  } catch (error) {
    res
      .status(StatusCodes.INTERNAL_SERVER_ERROR)
      .json({ error: error.message });
  }
};

const deleteTask = async (req, res, next) => {
  const id = parseInt(req.params?.id);
  if (!id) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "The task ID passed is not valid." });
  }

  try {
    const task = await prisma.task.findUnique({
      where: { id: id },
    });

    if (!task || task.userId !== req.user.id) {
      return res
        .status(StatusCodes.NOT_FOUND)
        .json({ error: "That task was not found" });
    }
    const deletedTask = await prisma.task.update({
      where: {
        id,
        userId: req.user.id,
      },
      data: {
        deletedAt: new Date(),
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

const bulkCreate = async (req, res, next) => {
  const { tasks } = req.body;

  // Validate the tasks array
  if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      error: "Invalid request data. Expected an array of tasks.",
    });
  }

  // Validate all tasks before insertion
  const validTasks = [];
  for (const task of tasks) {
    const { error, value } = taskSchema.validate(task);
    if (error) {
      return res.status(StatusCodes.BAD_REQUEST).json({
        error: "Validation failed",
        details: error.details,
      });
    }
    validTasks.push({
      title: value.title,
      isCompleted: value.isCompleted || false,
      priority: value.priority || "medium",
      userId: req.user.id,
    });
  }

  // Use createMany for batch insertion
  try {
    const result = await prisma.task.createMany({
      data: validTasks,
      skipDuplicates: false,
    });

    res.status(StatusCodes.CREATED).json({
      message: "success!",
      tasksCreated: result.count,
      totalRequested: validTasks.length,
    });
  } catch (err) {
    return next(err);
  }
};

module.exports = {
  create,
  index,
  show,
  showTrash,
  update,
  restoreTask,
  deleteTrash,
  deleteTask,
  bulkCreate,
};
