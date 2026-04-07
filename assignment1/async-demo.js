const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');


// Write a sample file for demonstration
const filePath = path.join(__dirname, "sample-files", "sample.txt");
const content ="Hello, async world!\n";
try {
    fs.writeFileSync(filePath, content);
} catch (err) {
  console.log(err.message)
}


// 1. Callback style
fs.readFile(filePath, "utf8", (err, data) => {
  if (err) {
    console.log("file open failed: ", err.message);
  } else {
    console.log("Callback read:", data);
  }
});

// Callback hell example (test and leave it in comments):
// fs.readFile("file1.txt", "utf8", (err, data1) => {
//   fs.readFile("file2.txt", "utf8", (err, data2) => {
//     fs.readFile("file3.txt", "utf8", (err, data3) => {
//       // to the Pyramid of Doom
//     });
//   });
// });

// 2. Promise style
fsp
  .readFile(filePath, "utf8")
  .then((data) => console.log("Promise read:", data))
  .catch((err) => console.log(err.message));

// 3. Async/Await style

const readWithAsyncAwait = async () => {
  try{
    const data = await fsp.readFile(filePath, 'utf8');
    console.log("Async/Await read:", data);
  } catch (err){
    console.log(err.message);
  }
};
readWithAsyncAwait();
