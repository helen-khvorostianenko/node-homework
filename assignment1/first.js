// 
const fs = require("fs"); // File system operations
// const os = require("os"); // Operating system information
// const net = require("net"); // Networking (TCP sockets)
// const http = require("http"); // HTTP server and client
// const https = require("https"); // HTTPS server and client

console.log(module);
console.log(global);
console.log(fs);

fs.open("./tmp/file.txt", "w",(err, fileHandle) => {
  if (err) {
    console.log('file open failed: ', err.message);
  } else {
    console.log('file open succeeded. The file handle is: ', fileHandle);
  }
});
console.log("last statement");


const doFileOperations = async () => {
  try {
    const filehandle = await new Promise((resolve, reject) => {
      fs.open("./tmp/file.txt", "w", (err, filehandle) => {
        return err ? reject(err) : resolve(filehandle);
      });
    });
  } catch (err) {
    console.log("An error occurred.", err);
  }
};

doFileOperations(); 

const fsp = require("fs/promises"); 

const doFileOperationsP = async () => {
  
  try {
    const fileHandle = await fsp.open("./tmp/file.txt", "w");
  } catch (err) {
    console.log("A error occurred.", err);
  }
};

doFileOperationsP();


// Streams for Large Files
const readStream = fs.createReadStream('./largefile.txt',{
  encoding: 'utf8',
  highWaterMark: 1024 
});

readStream.on('data', (chunk) => {
  console.log("Received chunk:", chunk.length, "characters");
  console.log('First 40 chars: ', chunk.slice(0, 40));
});

readStream.on("end", () => {
  console.log("Finished reading the file");
});

readStream.on("error", (err) => {
  console.error("Error reading file:", err);
});

// Writing Files with Streams
const writeStream = fs.createWriteStream('./output.txt');

writeStream.write("First chunk of data\n");
writeStream.write("Second chunk of data\n");
writeStream.write("Third chunk of data\n");
writeStream.write("Next chunk of data\n");

writeStream.end();

writeStream.on('finish', () => {
  console.log('Finished writing to file');
});

writeStream.on("error", (err) => {
  console.log("Error writing file:", err);
});