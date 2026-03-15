const VERCEL_API = "https://api.vercel.com";

export async function createProject(
  token: string,
  name: string,
  gitRepo?: string
): Promise<{ id: string; url: string }> {
  const body: Record<string, unknown> = {
    name,
    framework: "nextjs",
  };

  if (gitRepo) {
    body.gitRepository = {
      type: "github",
      repo: gitRepo,
    };
  }

  const response = await fetch(`${VERCEL_API}/v9/projects`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Vercel API error: ${error.error?.message || response.statusText}`
    );
  }

  const project = await response.json();
  return {
    id: project.id,
    url: `https://${project.name}.vercel.app`,
  };
}

export async function getProjects(
  token: string
): Promise<{ id: string; name: string; url: string }[]> {
  const response = await fetch(`${VERCEL_API}/v9/projects?limit=20`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get Vercel projects: ${response.statusText}`);
  }

  const data = await response.json();
  return (data.projects || []).map((p: { id: string; name: string }) => ({
    id: p.id,
    name: p.name,
    url: `https://${p.name}.vercel.app`,
  }));
}

export async function triggerDeployment(
  token: string,
  projectId: string
): Promise<{ url: string }> {
  const response = await fetch(`${VERCEL_API}/v13/deployments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: projectId,
      project: projectId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      `Vercel deployment error: ${error.error?.message || response.statusText}`
    );
  }

  const deployment = await response.json();
  return {
    url: `https://${deployment.url}`,
  };
}
