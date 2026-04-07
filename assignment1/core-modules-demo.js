const os = require('os');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');

const sampleFilesDir = path.join(__dirname, 'sample-files');
if (!fs.existsSync(sampleFilesDir)) {
  fs.mkdirSync(sampleFilesDir, { recursive: true });
}
const main = async () => {
  // OS module
  console.log("Platform:", os.platform());
  console.log("CPU:", os.cpus()[0].model);
  console.log("Total Memory:", os.totalmem());

  // Path module
  console.log(
    "Joined path:",
    path.join(__dirname, "sample-files", "folder", "file.txt"),
  );

  // fs.promises API
  await doFileOperations();

  // Streams for large files- log first 40 chars of each chunk
  await doLargeFileOperations();
};

const doFileOperations = async () => {
  let fileHandle;
  try {
    const filePath = path.join(__dirname, "sample-files", "demo.txt");
    fileHandle = await fsp.open(filePath, "w");
    await fileHandle.writeFile("Hello from fs.promises!");
    const buffer = await fsp.readFile(filePath, "utf8");
    console.log("fs.promises read:", buffer);
  } catch (err) {
    console.log("An error ocuured:", err.message);
  } finally {
    await fileHandle?.close();
  }
};

const doLargeFileOperations = () => {
  return new Promise((resolve, reject) => {
    const largeFilePath = path.join(__dirname, "sample-files", "largefile.txt");
    const lines = Array.from(
      { length: 100 },
      (_, i) => `This is line ${i} in a large file`,
    ).join("\n");
    fs.writeFileSync(largeFilePath, lines);

    const readStream = fs.createReadStream(largeFilePath, {
      encoding: "utf-8",
      highWaterMark: 1024,
    });

    readStream.on("data", (chunk) => {
      console.log("Read chunk: ", chunk.slice(0, 40));
    });

    readStream.on("end", () => {
      console.log("Finished reading large file with streams.");
      resolve();
    });

    readStream.on("error", (err) => {
      console.log(err.message);
      reject(err);
    });
  });
};

main();
