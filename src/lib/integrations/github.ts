const GITHUB_API = "https://api.github.com";

export async function createRepository(
  token: string,
  name: string,
  description: string,
  isPrivate: boolean = false
): Promise<{ url: string; fullName: string; cloneUrl: string }> {
  const response = await fetch(`${GITHUB_API}/user/repos`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github.v3+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      name,
      description,
      private: isPrivate,
      auto_init: true,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `GitHub API error: ${error.message || response.statusText}`
    );
  }

  const repo = await response.json();
  return {
    url: repo.html_url,
    fullName: repo.full_name,
    cloneUrl: repo.clone_url,
  };
}

export async function getAuthenticatedUser(token: string): Promise<string> {
  const response = await fetch(`${GITHUB_API}/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to get GitHub user");
  }

  const user = await response.json();
  return user.login;
}

export async function pushFiles(
  token: string,
  owner: string,
  repo: string,
  files: { path: string; content: string }[],
  commitMessage: string
): Promise<void> {
  // Get the default branch SHA
  const repoResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.v3+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!repoResponse.ok) {
    throw new Error(`Failed to get repo info: ${repoResponse.statusText}`);
  }

  const repoData = await repoResponse.json();
  const defaultBranch = repoData.default_branch || "main";

  // Get the latest commit SHA
  const refResponse = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!refResponse.ok) {
    throw new Error(`Failed to get branch ref: ${refResponse.statusText}`);
  }

  const refData = await refResponse.json();
  const latestCommitSha = refData.object.sha;

  // Get the tree SHA from the latest commit
  const commitResponse = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/commits/${latestCommitSha}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  const commitData = await commitResponse.json();
  const baseTreeSha = commitData.tree.sha;

  // Create blobs for each file
  const treeItems = await Promise.all(
    files.map(async (file) => {
      const blobResponse = await fetch(
        `${GITHUB_API}/repos/${owner}/${repo}/git/blobs`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github.v3+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          body: JSON.stringify({
            content: file.content,
            encoding: "utf-8",
          }),
        }
      );

      if (!blobResponse.ok) {
        throw new Error(`Failed to create blob for ${file.path}`);
      }

      const blob = await blobResponse.json();
      return {
        path: file.path,
        mode: "100644",
        type: "blob",
        sha: blob.sha,
      };
    })
  );

  // Create a new tree
  const newTreeResponse = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/trees`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems,
      }),
    }
  );

  if (!newTreeResponse.ok) {
    throw new Error(`Failed to create tree: ${newTreeResponse.statusText}`);
  }

  const newTree = await newTreeResponse.json();

  // Create a new commit
  const newCommitResponse = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/commits`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        message: commitMessage,
        tree: newTree.sha,
        parents: [latestCommitSha],
      }),
    }
  );

  if (!newCommitResponse.ok) {
    throw new Error(`Failed to create commit: ${newCommitResponse.statusText}`);
  }

  const newCommit = await newCommitResponse.json();

  // Update the branch reference
  const updateRefResponse = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/refs/heads/${defaultBranch}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        sha: newCommit.sha,
        force: false,
      }),
    }
  );

  if (!updateRefResponse.ok) {
    throw new Error(
      `Failed to update branch ref: ${updateRefResponse.statusText}`
    );
  }
}

export async function getRepositories(
  token: string
): Promise<{ name: string; url: string; description: string }[]> {
  const response = await fetch(
    `${GITHUB_API}/user/repos?sort=updated&per_page=30`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get repositories: ${response.statusText}`);
  }

  const repos = await response.json();
  return repos.map((repo: { name: string; html_url: string; description: string | null }) => ({
    name: repo.name,
    url: repo.html_url,
    description: repo.description || "",
  }));
}
