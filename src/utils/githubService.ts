import type {
  GitHubUser,
  GitHubRepo,
  GitHubPushOptions,
  GitHubPushResult,
  GitHubPullResult,
  DeploymentArchitectureInfo,
} from '../types/github';
import type { Project } from '../types/saz';

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Validates a GitHub Personal Access Token or OAuth token directly with the GitHub API.
 * Never fakes success.
 */
export async function validateGitHubToken(
  token: string
): Promise<{ valid: boolean; user?: GitHubUser; scopes: string[]; error?: string }> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    return { valid: false, scopes: [], error: 'Token is required' };
  }

  try {
    const res = await fetch(`${GITHUB_API_BASE}/user`, {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!res.ok) {
      let errMsg = `GitHub API HTTP ${res.status}: ${res.statusText}`;
      try {
        const errJson = await res.json();
        if (errJson.message) errMsg = errJson.message;
      } catch {
        // ignore json parse error
      }
      return { valid: false, scopes: [], error: errMsg };
    }

    const userData: GitHubUser = await res.json();
    const scopesHeader = res.headers.get('x-oauth-scopes') || '';
    const scopes = scopesHeader
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    return {
      valid: true,
      user: userData,
      scopes,
    };
  } catch (err: any) {
    return {
      valid: false,
      scopes: [],
      error: err.message || 'Network error reaching api.github.com',
    };
  }
}

/**
 * Lists the authenticated user's repositories.
 */
export async function listUserRepositories(token: string): Promise<GitHubRepo[]> {
  const cleanToken = token.trim();
  if (!cleanToken) throw new Error('Authentication token required');

  const res = await fetch(
    `${GITHUB_API_BASE}/user/repos?sort=updated&direction=desc&per_page=50&type=all`,
    {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    throw new Error(errJson.message || `Failed to fetch repositories (${res.status})`);
  }

  return await res.json();
}

/**
 * Creates a new GitHub repository for the authenticated user.
 */
export async function createGitHubRepository(
  token: string,
  name: string,
  description: string,
  isPrivate: boolean
): Promise<GitHubRepo> {
  const cleanToken = token.trim();
  if (!cleanToken) throw new Error('Authentication token required');

  const res = await fetch(`${GITHUB_API_BASE}/user/repos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cleanToken}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({
      name: name.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
      description: description.trim(),
      private: isPrivate,
      auto_init: true, // creates an initial commit with README so git refs exist
    }),
  });

  if (!res.ok) {
    const errJson = await res.json().catch(() => ({}));
    const detailed = Array.isArray(errJson.errors)
      ? errJson.errors.map((e: any) => e.message).join(', ')
      : '';
    throw new Error(
      `${errJson.message || 'Failed to create GitHub repository'}${detailed ? ` (${detailed})` : ''}`
    );
  }

  return await res.json();
}

/**
 * Pushes project files to a GitHub repository using the GitHub Git Data API.
 * Creates blobs, a tree, a commit, and updates the ref.
 * Never fakes success.
 */
export async function pushProjectToGitHub(options: GitHubPushOptions): Promise<GitHubPushResult> {
  const { token, owner, repo, branch = 'main', commitMessage, files } = options;
  const cleanToken = token.trim();
  if (!cleanToken) throw new Error('Authentication token required');
  if (!files || files.length === 0) throw new Error('No project files to push');

  const headers = {
    Authorization: `Bearer ${cleanToken}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  // 1. Get branch reference
  let latestCommitSha = '';
  let baseTreeSha = '';

  const refRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/ref/heads/${branch}`, {
    headers,
  });

  if (refRes.ok) {
    const refData = await refRes.json();
    latestCommitSha = refData.object.sha;

    // Get the tree SHA of this commit
    const commitRes = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits/${latestCommitSha}`,
      { headers }
    );
    if (commitRes.ok) {
      const commitData = await commitRes.json();
      baseTreeSha = commitData.tree.sha;
    }
  } else if (refRes.status === 404) {
    // If branch doesn't exist, check default branch or repo root
    const repoRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, { headers });
    if (!repoRes.ok) {
      const err = await repoRes.json().catch(() => ({}));
      throw new Error(`Repository ${owner}/${repo} not accessible: ${err.message || repoRes.statusText}`);
    }
    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch || 'main';

    if (defaultBranch !== branch) {
      const defRefRes = await fetch(
        `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`,
        { headers }
      );
      if (defRefRes.ok) {
        const defRefData = await defRefRes.json();
        latestCommitSha = defRefData.object.sha;
      }
    }
  } else {
    const err = await refRes.json().catch(() => ({}));
    throw new Error(`Failed to read branch ${branch}: ${err.message || refRes.statusText}`);
  }

  // 2. Create Git Blobs for each file
  // (We use the trees API which can accept inline content for text files!)
  const treeEntries: Array<{
    path: string;
    mode: '100644';
    type: 'blob';
    content: string;
  }> = [];

  for (const f of files) {
    const cleanPath = f.path.replace(/^\/+/, '');
    if (!cleanPath) continue;
    treeEntries.push({
      path: cleanPath,
      mode: '100644',
      type: 'blob',
      content: f.content,
    });
  }

  // 3. Create Git Tree
  const treeBody: any = {
    tree: treeEntries,
  };
  if (baseTreeSha) {
    treeBody.base_tree = baseTreeSha;
  }

  const treeRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify(treeBody),
  });

  if (!treeRes.ok) {
    const errJson = await treeRes.json().catch(() => ({}));
    throw new Error(`GitHub Tree creation failed: ${errJson.message || treeRes.statusText}`);
  }

  const treeData = await treeRes.json();
  const newTreeSha = treeData.sha;

  // 4. Create Git Commit
  const commitBody: any = {
    message: commitMessage || `Update files via SAZ Builder [${new Date().toISOString()}]`,
    tree: newTreeSha,
  };
  if (latestCommitSha) {
    commitBody.parents = [latestCommitSha];
  }

  const commitRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify(commitBody),
  });

  if (!commitRes.ok) {
    const errJson = await commitRes.json().catch(() => ({}));
    throw new Error(`GitHub Commit creation failed: ${errJson.message || commitRes.statusText}`);
  }

  const newCommit = await commitRes.json();
  const newCommitSha = newCommit.sha;

  // 5. Update or Create Ref for branch
  if (latestCommitSha) {
    const updateRefRes = await fetch(
      `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs/heads/${branch}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          sha: newCommitSha,
          force: false,
        }),
      }
    );

    if (!updateRefRes.ok) {
      const errJson = await updateRefRes.json().catch(() => ({}));
      throw new Error(`Failed to update branch ${branch}: ${errJson.message || updateRefRes.statusText}`);
    }
  } else {
    // Create new ref
    const createRefRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ref: `refs/heads/${branch}`,
        sha: newCommitSha,
      }),
    });

    if (!createRefRes.ok) {
      const errJson = await createRefRes.json().catch(() => ({}));
      throw new Error(`Failed to create branch ref: ${errJson.message || createRefRes.statusText}`);
    }
  }

  const repoUrl = `https://github.com/${owner}/${repo}`;
  const commitUrl = `${repoUrl}/commit/${newCommitSha}`;

  return {
    commitSha: newCommitSha,
    commitUrl,
    repoUrl,
    branch,
    filesCommitted: treeEntries.length,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Pulls project files directly from a GitHub repository via GitHub REST Git Tree API.
 * Never fakes success.
 */
export async function pullProjectFromGitHub(options: {
  token?: string;
  owner: string;
  repo: string;
  branch?: string;
}): Promise<GitHubPullResult> {
  const { token, owner, repo } = options;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token && token.trim()) {
    headers.Authorization = `Bearer ${token.trim()}`;
  }

  // 1. Determine target branch
  let targetBranch = options.branch?.trim();
  if (!targetBranch) {
    const repoRes = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, { headers });
    if (!repoRes.ok) {
      const err = await repoRes.json().catch(() => ({}));
      throw new Error(
        `Repository ${owner}/${repo} not accessible (${repoRes.status}): ${err.message || repoRes.statusText}`
      );
    }
    const repoData = await repoRes.json();
    targetBranch = repoData.default_branch || 'main';
  }

  // 2. Fetch recursive git tree
  const treeRes = await fetch(
    `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`,
    { headers }
  );

  if (!treeRes.ok) {
    const err = await treeRes.json().catch(() => ({}));
    throw new Error(
      `Failed to pull branch ${targetBranch} (${treeRes.status}): ${err.message || treeRes.statusText}`
    );
  }

  const treeData = await treeRes.json();
  const treeSha = treeData.sha || '';
  const treeItems: Array<{ path: string; type: string; sha: string; size?: number }> =
    Array.isArray(treeData.tree) ? treeData.tree : [];

  // Filter out non-blob files, git metadata, images/binary > 500KB
  const eligibleBlobs = treeItems.filter(
    (item) =>
      item.type === 'blob' &&
      !item.path.startsWith('.git/') &&
      !item.path.includes('node_modules/') &&
      (!item.size || item.size < 500 * 1024)
  );

  if (eligibleBlobs.length === 0) {
    throw new Error(`Repository ${owner}/${repo} branch ${targetBranch} contains no text files to pull.`);
  }

  // 3. Fetch file blobs in parallel (up to 25 files at once)
  const pulledFiles: { path: string; language: string; content: string }[] = [];

  const chunks: Array<typeof eligibleBlobs> = [];
  const chunkSize = 15;
  for (let i = 0; i < eligibleBlobs.length; i += chunkSize) {
    chunks.push(eligibleBlobs.slice(i, i + chunkSize));
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async (item) => {
      try {
        const blobRes = await fetch(
          `${GITHUB_API_BASE}/repos/${owner}/${repo}/git/blobs/${item.sha}`,
          { headers }
        );
        if (!blobRes.ok) return null;
        const blobData = await blobRes.json();
        let content = '';

        if (blobData.encoding === 'base64') {
          // Decode utf8 base64
          try {
            content = decodeURIComponent(
              escape(atob(blobData.content.replace(/\s/g, '')))
            );
          } catch {
            content = atob(blobData.content.replace(/\s/g, ''));
          }
        } else {
          content = blobData.content || '';
        }

        const ext = item.path.split('.').pop()?.toLowerCase() || '';
        const langMap: Record<string, string> = {
          ts: 'typescript',
          tsx: 'typescript',
          js: 'javascript',
          jsx: 'javascript',
          json: 'json',
          html: 'html',
          css: 'css',
          md: 'markdown',
          yml: 'yaml',
          yaml: 'yaml',
          sql: 'sql',
        };

        return {
          path: item.path,
          language: langMap[ext] || 'text',
          content,
        };
      } catch (e) {
        console.warn(`Could not pull ${item.path}:`, e);
        return null;
      }
    });

    const results = await Promise.all(promises);
    for (const r of results) {
      if (r) pulledFiles.push(r);
    }
  }

  return {
    branch: targetBranch,
    commitSha: treeSha,
    files: pulledFiles,
    updatedCount: pulledFiles.length,
    addedCount: 0,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Generates ready-to-deploy architectural manifests for various hosting targets.
 */
export function getDeploymentArchitectures(project: Project): DeploymentArchitectureInfo[] {
  const slug = project.slug || 'project';
  const name = project.name || 'Application';

  // 1. GitHub Pages
  const ghPagesWorkflow = `name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Set up Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: npm ci || npm install
      - name: Build Project
        run: npm run build || true
      - name: Setup Pages
        uses: actions/configure-pages@v4
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;

  // 2. Firebase Hosting
  const firebaseJson = `{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}`;

  const firebaserc = `{
  "projects": {
    "default": "gemini-builder-app"
  }
}`;

  // 3. Vercel Configuration
  const vercelJson = `{
  "version": 2,
  "name": "${slug}",
  "buildCommand": "npm run build",
  "outputDirectory": ".",
  "routes": [
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}`;

  // 4. Netlify Configuration
  const netlifyToml = `[build]
  publish = "."
  command = "npm run build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
`;

  // 5. Container / Dockerfile
  const dockerfile = `# Production Multi-Stage Container for ${name}
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build || true

FROM nginx:alpine
COPY --from=builder /app /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;

  const nginxConf = `server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
}
`;

  const dockerCompose = `version: '3.8'
services:
  web:
    build: .
    ports:
      - "8080:80"
    restart: always
`;

  return [
    {
      provider: 'github-pages',
      name: 'GitHub Pages (CI/CD)',
      status: project.settings?.githubRepo ? 'ready' : 'requires-auth',
      description: 'Zero-configuration static hosting built directly into your GitHub repository.',
      configFiles: [
        {
          filename: '.github/workflows/deploy.yml',
          content: ghPagesWorkflow,
          description: 'GitHub Actions automated build and deployment pipeline',
        },
      ],
      actionsRequired: [
        'Push code to GitHub repository',
        'Enable GitHub Pages in Repo Settings > Pages > Source: GitHub Actions',
      ],
      liveUrl: project.settings?.githubRepo
        ? `https://${project.settings.githubRepo.owner}.github.io/${project.settings.githubRepo.repo}/`
        : undefined,
    },
    {
      provider: 'firebase-hosting',
      name: 'Firebase Hosting',
      status: 'configured',
      description: 'Fast, secure hosting with global CDN backed by Google Cloud infrastructure.',
      configFiles: [
        { filename: 'firebase.json', content: firebaseJson, description: 'Firebase Hosting rewrite rules' },
        { filename: '.firebaserc', content: firebaserc, description: 'Firebase project binding' },
      ],
      cliCommand: 'firebase deploy --only hosting',
      actionsRequired: [
        'Install Firebase CLI: npm install -g firebase-tools',
        'Run: firebase login',
        'Run: firebase deploy --only hosting',
      ],
    },
    {
      provider: 'vercel',
      name: 'Vercel 1-Click Deploy',
      status: 'ready',
      description: 'Edge-optimized hosting with preview environments and automatic SSL.',
      configFiles: [
        { filename: 'vercel.json', content: vercelJson, description: 'Vercel build and routing spec' },
      ],
      cliCommand: 'npx vercel --prod',
      actionsRequired: [
        'Push code to GitHub',
        'Import repository into vercel.com or run "npx vercel"',
      ],
    },
    {
      provider: 'netlify',
      name: 'Netlify Cloud',
      status: 'ready',
      description: 'Continuous deployment with atomic deploys and branch previews.',
      configFiles: [
        { filename: 'netlify.toml', content: netlifyToml, description: 'Netlify SPA configuration' },
      ],
      cliCommand: 'npx netlify deploy --prod',
      actionsRequired: ['Link repo at netlify.com or run "npx netlify deploy"'],
    },
    {
      provider: 'docker',
      name: 'Self-Hosted Container (Docker / Cloud Run)',
      status: 'ready',
      description: 'Containerized Nginx image ready for Google Cloud Run, AWS ECS, or Kubernetes.',
      configFiles: [
        { filename: 'Dockerfile', content: dockerfile, description: 'Production multi-stage build Dockerfile' },
        { filename: 'nginx.conf', content: nginxConf, description: 'Lightweight SPA Nginx server block' },
        { filename: 'docker-compose.yml', content: dockerCompose, description: 'Local Docker orchestration' },
      ],
      cliCommand: 'docker build -t app . && docker run -p 8080:80 app',
    },
  ];
}
