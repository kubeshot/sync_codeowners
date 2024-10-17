import os
from github import Github
from github.GithubException import UnknownObjectException

def main():
    # Retrieve the inputs from environment variables
    token = os.getenv('INPUT_REPO_TOKEN')
    repo_full_name = os.getenv('GITHUB_REPOSITORY')  # Provided by GitHub, format: owner/repo
    codeowners_path = os.getenv('INPUT_CODEOWNERS_PATH', '.github/CODEOWNERS')
    codeowners_content = os.getenv('INPUT_CODEOWNERS_CONTENT')

    # Authenticate with GitHub using the provided token
    g = Github(token)
    repo = g.get_repo(repo_full_name)

    try:
        # Attempt to fetch the current CODEOWNERS file from the repository
        file = repo.get_contents(codeowners_path)
        current_content = file.decoded_content.decode('utf-8')

        if current_content.strip() == codeowners_content.strip():
            print("CODEOWNERS file is already up-to-date.")
        else:
            # Update the CODEOWNERS file if the content is different
            repo.update_file(file.path, "Updating CODEOWNERS file", codeowners_content, file.sha)
            print(f"Updated CODEOWNERS file at {codeowners_path}")

    except UnknownObjectException:
        # If the CODEOWNERS file doesn't exist, create it
        repo.create_file(codeowners_path, "Creating CODEOWNERS file", codeowners_content)
        print(f"Created CODEOWNERS file at {codeowners_path}")

if __name__ == "__main__":
    main()
