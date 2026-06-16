# Task Manager API

A RESTful API for managing personal to-do tasks, built with Node.js, Express, and PostgreSQL.

## Features

- User registration, login, and logout
- Google OAuth authentication — login with your Google account
- Full CRUD for tasks (create, read, update, delete)
- Soft deletion with Recycle Bin — tasks are moved to trash instead of being permanently deleted, and can be restored
- Pagination, filtering, and sorting of task lists
- Bulk task creation
- Security: JWT authentication, HTTP-only cookies, CSRF protection, password hashing
- Input validation with Joi
- Automated tests with Jest and Supertest

## Tech Stack

- Node.js / Express
- PostgreSQL + Prisma ORM
- JWT + bcrypt
- Joi
- Jest + Supertest

## Live Demo

https://node-homework-dqq6.onrender.com/

## Installation

### Prerequisites

- Node.js
- PostgreSQL
- npm

### Setup

1. Clone the repository:
   git clone https://github.com/helen-khvorostianenko/node-homework
   cd node-homework

2. Install dependencies:
   npm install

3. Create a .env file in the root directory:
   DATABASE_URL=postgresql://localhost/tasklist
   TEST_DATABASE_URL=postgresql://localhost/testtasklist
   JWT_SECRET=your_secret_here
   GOOGLE_CLIENT_ID=your_google_client_id
   GOOGLE_CLIENT_SECRET=your_google_client_secret

   Note: DATABASE_URL format may vary depending on your OS and PostgreSQL setup.
   See [Prisma docs](https://www.prisma.io/docs/reference/database-reference/connection-urls) for details.

4. Run Prisma migration:
   npx prisma migrate dev

5. Start the server:
   npm start

## API Endpoints

### Auth

- POST /api/users/register - register a new user
- POST /api/users/logon - login
- POST /api/users/logoff - logout
- POST /api/users/googleLogon - login with Google account

### Tasks

- GET /api/tasks - get all tasks (supports pagination, filtering, sorting)
- POST /api/tasks - create a task
- GET /api/tasks/:id - get a task by id
- PATCH /api/tasks/:id - update a task
- DELETE /api/tasks/:id - move task to trash
- GET /api/tasks/trash - view trashed tasks
- PATCH /api/tasks/:id/restore - restore task from trash
- DELETE /api/tasks/trash - permanently delete all trashed tasks
- POST /api/tasks/bulk - bulk create tasks

## Running Tests

npm test
