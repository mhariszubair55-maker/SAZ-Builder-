import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Github,
  Rocket,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  FolderArchive,
  FileCode,
  FileText,
  AlertCircle,
  CheckCircle2,
  Lock,
  Globe,
  GitBranch,
  UploadCloud,
  ArrowDownToLine,
  ShieldAlert,
  Loader2,
  Terminal,
  Cpu,
  Layers,
} from 'lucide-react';
import { useBuilder } from '../context/BuilderContext';
import { downloadProjectZip, downloadSingleFileHtml, downloadFile } from '../utils/zipExport';
import {
  validateGitHubToken,
  listUserRepositories,
  createGitHubRepository,
  pushProjectToGitHub,
  pullProjectFromGitHub,
  getDeploymentArchitectures,
} from '../utils/githubService';
import type { GitHubUser, GitHubRepo, GitHubPushResult, DeploymentArchitectureInfo } from '../types/github';
import type { Project } from '../types/saz';

interface ProjectExportModalProps {
  project?: Project | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectExportModal: React.FC<ProjectExportModalProps> = ({
  project: propProject,
  isOpen,
  onClose,
}) => {
  const {
    activeStudioProject,
    settings: workspaceSettings,
    updateSettings,
    updateProjectSettings,
    updateProjectFile,
    updateProjectPreviewHtml,
    projectErrors,
  } = useBuilder();

  const currentProject = propProject || activeStudioProject;

  const [activeTab, setActiveTab] = useState<'download' | 'github' | 'deploy'>('download');

  // Copy notice states
  const [copiedCodeKey, setCopiedCodeKey] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  // GitHub Connection State
  const [gitHubToken, setGitHubToken] = useState<string>(workspaceSettings.githubToken || '');
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [connectedUser, setConnectedUser] = useState<GitHubUser | null>(
    (workspaceSettings.githubUser as any) || null
  );
  const [userRepos, setUserRepos] = useState<GitHubRepo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);

  // Push to GitHub state
  const [pushMode, setPushMode] = useState<'new' | 'existing'>('new');
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoDesc, setNewRepoDesc] = useState('');
  const [isPrivateRepo, setIsPrivateRepo] = useState(false);
  const [selectedExistingRepo, setSelectedExistingRepo] = useState('');
  const [targetBranch, setTargetBranch] = useState('main');
  const [commitMessage, setCommitMessage] = useState('');
  const [isPushing, setIsPushing] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [pushResult, setPushResult] = useState<GitHubPushResult | null>(null);

  // Pull from GitHub state
  const [pullRepoInput, setPullRepoInput] = useState('');
  const [pullBranch, setPullBranch] = useState('main');
  const [isPulling, setIsPulling] = useState(false);
  const [pullError, setPullError] = useState<string | null>(null);
  const [pullSuccess, setPullSuccess] = useState<string | null>(null);

  // Deployment workflows
  const [deployWorkflowPushed, setDeployWorkflowPushed] = useState(false);
  const [isPushingWorkflow, setIsPushingWorkflow] = useState(false);

  // Pre-flight check state
  const [preFlightStatus, setPreFlightStatus] = useState<'idle' | 'checking' | 'passed' | 'warning'>('idle');

  // Sync token from workspace settings if changed
  useEffect(() => {
    if (workspaceSettings.githubToken) {
      setGitHubToken(workspaceSettings.githubToken);
    }
    if (workspaceSettings.githubUser) {
      setConnectedUser(workspaceSettings.githubUser as any);
    }
  }, [workspaceSettings.githubToken, workspaceSettings.githubUser]);

  // Pre-fill repo names when project opens
  useEffect(() => {
    if (currentProject) {
      setNewRepoName(currentProject.slug || 'my-app');
      setNewRepoDesc(currentProject.summary || `${currentProject.name} built with SAZ Builder`);
      setCommitMessage(`feat: update ${currentProject.name} via SAZ Builder`);
      if (currentProject.settings?.githubRepo) {
        setSelectedExistingRepo(`${currentProject.settings.githubRepo.owner}/${currentProject.settings.githubRepo.repo}`);
        setPullRepoInput(`${currentProject.settings.githubRepo.owner}/${currentProject.settings.githubRepo.repo}`);
        setTargetBranch(currentProject.settings.githubRepo.branch || 'main');
      }
    }
  }, [currentProject?.id]);

  // Listen for OAuth messages from popup window (Skill OAuth Integration pattern)
  useEffect(() => {
    const handleAuthMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }
      if (event.data?.type === 'GITHUB_AUTH_SUCCESS' && event.data?.token) {
        const token = event.data.token;
        setGitHubToken(token);
        await verifyAndSaveToken(token);
      } else if (event.data?.type === 'GITHUB_AUTH_ERROR') {
        setTokenError(event.data.error || 'OAuth authentication failed.');
      }
    };
    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, []);

  if (!isOpen || !currentProject) return null;

  // 1. Token validation
  const verifyAndSaveToken = async (tokenToVerify: string) => {
    const trimmed = tokenToVerify.trim();
    if (!trimmed) {
      setTokenError('Please enter a GitHub Personal Access Token');
      return;
    }

    setIsValidatingToken(true);
    setTokenError(null);

    const result = await validateGitHubToken(trimmed);
    setIsValidatingToken(false);

    if (result.valid && result.user) {
      setConnectedUser(result.user);
      updateSettings({
        githubToken: trimmed,
        githubUser: {
          login: result.user.login,
          avatar_url: result.user.avatar_url,
          name: result.user.name || undefined,
          html_url: result.user.html_url,
        },
      });

      // Load repositories
      loadUserRepos(trimmed);
    } else {
      setTokenError(result.error || 'Invalid GitHub token. Verify scopes include "repo".');
    }
  };

  const handleDisconnectGitHub = () => {
    setConnectedUser(null);
    setGitHubToken('');
    setUserRepos([]);
    updateSettings({
      githubToken: undefined,
      githubUser: undefined,
    });
  };

  const loadUserRepos = async (token: string) => {
    setIsLoadingRepos(true);
    try {
      const repos = await listUserRepositories(token);
      setUserRepos(repos);
    } catch (err: any) {
      console.warn('Failed to load user repos:', err);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  // 2. OAuth Popup Trigger
  const handleStartOAuth = async () => {
    setTokenError(null);
    try {
      const res = await fetch('/api/auth/github/url');
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'GitHub OAuth credentials not configured on server. Please use a Personal Access Token.');
      }
      const { url } = await res.json();
      const authWindow = window.open(url, 'github_oauth_popup', 'width=620,height=720');
      if (!authWindow) {
        setTokenError('Popup was blocked by your browser. Please allow popups or use Personal Access Token below.');
      }
    } catch (err: any) {
      setTokenError(err.message || 'Could not initiate GitHub OAuth.');
    }
  };

  // 3. Download ZIP
  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      await downloadProjectZip(currentProject);
    } catch (err: any) {
      alert(`ZIP Download failed: ${err.message}`);
    } finally {
      setIsZipping(false);
    }
  };

  // 4. Push Project to GitHub
  const handlePushToGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!connectedUser || !gitHubToken) {
      setPushError('Please connect your GitHub account first.');
      return;
    }

    setIsPushing(true);
    setPushError(null);
    setPushResult(null);

    try {
      let targetOwner = connectedUser.login;
      let targetRepoName = '';

      if (pushMode === 'new') {
        const repoName = newRepoName.trim();
        if (!repoName) throw new Error('Repository name is required.');
        // Create new repository
        const createdRepo = await createGitHubRepository(
          gitHubToken,
          repoName,
          newRepoDesc.trim(),
          isPrivateRepo
        );
        targetRepoName = createdRepo.name;
        targetOwner = createdRepo.full_name.split('/')[0] || connectedUser.login;
      } else {
        if (!selectedExistingRepo) throw new Error('Please select an existing repository.');
        const [owner, name] = selectedExistingRepo.split('/');
        targetOwner = owner;
        targetRepoName = name;
      }

      // Prepare files to push
      const filesToPush = (currentProject.files || []).map((f) => ({
        path: f.path,
        content: f.content,
      }));

      // Push files via GitHub Git Data API
      const result = await pushProjectToGitHub({
        token: gitHubToken,
        owner: targetOwner,
        repo: targetRepoName,
        branch: targetBranch || 'main',
        commitMessage: commitMessage || `Update ${currentProject.name} via SAZ Builder`,
        files: filesToPush,
      });

      setPushResult(result);

      // Save repository reference to project settings
      updateProjectSettings(currentProject.id, {
        githubRepo: {
          owner: targetOwner,
          repo: targetRepoName,
          branch: targetBranch || 'main',
          url: result.repoUrl,
          lastPushedAt: result.timestamp,
        },
      });

      // Reload repos
      loadUserRepos(gitHubToken);
    } catch (err: any) {
      console.error('Push error:', err);
      setPushError(err.message || 'Push to GitHub failed.');
    } finally {
      setIsPushing(false);
    }
  };

  // 5. Pull Project from GitHub
  const handlePullFromGitHub = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = pullRepoInput
      .trim()
      .replace(/^https?:\/\/github\.com\//i, '')
      .replace(/\.git$/i, '')
      .replace(/\/$/, '');

    const parts = cleanInput.split('/');
    if (parts.length < 2) {
      setPullError('Please provide repository in "owner/repo" format (e.g. username/repo-name).');
      return;
    }

    const [owner, repo] = parts;
    setIsPulling(true);
    setPullError(null);
    setPullSuccess(null);

    try {
      const result = await pullProjectFromGitHub({
        token: gitHubToken || undefined,
        owner,
        repo,
        branch: pullBranch || undefined,
      });

      // Update project files with pulled content
      let updatedCount = 0;
      let addedCount = 0;

      for (const pulledFile of result.files) {
        const existing = currentProject.files.find((f) => f.path.toLowerCase() === pulledFile.path.toLowerCase());
        if (existing) {
          updateProjectFile(currentProject.id, pulledFile.path, pulledFile.content);
          updatedCount++;
        } else {
          updateProjectFile(currentProject.id, pulledFile.path, pulledFile.content);
          addedCount++;
        }

        // If index.html pulled, update preview
        if (pulledFile.path.toLowerCase() === 'index.html') {
          updateProjectPreviewHtml(currentProject.id, pulledFile.content);
        }
      }

      // Update settings
      updateProjectSettings(currentProject.id, {
        githubRepo: {
          owner,
          repo,
          branch: result.branch,
          url: `https://github.com/${owner}/${repo}`,
          lastPulledAt: result.timestamp,
        },
      });

      setPullSuccess(
        `Successfully pulled ${result.files.length} files from ${owner}/${repo} (${result.branch})! Updated: ${updatedCount}, Added: ${addedCount}`
      );
    } catch (err: any) {
      console.error('Pull error:', err);
      setPullError(err.message || 'Failed to pull repository from GitHub.');
    } finally {
      setIsPulling(false);
    }
  };

  // 6. Push GitHub Pages CI/CD Workflow
  const handlePushGitHubPagesWorkflow = async () => {
    if (!currentProject.settings?.githubRepo || !gitHubToken) {
      alert('Project must be pushed to a GitHub repository first.');
      return;
    }
    const { owner, repo, branch } = currentProject.settings.githubRepo;
    const archs = getDeploymentArchitectures(currentProject);
    const ghPages = archs.find((a) => a.provider === 'github-pages');
    const workflowFile = ghPages?.configFiles[0];

    if (!workflowFile) return;

    setIsPushingWorkflow(true);
    try {
      await pushProjectToGitHub({
        token: gitHubToken,
        owner,
        repo,
        branch: branch || 'main',
        commitMessage: 'ci: add GitHub Pages automated deployment workflow',
        files: [{ path: workflowFile.filename, content: workflowFile.content }],
      });
      setDeployWorkflowPushed(true);
      setTimeout(() => setDeployWorkflowPushed(false), 4000);
    } catch (err: any) {
      alert(`Could not push workflow: ${err.message}`);
    } finally {
      setIsPushingWorkflow(false);
    }
  };

  // 7. Run Pre-flight Health Check
  const handleRunPreFlightCheck = () => {
    setPreFlightStatus('checking');
    setTimeout(() => {
      const activeErrors = projectErrors.filter((e) => !e.resolved);
      const hasIndexHtml = currentProject.files.some((f) => f.path.toLowerCase() === 'index.html');
      if (activeErrors.length > 0 || !hasIndexHtml) {
        setPreFlightStatus('warning');
      } else {
        setPreFlightStatus('passed');
      }
    }, 600);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCodeKey(key);
    setTimeout(() => setCopiedCodeKey(null), 1800);
  };

  const deploymentArchitectures = getDeploymentArchitectures(currentProject);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Project Export & GitHub Integration"
    >
      <div className="w-full max-w-4xl max-h-[92vh] bg-slate-950 border border-slate-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <header className="px-6 py-4 border-b border-slate-800/90 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Export & GitHub Integration</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-normal">
                  {currentProject.name}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Download source code, sync with GitHub repositories, and inspect cloud deployment targets.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-slate-800 hover:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Modal Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-slate-800/80 bg-slate-900/30 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('download')}
            className={`min-h-[38px] px-3.5 py-1.5 border-b-2 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'download'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderArchive className="w-4 h-4" />
            <span>Download & Source Code</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('github')}
            className={`min-h-[38px] px-3.5 py-1.5 border-b-2 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer relative ${
              activeTab === 'github'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-4 h-4" />
            <span>GitHub Sync & Push</span>
            {connectedUser && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('deploy')}
            className={`min-h-[38px] px-3.5 py-1.5 border-b-2 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'deploy'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Rocket className="w-4 h-4" />
            <span>Deployment Architecture</span>
          </button>
        </div>

        {/* Modal Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: DOWNLOAD & SOURCE CODE */}
          {activeTab === 'download' && (
            <div className="space-y-6">
              {/* Primary Action Hero */}
              <div className="p-5 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-slate-900/60 to-slate-900 border-dashed flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                    <FolderArchive className="w-4 h-4" />
                    <span>Production Project Archive (.zip)</span>
                  </div>
                  <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                    Downloads all <strong>{currentProject.files.length} project files</strong> formatted and packaged with standard <code>package.json</code>, <code>README.md</code>, <code>.gitignore</code>, and local development configurations. Ready to run with <code>npm install && npm run dev</code>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={isZipping}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shrink-0 transition-transform active:scale-95 cursor-pointer shadow-lg shadow-amber-500/20"
                >
                  {isZipping ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Packaging ZIP...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download {currentProject.slug}.zip</span>
                    </>
                  )}
                </button>
              </div>

              {/* Alternate Export Formats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Standalone HTML */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <FileCode className="w-3.5 h-3.5 text-sky-400" />
                        <span>Executable Standalone HTML</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Self-contained single-file HTML document with embedded styles and JavaScript. Double-click to open in any web browser.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => downloadSingleFileHtml(currentProject)}
                    className="w-full min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800/80 hover:bg-slate-800 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                    <span>Download {currentProject.slug}-standalone.html</span>
                  </button>
                </div>

                {/* SAZ Project JSON Bundle */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        <span>SAZ Architecture Manifest (JSON)</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Complete project state, prompt revision history, and file hierarchy. Can be re-imported into any SAZ Builder workspace.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const json = JSON.stringify(currentProject, null, 2);
                      downloadFile(`${currentProject.slug}-bundle.json`, json, 'application/json');
                    }}
                    className="w-full min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800/80 hover:bg-slate-800 text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download {currentProject.slug}-bundle.json</span>
                  </button>
                </div>
              </div>

              {/* File Browser with Quick Copy/Download */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="font-semibold text-slate-200">
                    Project Source Files ({currentProject.files.length})
                  </span>
                  <span>Click to copy code or download individually</span>
                </div>
                <div className="border border-slate-800 rounded-xl divide-y divide-slate-800/80 bg-slate-900/30 overflow-hidden max-h-60 overflow-y-auto">
                  {currentProject.files.map((file) => (
                    <div
                      key={file.path}
                      className="px-3.5 py-2 flex items-center justify-between text-xs hover:bg-slate-900/60 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0 font-mono text-[11px] text-slate-300">
                        <span className="text-amber-400/80">📄</span>
                        <span className="truncate">{file.path}</span>
                        <span className="text-[10px] text-slate-500 uppercase">({file.language})</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(file.content, file.path)}
                          title="Copy file contents"
                          className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
                        >
                          {copiedCodeKey === file.path ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const filename = file.path.split('/').pop() || 'file.txt';
                            downloadFile(filename, file.content);
                          }}
                          title="Download this file"
                          className="p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GITHUB CONNECTION & SYNC */}
          {activeTab === 'github' && (
            <div className="space-y-6">
              {/* GitHub Connection Card */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-100">
                      <Github className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                        <span>GitHub Account Connection</span>
                        {connectedUser ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Connected
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium">
                            Not Connected
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Connect with a Personal Access Token or OAuth to push code, create repositories, and pull updates.
                      </p>
                    </div>
                  </div>

                  {connectedUser && (
                    <button
                      type="button"
                      onClick={handleDisconnectGitHub}
                      className="px-3 py-1 rounded-lg border border-rose-500/40 hover:bg-rose-950/40 text-rose-300 text-xs font-medium transition cursor-pointer self-start sm:self-auto"
                    >
                      Disconnect Account
                    </button>
                  )}
                </div>

                {/* Connected User Profile Badge */}
                {connectedUser ? (
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={connectedUser.avatar_url}
                        alt={connectedUser.login}
                        className="w-10 h-10 rounded-full border border-slate-700 object-cover"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                          <span>{connectedUser.name || connectedUser.login}</span>
                          <span className="text-slate-400 font-mono font-normal">(@{connectedUser.login})</span>
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{connectedUser.public_repos} public repos</span>
                          {connectedUser.total_private_repos !== undefined && (
                            <>
                              <span>·</span>
                              <span>{connectedUser.total_private_repos} private repos</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <a
                      href={connectedUser.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      <span>Profile</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Method 1: Personal Access Token (Recommended & Direct) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <label className="font-semibold text-slate-200">
                          GitHub Personal Access Token (PAT)
                        </label>
                        <a
                          href="https://github.com/settings/tokens/new?scopes=repo,read:user,user:email&description=SAZ%20Builder%20App"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:text-amber-300 flex items-center gap-1 text-[11px]"
                        >
                          <span>Generate Token on GitHub</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="password"
                          value={gitHubToken}
                          onChange={(e) => setGitHubToken(e.target.value)}
                          placeholder="ghp_... or github_pat_..."
                          className="flex-1 min-h-[40px] px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                        />
                        <button
                          type="button"
                          onClick={() => verifyAndSaveToken(gitHubToken)}
                          disabled={isValidatingToken || !gitHubToken.trim()}
                          className="min-h-[40px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          {isValidatingToken ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Verifying...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Verify & Connect</span>
                            </>
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Requires <code>repo</code> scope for private/public commits, and <code>read:user</code> for profile verification.
                      </p>
                    </div>

                    {/* Method 2: OAuth Popup */}
                    <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs text-slate-400">Or use GitHub OAuth authentication:</span>
                      <button
                        type="button"
                        onClick={handleStartOAuth}
                        className="min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-600 bg-slate-800 text-xs font-medium text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Github className="w-3.5 h-3.5" />
                        <span>Connect with GitHub OAuth</span>
                      </button>
                    </div>
                  </div>
                )}

                {tokenError && (
                  <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-950/40 flex items-start gap-2.5 text-xs text-rose-300">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>Authentication Error:</strong> {tokenError}
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION: PUSH TO GITHUB */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-amber-400" />
                    <span>Push Project to GitHub</span>
                  </h3>
                  <div className="flex items-center gap-1 p-0.5 bg-slate-900 border border-slate-800 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setPushMode('new')}
                      className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                        pushMode === 'new' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Create New Repo
                    </button>
                    <button
                      type="button"
                      onClick={() => setPushMode('existing')}
                      className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                        pushMode === 'existing' ? 'bg-amber-500 text-slate-950 font-semibold' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Existing Repo
                    </button>
                  </div>
                </div>

                <form onSubmit={handlePushToGitHub} className="space-y-4">
                  {pushMode === 'new' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Repository Name
                        </label>
                        <input
                          type="text"
                          value={newRepoName}
                          onChange={(e) => setNewRepoName(e.target.value)}
                          placeholder="e.g. smart-calculator-app"
                          required
                          className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Visibility
                        </label>
                        <select
                          value={isPrivateRepo ? 'private' : 'public'}
                          onChange={(e) => setIsPrivateRepo(e.target.value === 'private')}
                          className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                        >
                          <option value="public">🌐 Public (Visible to everyone)</option>
                          <option value="private">🔒 Private (Only you and collaborators)</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-slate-300 mb-1">
                          Description (Optional)
                        </label>
                        <input
                          type="text"
                          value={newRepoDesc}
                          onChange={(e) => setNewRepoDesc(e.target.value)}
                          placeholder="Description of this application"
                          className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Select Existing Repository
                      </label>
                      {userRepos.length > 0 ? (
                        <select
                          value={selectedExistingRepo}
                          onChange={(e) => setSelectedExistingRepo(e.target.value)}
                          className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                        >
                          <option value="">-- Choose a repository --</option>
                          {userRepos.map((r) => (
                            <option key={r.id} value={r.full_name}>
                              {r.full_name} {r.private ? '(Private)' : '(Public)'}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={selectedExistingRepo}
                            onChange={(e) => setSelectedExistingRepo(e.target.value)}
                            placeholder="username/repository-name"
                            className="flex-1 min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs text-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() => gitHubToken && loadUserRepos(gitHubToken)}
                            disabled={isLoadingRepos || !gitHubToken}
                            className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-xs text-slate-300 hover:text-white"
                          >
                            {isLoadingRepos ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Load Repos'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Commit Message
                      </label>
                      <input
                        type="text"
                        value={commitMessage}
                        onChange={(e) => setCommitMessage(e.target.value)}
                        placeholder="feat: commit message"
                        className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Branch
                      </label>
                      <input
                        type="text"
                        value={targetBranch}
                        onChange={(e) => setTargetBranch(e.target.value)}
                        placeholder="main"
                        className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                      Files to commit: <strong className="text-slate-200">{currentProject.files.length}</strong>
                    </div>

                    <button
                      type="submit"
                      disabled={isPushing || !connectedUser}
                      className="min-h-[40px] px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 cursor-pointer transition shadow-md"
                    >
                      {isPushing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Pushing to GitHub...</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          <span>Push Code to GitHub</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Push Error Display */}
                {pushError && (
                  <div className="p-3.5 rounded-xl border border-rose-500/40 bg-rose-950/40 flex items-start gap-2.5 text-xs text-rose-300">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>GitHub Push Operation Failed:</strong> {pushError}
                    </div>
                  </div>
                )}

                {/* Push Success Result */}
                {pushResult && (
                  <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/30 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Successfully pushed to GitHub!</span>
                    </div>
                    <div className="text-xs text-slate-300 space-y-1 font-mono text-[11px]">
                      <div>
                        Repository:{' '}
                        <a
                          href={pushResult.repoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-amber-400 hover:underline inline-flex items-center gap-1"
                        >
                          {pushResult.repoUrl} <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div>Branch: {pushResult.branch}</div>
                      <div>
                        Commit SHA:{' '}
                        <a
                          href={pushResult.commitUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                        >
                          {pushResult.commitSha.slice(0, 10)} <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div>Files committed: {pushResult.filesCommitted}</div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION: PULL FROM GITHUB */}
              <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <ArrowDownToLine className="w-4 h-4 text-sky-400" />
                    <span>Pull Project from GitHub</span>
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Sync changes made on GitHub back into SAZ Builder
                  </span>
                </div>

                <form onSubmit={handlePullFromGitHub} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        GitHub Repository (owner/repo)
                      </label>
                      <input
                        type="text"
                        value={pullRepoInput}
                        onChange={(e) => setPullRepoInput(e.target.value)}
                        placeholder="e.g. username/repo-name"
                        required
                        className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Branch
                      </label>
                      <input
                        type="text"
                        value={pullBranch}
                        onChange={(e) => setPullBranch(e.target.value)}
                        placeholder="main"
                        className="w-full min-h-[38px] px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 font-mono text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-slate-500">
                      Pulls and updates files in the active project and persists to Firestore.
                    </p>
                    <button
                      type="submit"
                      disabled={isPulling}
                      className="min-h-[38px] px-4 py-2 rounded-xl border border-sky-500/40 bg-sky-950/40 hover:bg-sky-900/50 text-sky-300 font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {isPulling ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Pulling...</span>
                        </>
                      ) : (
                        <>
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                          <span>Pull Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {pullError && (
                  <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-950/40 text-xs text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <strong>GitHub Pull Failed:</strong> {pullError}
                    </div>
                  </div>
                )}

                {pullSuccess && (
                  <div className="p-3 rounded-xl border border-emerald-500/40 bg-emerald-950/30 text-xs text-emerald-300 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>{pullSuccess}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DEPLOYMENT ARCHITECTURE */}
          {activeTab === 'deploy' && (
            <div className="space-y-6">
              {/* Pre-Flight Health Banner */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-100">
                      Pre-Deployment Diagnostic Check
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Verifies HTML entrypoint, syntax integrity, and that no fatal runtime errors exist.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {preFlightStatus === 'passed' && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      Build Healthy (0 errors)
                    </span>
                  )}
                  {preFlightStatus === 'warning' && (
                    <span className="text-xs text-rose-400 flex items-center gap-1 font-semibold">
                      <AlertCircle className="w-4 h-4" />
                      Errors detected
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleRunPreFlightCheck}
                    disabled={preFlightStatus === 'checking'}
                    className="min-h-[34px] px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition cursor-pointer flex items-center gap-1"
                  >
                    {preFlightStatus === 'checking' ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Checking...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Run Diagnostic</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Provider Architecture Cards */}
              <div className="space-y-4">
                {deploymentArchitectures.map((arch) => (
                  <div
                    key={arch.provider}
                    className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-bold text-slate-100">{arch.name}</span>
                        {arch.status === 'ready' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-semibold">
                            Ready
                          </span>
                        )}
                        {arch.status === 'configured' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-400 font-semibold">
                            Configured
                          </span>
                        )}
                        {arch.status === 'requires-auth' && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-semibold">
                            Requires GitHub Push
                          </span>
                        )}
                      </div>

                      {arch.provider === 'github-pages' && currentProject.settings?.githubRepo && (
                        <button
                          type="button"
                          onClick={handlePushGitHubPagesWorkflow}
                          disabled={isPushingWorkflow || deployWorkflowPushed}
                          className="min-h-[32px] px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
                        >
                          {isPushingWorkflow ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Pushing Workflow...</span>
                            </>
                          ) : deployWorkflowPushed ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Workflow Pushed!</span>
                            </>
                          ) : (
                            <>
                              <UploadCloud className="w-3 h-3" />
                              <span>Push CI/CD Workflow to Repo</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-300">{arch.description}</p>

                    {/* Actions required */}
                    {arch.actionsRequired && (
                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1 text-xs">
                        <span className="font-semibold text-slate-400 text-[11px] uppercase tracking-wide">
                          Deployment Steps:
                        </span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
                          {arch.actionsRequired.map((step, idx) => (
                            <li key={idx}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* CLI command if present */}
                    {arch.cliCommand && (
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-xs">
                        <span className="text-amber-400 select-all">$ {arch.cliCommand}</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(arch.cliCommand || '', arch.provider)}
                          className="text-slate-400 hover:text-slate-200 transition p-1 cursor-pointer"
                        >
                          {copiedCodeKey === arch.provider ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}

                    {/* Config file preview toggle */}
                    <div className="space-y-1.5 pt-1">
                      {arch.configFiles.map((cfg) => (
                        <details
                          key={cfg.filename}
                          className="group border border-slate-800 rounded-lg bg-slate-950/60 overflow-hidden"
                        >
                          <summary className="px-3 py-2 text-xs font-mono text-slate-300 flex items-center justify-between cursor-pointer hover:bg-slate-900/80 select-none">
                            <span className="flex items-center gap-2">
                              <span>📄</span>
                              <span>{cfg.filename}</span>
                              <span className="text-slate-500 font-sans text-[11px]">
                                ({cfg.description})
                              </span>
                            </span>
                            <span className="text-slate-500 text-[10px] group-open:rotate-180 transition-transform">
                              ▼
                            </span>
                          </summary>
                          <div className="p-3 bg-slate-950 border-t border-slate-800 font-mono text-[11px] text-slate-300 overflow-x-auto relative">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(cfg.content, cfg.filename)}
                              className="absolute top-2 right-2 p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                              title="Copy configuration"
                            >
                              {copiedCodeKey === cfg.filename ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            <pre>{cfg.content}</pre>
                          </div>
                        </details>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <footer className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Project: <strong className="text-slate-200">{currentProject.name}</strong></span>
            {currentProject.settings?.githubRepo && (
              <>
                <span>·</span>
                <a
                  href={currentProject.settings.githubRepo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:underline inline-flex items-center gap-1"
                >
                  <Github className="w-3 h-3" />
                  <span>{currentProject.settings.githubRepo.owner}/{currentProject.settings.githubRepo.repo}</span>
                </a>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-200 font-medium cursor-pointer transition"
          >
            Close
          </button>
        </footer>
      </div>
    </div>
  );
};
