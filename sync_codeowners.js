import { Octokit } from "@octokit/rest";
import * as core from "@actions/core"; // ESM

async function main() {
  try {
    // Retrieve the inputs from environment variables
    const token = core.getInput("repo-token");
    const onboardedRepo = core.getInput("onboarded-repo"); // New input for onboarded repo
    const codeownersPath =
      core.getInput("codeowners-path") || ".github/CODEOWNERS";
    const codeownersContent = core.getInput("codeowners-content");

    // Authenticate with GitHub using the provided token
    const octokit = new Octokit({ auth: token });

    // Split onboardedRepo to get owner and repo
    const [owner, repo] = onboardedRepo.split("/");

    try {
      // Attempt to fetch the current CODEOWNERS file from the onboarded repository
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
        return; // Exit if content is unchanged
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

    // Create a pull request after updating or creating the CODEOWNERS file
    const branchName = `update-codeowners-${Date.now()}`; // Create a unique branch name

    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branchName}`,
      sha: (await octokit.repos.getCommit({ owner, repo, ref: "main" })).data
        .sha,
    });

    await octokit.pulls.create({
      owner,
      repo,
      title: "Update CODEOWNERS file",
      head: branchName,
      base: "main",
      body: "This PR updates or creates the CODEOWNERS file.",
    });

    console.log(
      `Pull request created in ${onboardedRepo} to update CODEOWNERS file.`,
    );
  } catch (error) {
    console.error(error);
    core.setFailed(error.message);
  }
}

main();
