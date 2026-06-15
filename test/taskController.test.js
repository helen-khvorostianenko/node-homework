require("dotenv").config();
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
const { EventEmitter } = require("events");
const prisma = require("../db/prisma");
const httpMocks = require("node-mocks-http");
const waitForRouteHandlerCompletion = require("./waitForRouteHandlerCompletion");

const {
  index,
  show,
  create,
  update,
  deleteTask,
  showTrash, 
  restoreTask,
  deleteTrash,
} = require("../controllers/taskController");

let user1 = null;
let user2 = null;
let saveRes = null;
let saveData = null;
let saveTaskId = null;

beforeAll(async () => {
  await prisma.Task.deleteMany();
  await prisma.User.deleteMany();
  user1 = await prisma.User.create({
    data: { name: "Bob", email: "bob@sample.com", hashedPassword: "nonsense" },
  });
  user2 = await prisma.User.create({
    data: {
      name: "Alice",
      email: "alice@sample.com",
      hashedPassword: "nonsense",
    },
  });
});

afterAll(() => {
  prisma.$disconnect();
});

describe("testing task creation", () => {
  it("14. cant create a task without a user id", async () => {
    expect.assertions(1);
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task" },
    });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    try {
      await waitForRouteHandlerCompletion(create, req, saveRes);
    } catch (e) {
      expect(e.name).toBe("TypeError");
    }
  });

  it("15. You can't create a task with a bogus user id.", async () => {
    expect.assertions(1);
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task" },
    });
    req.user = { id: 99999 };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    try {
      await waitForRouteHandlerCompletion(create, req, saveRes);
    } catch (e) {
      expect(e.name).toBe("PrismaClientKnownRequestError");
    }
  });

  it("16. If you have a valid user id, create() succeeds.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "first task" },
    });
    req.user = { id: user1.id };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(create, req, saveRes);
    expect(saveRes.statusCode).toBe(201);
  });

  it("17. The object returned from create() has the expected title.", () => {
    saveData = saveRes._getJSONData();
    expect(saveData.title).toBe("first task");
  });

  it("18. The object has the right value for isCompleted.", () => {
    expect(saveData.isCompleted).toBe(false);
  });

  it("19. The object does not have any value for userId.", () => {
    saveTaskId = saveData.id;
    expect(saveData.userId).toBeUndefined();
  });
});

describe("test getting created tasks", () => {
  it("20. You can't get a list of tasks without a user id.", async () => {
    expect.assertions(1);
    const req = httpMocks.createRequest({ method: "GET" });
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    try {
      await waitForRouteHandlerCompletion(index, req, saveRes);
    } catch (e) {
      expect(e.name).toBe("TypeError");
    }
  });

  it("21. If you use user1's id on index() the call returns a 200 status.", async () => {
    const req = httpMocks.createRequest({ method: "GET" });
    req.user = { id: user1.id };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(index, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });

  it("22. The returned object has a tasks array of length 1.", () => {
    saveData = saveRes._getJSONData();
    expect(saveData.tasks.length).toBe(1);
  });

  it("23. The title in the first array object is as expected.", () => {
    expect(saveData.tasks[0].title).toBe("first task");
  });

  it("24. The first array object does not contain a userId.", () => {
    expect(saveData.tasks[0].userId).toBeUndefined();
  });

  it("25. If you get the list of tasks using the userId from user2, you get a 404.", async () => {
    const req = httpMocks.createRequest({ method: "GET" });
    req.user = { id: user2.id }; 
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(index, req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });

  it("26. You can retrieve the created task using show().", async () => {
    const req = httpMocks.createRequest({ method: "GET" });
    req.user = { id: user1.id };
    req.params = { id: saveTaskId.toString() };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(show, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });

  it("27. User2 can't retrieve this task entry.", async () => {
    const req = httpMocks.createRequest({ method: "GET" });
    req.user = { id: user2.id };
    req.params = { id: saveTaskId.toString() };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(show, req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });
});

describe("test updating and deleting tasks", () => {
  it("28. User1 can set the task to isCompleted: true.", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
      body: { isCompleted: true },
    });
    req.user = { id: user1.id };
    req.params = { id: saveTaskId.toString() };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(update, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });

  it("29. User2 can't update this task.", async () => {
    const req = httpMocks.createRequest({
      method: "PATCH",
      body: { isCompleted: true },
    });
    req.user = { id: user2.id };
    req.params = { id: saveTaskId.toString() };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(update, req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });

  it("30. User2 can't delete this task.", async () => {
    const req = httpMocks.createRequest({ method: "DELETE" });
    req.user = { id: user2.id };
    req.params = { id: saveTaskId.toString() };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(deleteTask, req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });

  it("31. User1 can delete this task.", async () => {
    const req = httpMocks.createRequest({ method: "DELETE" });
    req.user = { id: user1.id };
    req.params = { id: saveTaskId.toString() };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(deleteTask, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
  });

  it("32. Retrieving user1's tasks now returns a 404.", async () => {
    const req = httpMocks.createRequest({ method: "GET" });
    req.user = { id: user1.id };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(index, req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });
});

describe("test recycle bin", () => {
  let trashTaskId = null;

  it("33. User1 can create a task for trash testing.", async () => {
    const req = httpMocks.createRequest({
      method: "POST",
      body: { title: "task to trash" },
    });
    req.user = { id: user1.id };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(create, req, saveRes);
    expect(saveRes.statusCode).toBe(201);
    trashTaskId = saveRes._getJSONData().id;
  });

  it("34. Deleting a task moves it to trash, not permanently.", async () => {
    const req = httpMocks.createRequest({ method: "DELETE" });
    req.user = { id: user1.id };
    req.params = { id: trashTaskId.toString() };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(deleteTask, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
    const data = saveRes._getJSONData();
    expect(data.id).toBe(trashTaskId);
  });

  it("35. Trashed task does not appear in regular task list.", async () => {
    const req = httpMocks.createRequest({ method: "GET" });
    req.user = { id: user1.id };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(index, req, saveRes);
    expect(saveRes.statusCode).toBe(404);
  });

  it("36. Trashed task appears in trash.", async () => {
    const req = httpMocks.createRequest({ method: "GET" });
    req.user = { id: user1.id };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(showTrash, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
    const data = saveRes._getJSONData();
    expect(data.some((t) => t.id === trashTaskId)).toBe(true); // ← проверяем что наша задача есть
  });

  it("37. User2 can't restore user1's task.", async () => {
    const req = httpMocks.createRequest({ method: "PATCH" });
    req.user = { id: user2.id };
    req.params = { id: trashTaskId.toString() };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(restoreTask, req, saveRes);
    expect(saveRes.statusCode).toBe(403);
  });

  it("38. User1 can restore a trashed task.", async () => {
    const req = httpMocks.createRequest({ method: "PATCH" });
    req.user = { id: user1.id };
    req.params = { id: trashTaskId.toString() };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(restoreTask, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
    const data = saveRes._getJSONData();
    expect(data.deletedAt).toBeNull();
  });

  it("39. Restored task appears in regular task list again.", async () => {
    const req = httpMocks.createRequest({ method: "GET" });
    req.user = { id: user1.id };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(index, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
    const data = saveRes._getJSONData();
    expect(data.tasks.length).toBe(1);
  });

  it("40. User1 can empty the trash.", async () => {
    // First move task to trash again
    const deleteReq = httpMocks.createRequest({ method: "DELETE" });
    deleteReq.user = { id: user1.id };
    deleteReq.params = { id: trashTaskId.toString() };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(deleteTask, deleteReq, saveRes);

    // Now empty trash
    const req = httpMocks.createRequest({ method: "DELETE" });
    req.user = { id: user1.id };
    saveRes = httpMocks.createResponse({ eventEmitter: EventEmitter });
    await waitForRouteHandlerCompletion(deleteTrash, req, saveRes);
    expect(saveRes.statusCode).toBe(200);
    const data = saveRes._getJSONData();
    expect(data.deleted).toBe(2);
  });
});