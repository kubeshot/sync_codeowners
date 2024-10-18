import { Octokit } from "@octokit/rest";

import { Octokit } from "@octokit/rest";
import fs from "fs";
import yaml from "js-yaml";

// Read the YAML configuration file
const codeownersConfig = yaml.load(
  fs.readFileSync("codeowners_config.yml", "utf8"),
);

async function main() {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const owner = "kubeshot";
  const repo = "run_sync_codeowners";
  const branch = "update-codeowners-branch";
  const mainBranch = "main";
  const filePath = ".github/CODEOWNERS";

  // Generate CODEOWNERS content based on YAML config
  const newContent = generateCodeownersContent(codeownersConfig, owner, repo);

  // Get the latest commit SHA of the main branch

  function generateCodeownersContent(config, owner, repo) {
    let content = "";

    // Add global CODEOWNERS
    for (const [pattern, owners] of Object.entries(config.global || {})) {
      content += `${pattern} ${owners}\n`;
    }

    // Add topic-specific CODEOWNERS
    // Note: You'll need to fetch repository topics from GitHub API
    // and match them with the config. This is just a placeholder.
    const repoTopics = ["frontend", "backend"]; // Replace with actual topics
    for (const topic of repoTopics) {
      if (config.topics && config.topics[topic]) {
        for (const [pattern, owners] of Object.entries(config.topics[topic])) {
          content += `${pattern} ${owners}\n`;
        }
      }
    }

    // Add repository-specific CODEOWNERS
    const repoKey = `${owner}/${repo}`;
    if (config.repositories && config.repositories[repoKey]) {
      for (const [pattern, owners] of Object.entries(
        config.repositories[repoKey],
      )) {
        content += `${pattern} ${owners}\n`;
      }
    }

    return Buffer.from(content).toString("base64");
  }
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

  // Check if a pull request already exists from the branch to the base branch
  const { data: pullRequests } = await octokit.pulls.list({
    owner,
    repo,
    state: "open",
    head: `${owner}:${branch}`,
    base: mainBranch,
  });

  if (pullRequests.length > 0) {
    console.log("Pull request already exists, skipping creation.");
    return; // Stop execution if a pull request already exists
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
