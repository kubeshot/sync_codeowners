const { Octokit } = require("@octokit/rest");

async function triggerSync(owner, repo, targetOwner, targetRepo) {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  await octokit.repos.createDispatchEvent({
    owner,
    repo,
    event_type: "sync_codeowners",
    client_payload: {
      target_repo_owner: targetOwner,
      target_repo_name: targetRepo
    }
  });

  console.log(`Triggered CODEOWNERS sync for ${targetOwner}/${targetRepo}`);
}

// Usage: node trigger_sync.js owner repo targetOwner targetRepo
const [owner, repo, targetOwner, targetRepo] = process.argv.slice(2);
if (!owner || !repo || !targetOwner || !targetRepo) {
  console.error("Usage: node trigger_sync.js owner repo targetOwner targetRepo");
  process.exit(1);
}

triggerSync(owner, repo, targetOwner, targetRepo).catch(console.error);
