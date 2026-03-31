import { spawn } from "node:child_process";

function getDatabaseUrl() {
  const cliUrl = process.argv[2]?.trim();
  const envUrl = process.env.DATABASE_URL?.trim();

  return cliUrl || envUrl;
}

function normalizeDatabaseUrl(rawUrl) {
  const parsedUrl = new URL(rawUrl);
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

  if (!parsedUrl.searchParams.has("sslmode")) {
    const sslMode = localHosts.has(parsedUrl.hostname) ? "disable" : "require";
    parsedUrl.searchParams.set("sslmode", sslMode);
  }

  return parsedUrl.toString();
}

function runCommand(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      env,
      shell: process.platform === "win32",
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
  });
}

async function main() {
  const rawDatabaseUrl = getDatabaseUrl();

  if (!rawDatabaseUrl) {
    console.error(
      "Missing database URL. Pass it as the first argument or set DATABASE_URL.",
    );
    process.exit(1);
  }

  const databaseUrl = normalizeDatabaseUrl(rawDatabaseUrl);
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
  };

  console.log("Applying Prisma schema to the target database...");
  console.log("Host:", new URL(databaseUrl).host);

  await runCommand("npx", ["prisma", "db", "push", "--schema", "prisma/schema.prisma"], env);
  await runCommand("npx", ["prisma", "generate", "--schema", "prisma/schema.prisma"], env);

  console.log("Schema push complete.");
}

main().catch((error) => {
  console.error("Failed to apply Prisma schema.");
  console.error(error.message);
  process.exit(1);
});
