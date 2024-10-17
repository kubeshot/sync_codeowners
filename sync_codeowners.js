const { Octokit } = require("@octokit/rest");
const core = require("@actions/core");

async function main() {
  try {
    // Retrieve the inputs from environment variables
    const token = core.getInput("repo-token");
    const repoFullName = process.env.GITHUB_REPOSITORY; // Provided by GitHub, format: owner/repo
    const codeownersPath =
      core.getInput("codeowners-path") || ".github/CODEOWNERS";
    const codeownersContent = core.getInput("codeowners-content");

    // Authenticate with GitHub using the provided token
    const octokit = new Octokit({ auth: token });

    // Split repoFullName to get owner and repo
    const [owner, repo] = repoFullName.split("/");

    try {
      // Attempt to fetch the current CODEOWNERS file from the repository
      const { data: file } = await octokit.repos.getContent({
        owner,
        repo,
        path: codeownersPath,
      });

      const currentContent = Buffer.from(file.content, "base64").toString(
        "utf-8",
      );

      if (currentContent.trim() === codeownersContent.trim()) {
        console.log("CODEOWNERS file is already up-to-date.");
      } else {
        // Update the CODEOWNERS file if the content is different
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: codeownersPath,
          message: "Updating CODEOWNERS file",
          content: Buffer.from(codeownersContent).toString("base64"),
          sha: file.sha,
        });
        console.log(`Updated CODEOWNERS file at ${codeownersPath}`);
      }
    } catch (error) {
      if (error.status === 404) {
        // If the CODEOWNERS file doesn't exist, create it
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: codeownersPath,
          message: "Creating CODEOWNERS file",
          content: Buffer.from(codeownersContent).toString("base64"),
        });
        console.log(`Created CODEOWNERS file at ${codeownersPath}`);
      } else {
        throw error; // Re-throw unexpected errors
      }
    }
  } catch (error) {
    console.error(error);
    core.setFailed(error.message);
  }
}

main();
