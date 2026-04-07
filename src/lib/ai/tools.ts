import type { ChatCompletionTool } from "openai/resources/chat/completions";

export const tools: ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Search the web for current information, documentation, prices, tutorials, or any topic. Use this to research before building or to answer questions about current events/technology.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "The search query. Be specific for best results. Example: 'Next.js 14 app router authentication tutorial 2024'",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_github_repo",
      description:
        "Create a new GitHub repository. Use this when starting a new project that needs version control.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              "Repository name (lowercase, hyphens allowed). Example: 'my-saas-app'",
          },
          description: {
            type: "string",
            description: "Brief description of what the repository contains",
          },
          private: {
            type: "boolean",
            description:
              "Whether the repository should be private. Default: false",
          },
        },
        required: ["name", "description"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "push_code_to_github",
      description:
        "Push one or more files to a GitHub repository. Use this to commit code after creating a repository.",
      parameters: {
        type: "object",
        properties: {
          repo: {
            type: "string",
            description: "Repository name (without owner). Example: 'my-app'",
          },
          files: {
            type: "array",
            description: "Array of files to push",
            items: {
              type: "object",
              properties: {
                path: {
                  type: "string",
                  description: "File path relative to repo root. Example: 'src/index.ts'",
                },
                content: {
                  type: "string",
                  description: "Complete file content as a string",
                },
              },
              required: ["path", "content"],
            },
          },
          message: {
            type: "string",
            description: "Git commit message. Example: 'Initial commit: Add Next.js app'",
          },
        },
        required: ["repo", "files", "message"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_vercel_project",
      description:
        "Create and deploy a project to Vercel. Use this after pushing code to GitHub to make the project live.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Vercel project name. Should match the GitHub repo name.",
          },
          githubRepo: {
            type: "string",
            description:
              "GitHub repository name to connect. Example: 'my-app'",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_artifact",
      description:
        "Save generated code files as a persistent artifact using the proper 8-file folder structure. Call this after writing EACH file (or group of files) to save progress incrementally. Pass ALL files generated so far each time you call it. If you received an artifact_id from a previous call, pass it as artifact_id to update the existing artifact instead of creating a new one. Files are stored and available across sessions.",
      parameters: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "A descriptive title for the artifact. Example: 'TaskFlow SaaS App'",
          },
          files: {
            type: "array",
            description: "Array of ALL generated files so far. Use proper folder paths matching the 8-file structure: 'index.html', 'src/css/styles.css', 'src/css/components.css', 'src/js/config.js', 'src/js/state.js', 'src/js/router.js', 'src/js/components.js', 'src/js/app.js'",
            items: {
              type: "object",
              properties: {
                path: {
                  type: "string",
                  description: "File path with folder structure. Examples: 'index.html', 'src/css/styles.css', 'src/css/components.css', 'src/js/config.js', 'src/js/state.js', 'src/js/router.js', 'src/js/components.js', 'src/js/app.js'",
                },
                content: {
                  type: "string",
                  description: "Complete file content",
                },
              },
              required: ["path", "content"],
            },
          },
          projectId: {
            type: "string",
            description: "Optional project ID to associate this artifact with",
          },
          artifact_id: {
            type: "string",
            description: "Optional ID returned from a previous save_artifact call. When provided, updates the existing artifact with the new file list instead of creating a new one. Use this for incremental saves.",
          },
        },
        required: ["title", "files"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_project_record",
      description:
        "Save a project to the database to track what has been built. Always call this after successfully creating/deploying a project.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Project name",
          },
          description: {
            type: "string",
            description: "What the project does",
          },
          type: {
            type: "string",
            description:
              "Type of project: 'saas', 'mvp', 'landing-page', 'api', 'tool', 'other'",
          },
          githubRepo: {
            type: "string",
            description: "GitHub repository URL",
          },
          vercelUrl: {
            type: "string",
            description: "Live URL of the deployed project",
          },
        },
        required: ["name", "description", "type"],
      },
    },
  },
];
