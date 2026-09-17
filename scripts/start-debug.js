// Temporary diagnostic start script.
// Wraps the real server start so any crash actually gets printed,
// instead of the process exiting silently.
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
  process.exit(1);
});
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION:", err);
  process.exit(1);
});

console.log("start-debug: about to import dist/server/server.js ...");

import("../dist/server/server.js")
  .then(() => {
    console.log("start-debug: server module imported successfully.");
  })
  .catch((err) => {
    console.error("IMPORT FAILED:", err);
    process.exit(1);
  });