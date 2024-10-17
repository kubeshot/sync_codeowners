const { Octokit } = require("@octokit/rest");

async function main() {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const owner = "kubeshot";
  const repo = "run_sync_codeowners";
  const branch = "update-codeowners-branch"; // New branch
  const mainBranch = "main"; // Base branch
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

  // Check if the branch already exists
  let branchExists = false;
  try {
    await octokit.git.getRef({
      owner,
      repo,
      ref: `heads/${branch}`,
    });
    branchExists = true;
    console.log(`Branch ${branch} already exists.`);
  } catch (error) {
    if (error.status === 404) {
      console.log(`Branch ${branch} does not exist, creating a new one.`);
    } else {
      throw error;
    }
  }

  // Create a new branch from main if it doesn't exist
  if (!branchExists) {
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${branch}`,
      sha: latestSHA,
    });
  }

  // Get the SHA of the CODEOWNERS file (if it exists)
  let fileSHA = null;
  try {
    const { data: fileData } = await octokit.repos.getContent({
      owner,
      repo,
      path: filePath,
      ref: branch, // Look for the file in the new branch
    });
    fileSHA = fileData.sha;
  } catch (error) {
    if (error.status === 404) {
      console.log("CODEOWNERS file does not exist yet, creating a new one.");
    } else {
      throw error;
    }
  }

  // Update or create the CODEOWNERS file in the new branch
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: "Updating CODEOWNERS file",
    content: newContent,
    branch, // Use the new branch
    sha: fileSHA, // Only include `sha` if the file already exists
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
