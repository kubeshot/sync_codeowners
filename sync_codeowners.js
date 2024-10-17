const { Octokit } = require("@octokit/rest");

async function main() {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const owner = "kubeshot";
  const repo = "run_sync_codeowners";
  const branch = "update-codeowners-branch"; // Name for the new branch
  const mainBranch = "main"; // Base branch for the PR
  const filePath = ".github/CODEOWNERS";
  const newContent = Buffer.from("*.js       gurneesh-kubeshot").toString(
    "base64",
  );

  // Get the latest commit SHA of the main branch
  const { data: latestCommit } = await octokit.repos.getBranch({
    owner,
    repo,
    branch: mainBranch,
  });
  const latestSHA = latestCommit.commit.sha;

  // Create a new branch from main
  await octokit.git.createRef({
    owner,
    repo,
    ref: `refs/heads/${branch}`,
    sha: latestSHA,
  });

  // Update the CODEOWNERS file in the new branch
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: "Updating CODEOWNERS file",
    content: newContent,
    branch, // Use the newly created branch here
  });

  // Create a pull request from the new branch to main
  await octokit.pulls.create({
    owner,
    repo,
    title: "Update CODEOWNERS file",
    head: branch, // Source branch for the PR
    base: mainBranch, // Target branch for the PR
    body: "This PR updates the CODEOWNERS file with new owners",
  });

  console.log("Pull request created successfully");
}

main().catch((error) => {
  console.error("Error occurred:", error);
});
