if (typeof process !== "undefined" && process.exit) {
  const { ConvexClient } = require("convex/browser");

  const convexUrl = process.env.CONVEX_URL;
  if (!convexUrl) {
    console.error("Error: CONVEX_URL environment variable is missing. Run this command through 'npx convex dev'.");
    process.exit(1);
  }

  const client = new ConvexClient(convexUrl);

  async function run() {
    console.log("Connecting to Convex at URL:", convexUrl);
    console.log("Executing tests/vacationCapacity:runVacationCapacityTests mutation...");
    try {
      const result = await client.mutation("tests/vacationCapacity:runVacationCapacityTests", {});
      console.log("SUCCESS: Vacation mode and capacity control integration tests passed.");
      console.log("Result:", result);
      process.exit(0);
    } catch (err) {
      console.error("FAILURE: Vacation mode and capacity control integration tests failed.");
      console.error("Error Details:", err);
      process.exit(1);
    }
  }

  run();
}
