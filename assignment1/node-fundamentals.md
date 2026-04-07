# Node.js Fundamentals

## What is Node.js?
Node.js is an open-source, cross-platform (Windows, macOS, Linux) JavaScript runtime environment that runs outside of the browser — locally on any machine. It is built on Chrome's V8 engine, which is what makes it possible to execute JavaScript outside of a browser at all.

Node has no graphical user interface and is operated directly through the command line.

**Common use cases**:
* Node is frequently used to build back-end services (APIs) that power client applications like web or mobile apps. 
* It is especially well-suited for highly scalable, data-intensive, and real-time applications.

**Key strengths**:

* Full-stack JavaScript — developers can use JavaScript on both the front end and back end, resulting in cleaner, more consistent codebases.
* Large ecosystem — via npm, Node has access to one of the largest collections of open-source libraries, so most building blocks are already available.

**How it works technically**: 
Node is single-threaded, but uses an event loop to handle asynchronous operations. Instead of waiting for slow tasks (like file reads or network requests) to complete, Node delegates them to the operating system and moves on — picking up the result when it's ready. This is what makes it non-blocking and efficient under heavy load.

## How does Node.js differ from running JavaScript in the browser?
The browser runs JavaScript to interact with a webpage — it has access to the DOM, window, and document objects. Node runs JavaScript on the server side, outside the browser, so it has no DOM. Instead, it has access to the file system, network, and OS-level APIs. Both use the V8 engine, but their environments and available APIs are different.

## What is the V8 engine, and how does Node use it?
V8 is Google's open-source JavaScript engine, built for Chrome. It compiles JavaScript directly to machine code, making it fast. Node takes V8 and embeds it outside the browser, adding APIs for file system access, networking, and other server-side capabilities that browsers don't expose.

## What are some key use cases for Node.js?
REST APIs and back-end services, real-time apps (chat, live updates), data streaming, CLI tools. It's not good choise for CPU-heavy tasks like image processing or complex calculations because of single-threaded nature.

## Explain the difference between CommonJS and ES Modules. Give a code example of each.
CommonJS is original module system in Node, ES Modules is more modern standart, supported in Node with .mjs extension or if you add "type": "module" in package.json.

**CommonJS (default in Node.js):**
```js
const fs = require('fs');
module.exports = { greet: () => 'hello' };
```

**ES Modules (supported in modern Node.js):**
```js
import fs from 'fs';
export const greet = () => 'hello';
``` 