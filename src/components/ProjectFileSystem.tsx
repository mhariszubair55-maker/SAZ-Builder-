import React, { useState, useMemo, useEffect } from 'react';
import {
  Folder,
  FolderOpen,
  FileCode,
  FileJson,
  FileText,
  File,
  ChevronRight,
  ChevronDown,
  Plus,
  FolderPlus,
  Search,
  Pencil,
  Trash2,
  Move,
  X,
  AlertCircle,
  Eye,
  Columns,
} from 'lucide-react';
import { useBuilder } from '../context/BuilderContext';
import { Project, ProjectFile } from '../types/saz';
import { CodeEditor } from './CodeEditor';
import { LivePreviewEngine } from './LivePreviewEngine';

interface ProjectFileSystemProps {
  project: Project;
  onPreviewRefresh?: () => void;
}

interface TreeNode {
  path: string; // full path (e.g., 'src/components' or 'src/App.tsx')
  name: string; // display name
  isFolder: boolean;
  children: TreeNode[];
  file?: ProjectFile;
}

export const ProjectFileSystem: React.FC<ProjectFileSystemProps> = ({
  project,
  onPreviewRefresh,
}) => {
  const {
    addProjectFile,
    createProjectFolder,
    renameProjectFile,
    renameProjectFolder,
    deleteProjectFile,
    deleteProjectFolder,
    moveProjectItem,
    updateProjectFile,
    updateProjectPreviewHtml,
  } = useBuilder();

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Open file tabs & active file
  const [openTabs, setOpenTabs] = useState<string[]>(() => {
    return project.files[0]?.path ? [project.files[0].path] : ['preview.html'];
  });
  const [activeFilePath, setActiveFilePath] = useState<string>(() => {
    return project.files[0]?.path || 'preview.html';
  });

  // Current file content for editor
  const [editorContent, setEditorContent] = useState<string>('');

  // Folder collapse state: Set of folder paths that are expanded
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => {
    const s = new Set<string>();
    s.add(''); // root
    (project.folders || []).forEach((f) => s.add(f));
    return s;
  });

  // Target folder for new items (defaults to root)
  const [targetFolder, setTargetFolder] = useState<string>('');

  // Split preview state
  const [isSplitPreviewOpen, setIsSplitPreviewOpen] = useState(false);

  // Creation dialogs
  const [createMode, setCreateMode] = useState<'file' | 'folder' | null>(null);
  const [newPathInput, setNewPathInput] = useState('');
  const [newFileLang, setNewFileLang] = useState('tsx');
  const [creationError, setCreationError] = useState('');

  // Rename dialog
  const [itemToRename, setItemToRename] = useState<{ path: string; isFolder: boolean } | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [renameError, setRenameError] = useState('');

  // Delete dialog
  const [itemToDelete, setItemToDelete] = useState<{ path: string; isFolder: boolean } | null>(null);

  // Move dialog
  const [itemToMove, setItemToMove] = useState<{ path: string; isFolder: boolean } | null>(null);
  const [destinationFolderInput, setDestinationFolderInput] = useState<string>('');

  // Load active file content
  useEffect(() => {
    if (activeFilePath === 'preview.html') {
      setEditorContent(project.previewHtml);
    } else {
      const file = project.files.find((f) => f.path === activeFilePath);
      if (file) {
        setEditorContent(file.content);
      }
    }
  }, [activeFilePath, project.files, project.previewHtml]);

  // Handle open file selection
  const handleOpenFile = (path: string) => {
    if (!openTabs.includes(path)) {
      setOpenTabs((prev) => [...prev, path]);
    }
    setActiveFilePath(path);
  };

  const handleCloseTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = openTabs.filter((t) => t !== path);
    setOpenTabs(remaining);
    if (activeFilePath === path) {
      if (remaining.length > 0) {
        setActiveFilePath(remaining[remaining.length - 1]);
      } else {
        const fallback = project.files[0]?.path || 'preview.html';
        setActiveFilePath(fallback);
        setOpenTabs([fallback]);
      }
    }
  };

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  // Build the hierarchical tree structure from files and folders
  const fileTree = useMemo(() => {
    const root: TreeNode = { path: '', name: 'root', isFolder: true, children: [] };
    const allFolderPaths = new Set<string>();

    (project.folders || []).forEach((f) => {
      const parts = f.split('/');
      let curr = '';
      parts.forEach((p) => {
        curr = curr ? `${curr}/${p}` : p;
        allFolderPaths.add(curr);
      });
    });

    project.files.forEach((f) => {
      const parts = f.path.split('/');
      parts.pop();
      let curr = '';
      parts.forEach((p) => {
        curr = curr ? `${curr}/${p}` : p;
        allFolderPaths.add(curr);
      });
    });

    const getOrCreateFolderNode = (folderPath: string): TreeNode => {
      if (!folderPath) return root;
      const parts = folderPath.split('/');
      let currNode = root;
      let curPath = '';

      parts.forEach((part) => {
        curPath = curPath ? `${curPath}/${part}` : part;
        let found = currNode.children.find((c) => c.isFolder && c.name === part);
        if (!found) {
          found = {
            path: curPath,
            name: part,
            isFolder: true,
            children: [],
          };
          currNode.children.push(found);
        }
        currNode = found;
      });
      return currNode;
    };

    Array.from(allFolderPaths)
      .sort((a, b) => a.localeCompare(b))
      .forEach((f) => getOrCreateFolderNode(f));

    project.files.forEach((file) => {
      const parts = file.path.split('/');
      const fileName = parts.pop() || file.path;
      const folderPath = parts.join('/');
      const parent = getOrCreateFolderNode(folderPath);

      parent.children.push({
        path: file.path,
        name: fileName,
        isFolder: false,
        children: [],
        file,
      });
    });

    const sortNodes = (node: TreeNode) => {
      node.children.sort((a, b) => {
        if (a.isFolder === b.isFolder) {
          return a.name.localeCompare(b.name);
        }
        return a.isFolder ? -1 : 1;
      });
      node.children.forEach(sortNodes);
    };
    sortNodes(root);

    return root;
  }, [project.files, project.folders]);

  // List of all available destination folders for the Move dialog
  const allAvailableFolders = useMemo(() => {
    const list: string[] = ['']; // root
    (project.folders || []).forEach((f) => list.push(f));
    project.files.forEach((f) => {
      const parts = f.path.split('/');
      parts.pop();
      const folder = parts.join('/');
      if (folder && !list.includes(folder)) list.push(folder);
    });
    return Array.from(new Set(list)).sort();
  }, [project.files, project.folders]);

  // Create submission
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = newPathInput.trim().replace(/^\/+/, '');
    if (!raw) {
      setCreationError('Please enter a valid name.');
      return;
    }
    const fullPath = targetFolder ? `${targetFolder}/${raw}` : raw;

    if (createMode === 'file') {
      const ext = raw.split('.').pop() || '';
      const inferredLang =
        ext === 'tsx' || ext === 'jsx'
          ? 'tsx'
          : ext === 'ts' || ext === 'js'
          ? 'ts'
          : ext === 'json'
          ? 'json'
          : ext === 'css'
          ? 'css'
          : ext === 'html'
          ? 'html'
          : newFileLang;

      const defaultBoilerplate =
        inferredLang === 'tsx'
          ? `import React from 'react';\n\nexport const ${raw.replace(/[^a-zA-Z0-9]/g, '') || 'Component'} = () => {\n  return <div>Component loaded</div>;\n};\n`
          : inferredLang === 'ts'
          ? `// ${fullPath}\nexport interface Config {\n  timestamp: number;\n}\n`
          : inferredLang === 'json'
          ? `{\n  "name": "${raw}"\n}\n`
          : `/* ${fullPath} */\n`;

      const success = addProjectFile(project.id, fullPath, inferredLang, defaultBoilerplate);
      if (!success) {
        setCreationError('A file with this name or path already exists.');
        return;
      }
      handleOpenFile(fullPath);
    } else if (createMode === 'folder') {
      const success = createProjectFolder(project.id, fullPath);
      if (!success) {
        setCreationError('A folder with this name already exists.');
        return;
      }
      setExpandedFolders((prev) => new Set([...prev, fullPath]));
    }

    setCreateMode(null);
    setNewPathInput('');
    setCreationError('');
  };

  // Rename submission
  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToRename) return;
    const newName = renameInput.trim().replace(/^\/+/, '').replace(/\/+$/, '');
    if (!newName) {
      setRenameError('Name cannot be empty.');
      return;
    }

    if (itemToRename.isFolder) {
      const parts = itemToRename.path.split('/');
      parts[parts.length - 1] = newName;
      const newFolderPath = parts.join('/');
      const ok = renameProjectFolder(project.id, itemToRename.path, newFolderPath);
      if (!ok) {
        setRenameError('Folder with this name already exists.');
        return;
      }
    } else {
      const parts = itemToRename.path.split('/');
      parts[parts.length - 1] = newName;
      const newFilePath = parts.join('/');
      const ok = renameProjectFile(project.id, itemToRename.path, newFilePath);
      if (!ok) {
        setRenameError('File with this name already exists.');
        return;
      }
      setOpenTabs((prev) => prev.map((t) => (t === itemToRename.path ? newFilePath : t)));
      if (activeFilePath === itemToRename.path) {
        setActiveFilePath(newFilePath);
      }
    }

    setItemToRename(null);
    setRenameInput('');
    setRenameError('');
  };

  // Delete submission
  const handleDeleteConfirm = () => {
    if (!itemToDelete) return;
    if (itemToDelete.isFolder) {
      deleteProjectFolder(project.id, itemToDelete.path);
      setOpenTabs((prev) => prev.filter((t) => !t.startsWith(itemToDelete.path + '/')));
      if (activeFilePath.startsWith(itemToDelete.path + '/')) {
        const remaining = project.files.filter((f) => !f.path.startsWith(itemToDelete.path + '/'));
        setActiveFilePath(remaining[0]?.path || 'preview.html');
      }
    } else {
      deleteProjectFile(project.id, itemToDelete.path);
      handleCloseTab(itemToDelete.path, { stopPropagation: () => {} } as any);
    }
    setItemToDelete(null);
  };

  // Move submission
  const handleMoveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemToMove) return;
    const dest = destinationFolderInput.trim().replace(/^\/+/, '');
    const ok = moveProjectItem(project.id, itemToMove.path, dest, itemToMove.isFolder);
    if (!ok) {
      alert('Unable to move item. Ensure target does not collide or nest inside itself.');
      return;
    }
    setItemToMove(null);
  };

  const renderFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'tsx':
      case 'jsx':
      case 'ts':
      case 'js':
        return <FileCode className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'json':
        return <FileJson className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
      case 'html':
      case 'css':
        return <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />;
      default:
        return <File className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    }
  };

  const renderTreeNode = (node: TreeNode, depth = 0) => {
    if (node.path === '') {
      return <div className="space-y-0.5">{node.children.map((c) => renderTreeNode(c, depth))}</div>;
    }

    const nodeMatchesSearch = (n: TreeNode): boolean => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      if (n.name.toLowerCase().includes(q) || n.path.toLowerCase().includes(q)) return true;
      if (n.file && n.file.content.toLowerCase().includes(q)) return true;
      return n.children.some(nodeMatchesSearch);
    };

    if (searchQuery.trim() && !nodeMatchesSearch(node)) {
      return null;
    }

    const isFolder = node.isFolder;
    const isExpanded = expandedFolders.has(node.path) || searchQuery.trim().length > 0;
    const isActive = !isFolder && activeFilePath === node.path;

    return (
      <div key={node.path} className="text-xs select-none">
        <div
          style={{ paddingLeft: `${Math.max(depth * 14, 6)}px` }}
          className={`group flex items-center justify-between py-1.5 pr-2 rounded-lg transition-colors cursor-pointer ${
            isActive
              ? 'bg-amber-500/15 text-amber-300 font-semibold'
              : 'text-slate-300 hover:bg-slate-800/60'
          }`}
          onClick={() => {
            if (isFolder) {
              toggleFolder(node.path);
              setTargetFolder(node.path);
            } else {
              handleOpenFile(node.path);
            }
          }}
        >
          <div className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
            {isFolder ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFolder(node.path);
                  }}
                  className="p-0.5 text-slate-500 hover:text-slate-300"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
                {isExpanded ? (
                  <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                ) : (
                  <Folder className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
                )}
                <span className="truncate font-medium">{node.name}</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  ({node.children.length})
                </span>
              </>
            ) : (
              <>
                <span className="w-3.5" />
                {renderFileIcon(node.name)}
                <span className="truncate font-mono">{node.name}</span>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div
            className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            {isFolder && (
              <button
                type="button"
                onClick={() => {
                  setTargetFolder(node.path);
                  setCreateMode('file');
                  setNewPathInput('');
                }}
                title="Add file inside this folder"
                className="p-1 hover:text-amber-400 text-slate-400 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setItemToRename({ path: node.path, isFolder });
                setRenameInput(node.name);
                setRenameError('');
              }}
              title={`Rename ${isFolder ? 'folder' : 'file'}`}
              className="p-1 hover:text-amber-400 text-slate-400 cursor-pointer"
            >
              <Pencil className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                setItemToMove({ path: node.path, isFolder });
                setDestinationFolderInput('');
              }}
              title={`Move ${isFolder ? 'folder' : 'file'}`}
              className="p-1 hover:text-amber-400 text-slate-400 cursor-pointer"
            >
              <Move className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setItemToDelete({ path: node.path, isFolder })}
              title={`Delete ${isFolder ? 'folder' : 'file'}`}
              className="p-1 hover:text-rose-400 text-slate-400 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {isFolder && isExpanded && (
          <div className="space-y-0.5">
            {node.children.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. Create File/Folder Dialog */}
      {createMode && (
        <form
          onSubmit={handleCreateSubmit}
          className="p-4 rounded-xl border border-amber-500/40 bg-slate-900 shadow-xl space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300">
              {createMode === 'file' ? 'Create New File' : 'Create New Folder'}
              {targetFolder && ` inside "${targetFolder}"`}
            </span>
            <button
              type="button"
              onClick={() => {
                setCreateMode(null);
                setCreationError('');
              }}
              className="text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={createMode === 'file' ? 'sm:col-span-2' : 'sm:col-span-3'}>
              <input
                type="text"
                value={newPathInput}
                onChange={(e) => {
                  setNewPathInput(e.target.value);
                  if (creationError) setCreationError('');
                }}
                placeholder={
                  createMode === 'file'
                    ? 'File name (e.g. Header.tsx or utils/date.ts)'
                    : 'Folder name (e.g. components or hooks)'
                }
                autoFocus
                className="w-full min-h-[38px] px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950 font-mono text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            {createMode === 'file' && (
              <div>
                <select
                  value={newFileLang}
                  onChange={(e) => setNewFileLang(e.target.value)}
                  className="w-full min-h-[38px] px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-950 font-mono text-xs text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="tsx">TypeScript React (.tsx)</option>
                  <option value="ts">TypeScript (.ts)</option>
                  <option value="json">JSON (.json)</option>
                  <option value="css">CSS (.css)</option>
                  <option value="html">HTML (.html)</option>
                  <option value="md">Markdown (.md)</option>
                </select>
              </div>
            )}
          </div>

          {creationError && (
            <p className="text-xs text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{creationError}</span>
            </p>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-semibold text-xs cursor-pointer"
            >
              Create {createMode === 'file' ? 'File' : 'Folder'}
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateMode(null);
                setCreationError('');
              }}
              className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* 2. Rename Dialog */}
      {itemToRename && (
        <form
          onSubmit={handleRenameSubmit}
          className="p-4 rounded-xl border border-slate-700 bg-slate-900 shadow-xl space-y-3"
        >
          <div className="text-xs font-semibold text-slate-200">
            Rename {itemToRename.isFolder ? 'Folder' : 'File'}:{' '}
            <span className="font-mono text-amber-300">{itemToRename.path}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={renameInput}
              onChange={(e) => {
                setRenameInput(e.target.value);
                if (renameError) setRenameError('');
              }}
              autoFocus
              className="flex-1 min-h-[38px] px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950 font-mono text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-semibold text-xs cursor-pointer"
            >
              Apply Rename
            </button>
            <button
              type="button"
              onClick={() => setItemToRename(null)}
              className="px-3 py-2 rounded-lg border border-slate-700 text-slate-300 text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
          {renameError && <p className="text-xs text-rose-400">{renameError}</p>}
        </form>
      )}

      {/* 3. Delete Confirmation Dialog */}
      {itemToDelete && (
        <div className="p-4 rounded-xl border border-rose-800/80 bg-rose-950/40 space-y-3">
          <div className="text-xs text-rose-200">
            Are you sure you want to delete {itemToDelete.isFolder ? 'folder' : 'file'}{' '}
            <span className="font-mono font-bold text-white">{itemToDelete.path}</span>?
            {itemToDelete.isFolder && ' This will permanently remove all files inside this folder.'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDeleteConfirm}
              className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs cursor-pointer"
            >
              Confirm Delete
            </button>
            <button
              type="button"
              onClick={() => setItemToDelete(null)}
              className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 4. Move Dialog */}
      {itemToMove && (
        <form
          onSubmit={handleMoveSubmit}
          className="p-4 rounded-xl border border-slate-700 bg-slate-900 space-y-3"
        >
          <div className="text-xs font-semibold text-slate-200">
            Move <span className="font-mono text-amber-300">{itemToMove.path}</span> to Destination Folder:
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <select
              value={destinationFolderInput}
              onChange={(e) => setDestinationFolderInput(e.target.value)}
              className="flex-1 min-h-[38px] px-3.5 py-1.5 rounded-lg border border-slate-700 bg-slate-950 font-mono text-xs text-slate-100 focus:outline-none focus:border-amber-500"
            >
              <option value="">/ (Root Directory)</option>
              {allAvailableFolders
                .filter((f) => f && f !== itemToMove.path && !f.startsWith(itemToMove.path + '/'))
                .map((f) => (
                  <option key={f} value={f}>
                    /{f}
                  </option>
                ))}
            </select>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-amber-500 text-slate-950 font-semibold text-xs whitespace-nowrap cursor-pointer"
            >
              Move Item
            </button>
            <button
              type="button"
              onClick={() => setItemToMove(null)}
              className="px-3 py-2 rounded-lg border border-slate-700 text-slate-300 text-xs cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Main Two-Column View: File Explorer + Real Professional Code Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[600px]">
        {/* Left Column: File Tree Explorer */}
        <div className="border border-slate-800 rounded-xl bg-slate-900/60 flex flex-col overflow-hidden">
          <div className="p-2.5 border-b border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-bold text-slate-300">File Explorer</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setTargetFolder('');
                    setCreateMode('file');
                    setNewPathInput('');
                  }}
                  title="New File in Root"
                  className="min-h-[32px] px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-amber-400 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="text-[11px]">File</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTargetFolder('');
                    setCreateMode('folder');
                    setNewPathInput('');
                  }}
                  title="New Folder in Root"
                  className="min-h-[32px] px-2 py-1 rounded hover:bg-slate-800 text-slate-300 hover:text-amber-400 text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Folder</span>
                </button>
              </div>
            </div>

            {/* Live Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files & contents..."
                className="w-full min-h-[32px] pl-8 pr-6 py-1 rounded-lg border border-slate-800 bg-slate-950 font-mono text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Scrollable Tree */}
          <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
            {renderTreeNode(fileTree)}

            {/* Always accessible preview.html entry */}
            <div className="pt-2 border-t border-slate-800/80 mt-2">
              <div
                onClick={() => handleOpenFile('preview.html')}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                  activeFilePath === 'preview.html'
                    ? 'bg-amber-500/15 text-amber-300 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  <span className="truncate">preview.html (Sandbox)</span>
                </div>
                <span className="text-[10px] text-slate-500">HTML</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 3 Columns: IDE Tabs & Professional CodeEditor */}
        <div className="lg:col-span-3 border border-slate-800 rounded-xl bg-slate-900/60 flex flex-col overflow-hidden">
          {/* Open Tabs Bar */}
          <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 overflow-x-auto px-2 pt-1.5 shrink-0">
            <div className="flex items-center gap-1 min-w-0">
              {openTabs.map((tabPath) => {
                const isActive = activeFilePath === tabPath;
                const tabFileName = tabPath.split('/').pop() || tabPath;
                return (
                  <div
                    key={tabPath}
                    onClick={() => setActiveFilePath(tabPath)}
                    className={`min-h-[34px] px-3 py-1 rounded-t-lg text-xs font-mono flex items-center gap-2 border-t border-x transition-colors cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-slate-900 text-amber-300 border-slate-800 font-medium'
                        : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                    }`}
                  >
                    {renderFileIcon(tabFileName)}
                    <span>{tabFileName}</span>
                    <button
                      type="button"
                      onClick={(e) => handleCloseTab(tabPath, e)}
                      title="Close tab"
                      className="text-slate-500 hover:text-slate-200 p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 ml-2 pb-1.5">
              <button
                type="button"
                onClick={() => setIsSplitPreviewOpen((prev) => !prev)}
                title={isSplitPreviewOpen ? 'Hide Split Live Preview' : 'Show Live Preview Side-by-Side'}
                className={`min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors ${
                  isSplitPreviewOpen
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-slate-800'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {isSplitPreviewOpen ? 'Close Split' : 'Live Preview'}
                </span>
              </button>
            </div>
          </div>

          {/* Embedded Professional CodeEditor & Optional Live Preview Split */}
          <div className="flex-1 min-h-0 flex flex-col xl:flex-row overflow-hidden">
            <div className={`flex-1 min-h-0 ${isSplitPreviewOpen ? 'xl:w-1/2 border-r border-slate-800' : 'w-full'}`}>
              <CodeEditor
                key={activeFilePath}
                filePath={activeFilePath}
                initialContent={editorContent}
                onSave={(newVal) => {
                  if (activeFilePath === 'preview.html') {
                    updateProjectPreviewHtml(project.id, newVal);
                  } else {
                    updateProjectFile(project.id, activeFilePath, newVal);
                  }
                  if (onPreviewRefresh) onPreviewRefresh();
                  setEditorContent(newVal);
                }}
              />
            </div>

            {isSplitPreviewOpen && (
              <div className="xl:w-1/2 min-h-0 flex flex-col border-t xl:border-t-0 border-slate-800 bg-slate-950 p-2 overflow-y-auto">
                <div className="flex items-center justify-between pb-2 px-1 text-xs text-slate-400 border-b border-slate-800 mb-2">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>Real-time Live Preview</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsSplitPreviewOpen(false)}
                    className="p-1 text-slate-500 hover:text-slate-200 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex-1 min-h-[380px]">
                  <LivePreviewEngine project={project} initialMode="mobile" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
