import React, { useState, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import Sidebar from './components/Sidebar';
import NotesList from './components/NotesList';
import Editor from './components/Editor';
import { FolderModal, SearchModal } from './components/Modal';
import { generateId } from './utils/helpers';

// Default mockup folders
const DEFAULT_FOLDERS = [
  { id: 'f-welcome', name: 'Welcome to ZenNote', parentId: null },
  { id: 'f-projects', name: 'Projects', parentId: null },
  { id: 'f-design', name: 'Web Design', parentId: 'f-projects' },
  { id: 'f-personal', name: 'Personal', parentId: null }
];

// Default mockup notes
const DEFAULT_NOTES = [
  {
    id: 'n-welcome',
    title: 'Welcome to ZenNote 📓',
    content: `<h1>Welcome to ZenNote 📓</h1>
<p>ZenNote is a premium, minimalist inline workspace that blends the structure of <strong>Notion</strong> with the organization of <strong>Evernote</strong>.</p>
<p>Here is a quick overview of what you can do:</p>

<h2>🚀 Key Features</h2>
<ul>
  <li><strong>Hierarchical Folders</strong>: Create nested folders inside folders in the sidebar to organize your thoughts.</li>
  <li><strong>Tags</strong>: Add tag labels to organize documents horizontally across different folders.</li>
  <li><strong>Full-text Search</strong>: Press ⌘K or click search to search across titles, contents, and tags instantly.</li>
  <li><strong>Confluence-style Editing</strong>: Type directly into the styled page. No markdown formatting code, no split-preview panel.</li>
  <li><strong>Local Persistence</strong>: All your data is saved in your browser's local storage—no account required, super fast!</li>
</ul>

<hr />

<h2>✍️ Editing Guide</h2>
<p>You can write directly into this editor or use the formatting toolbar above. Here are some examples of what you can build:</p>

<h3>Rich Text Styling</h3>
<p>You can make text <strong>bold</strong>, <em>italic</em>, or code elements inline very easily.</p>

<blockquote>
  "Typography is the craft of endowing a human language with a durable visual form."<br />
  — Robert Bringhurst
</blockquote>

<h3>Bullet & Task Lists</h3>
<ul>
  <li>Create a premium notes app</li>
  <li>Structure nested folders</li>
  <li>Star favorite notes</li>
</ul>

<p>Feel free to edit this note, delete it, or create your own!</p>`,
    folderId: 'f-welcome',
    tags: ['welcome', 'guide'],
    isFavorite: true,
    isTrash: false,
    emoji: '📓',
    createdAt: 1716140000000,
    updatedAt: 1716140000000
  },
  {
    id: 'n-design',
    title: 'ZenNote Features ✨',
    content: `<h1>Web Design Ideas ✨</h1>
<p>This is a subfolder note illustrating how ZenNote handles nested organization.</p>

<h2>🎨 Theme Styling</h2>
<p>Try clicking the <strong>Sun/Moon</strong> icon at the top of the sidebar! ZenNote features a gorgeous high-fidelity dark and light theme, complete with:</p>
<ul>
  <li>Smooth transition curves</li>
  <li>Crisp, readable fonts (Outfit for titles, Inter for body)</li>
  <li>Glassmorphic border details</li>
</ul>

<h2>🏷️ Tags</h2>
<p>We've added the tags <strong>#tutorial</strong> and <strong>#design</strong> to this note. Click the tags in the sidebar to filter notes across all folders instantly!</p>`,
    folderId: 'f-design',
    tags: ['tutorial', 'design'],
    isFavorite: false,
    isTrash: false,
    emoji: '✨',
    createdAt: 1716140100000,
    updatedAt: 1716140100000
  }
];

export default function App() {
  const [folders, setFolders] = useLocalStorage('zennote_folders', DEFAULT_FOLDERS);
  const [notes, setNotes] = useLocalStorage('zennote_notes', DEFAULT_NOTES);
  const [theme, setTheme] = useLocalStorage('zennote_theme', 'dark');

  // Filter state
  const [activeFilter, setActiveFilter] = useState({ type: 'all' });
  const [activeNoteId, setActiveNoteId] = useState('n-welcome');

  // Modal states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [folderModal, setFolderModal] = useState({
    isOpen: false,
    type: 'create', // 'create' | 'rename'
    parentId: null,
    folderId: null,
    initialValue: ''
  });

  // Apply theme class to document element on load / changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Cmd+K or Ctrl+K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      // Alt+N for new note
      if (e.altKey && e.key === 'n') {
        e.preventDefault();
        const activeFolderId = activeFilter.type === 'folder' ? activeFilter.id : null;
        handleCreateNote(activeFolderId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFilter]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // --- Note Operations ---

  const handleCreateNote = (folderId = null) => {
    const newNote = {
      id: generateId(),
      title: '',
      content: '',
      folderId,
      tags: [],
      isFavorite: false,
      isTrash: false,
      emoji: '📝',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);
  };

  const handleUpdateNote = (id, fields) => {
    setNotes(prev => prev.map(note => {
      if (note.id === id) {
        return {
          ...note,
          ...fields,
          updatedAt: Date.now()
        };
      }
      return note;
    }));
  };

  const handleRestoreNote = (id) => {
    handleUpdateNote(id, { isTrash: false });
  };

  const handleDeleteNoteForever = (id, forceDelete = true) => {
    if (forceDelete) {
      // Permanent deletion
      setNotes(prev => prev.filter(note => note.id !== id));
      if (activeNoteId === id) {
        setActiveNoteId(null);
      }
    } else {
      // Send to Trash
      handleUpdateNote(id, { isTrash: true, isFavorite: false });
    }
  };

  const handleMoveNote = (noteId, folderId) => {
    handleUpdateNote(noteId, { folderId });
  };

  // --- Folder Operations ---

  const openCreateFolderModal = (parentId = null) => {
    setFolderModal({
      isOpen: true,
      type: 'create',
      parentId,
      folderId: null,
      initialValue: ''
    });
  };

  const openRenameFolderModal = (folderId, currentName) => {
    setFolderModal({
      isOpen: true,
      type: 'rename',
      parentId: null,
      folderId,
      initialValue: currentName
    });
  };

  const handleFolderSubmit = (name) => {
    if (folderModal.type === 'create') {
      const newFolder = {
        id: generateId(),
        name,
        parentId: folderModal.parentId
      };
      setFolders(prev => [...prev, newFolder]);
    } else if (folderModal.type === 'rename') {
      setFolders(prev => prev.map(f => {
        if (f.id === folderModal.folderId) {
          return { ...f, name };
        }
        return f;
      }));
    }
  };

  const handleDeleteFolder = (folderId) => {
    if (window.confirm('Are you sure you want to delete this folder? All subfolders and their notes will be moved to the Trash.')) {
      // Find all child folder IDs recursively
      const getChildIds = (id) => {
        const directChildren = folders.filter(f => f.parentId === id);
        let ids = directChildren.map(c => c.id);
        directChildren.forEach(child => {
          ids = [...ids, ...getChildIds(child.id)];
        });
        return ids;
      };

      const foldersToDelete = [folderId, ...getChildIds(folderId)];

      // Mark all notes in these folders as Trash
      setNotes(prev => prev.map(note => {
        if (foldersToDelete.includes(note.folderId)) {
          return { ...note, isTrash: true, isFavorite: false, updatedAt: Date.now() };
        }
        return note;
      }));

      // Delete folders
      setFolders(prev => prev.filter(f => !foldersToDelete.includes(f.id)));

      // If active filter was one of the deleted folders, reset to all
      if (activeFilter.type === 'folder' && foldersToDelete.includes(activeFilter.id)) {
        setActiveFilter({ type: 'all' });
      }
    }
  };

  const activeNote = notes.find(n => n.id === activeNoteId);

  return (
    <div className="app-container">
      {/* 1. Sidebar Pane */}
      <Sidebar
        folders={folders}
        notes={notes}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        theme={theme}
        toggleTheme={toggleTheme}
        onOpenSearch={() => setIsSearchOpen(true)}
        onCreateFolder={openCreateFolderModal}
        onRenameFolder={openRenameFolderModal}
        onDeleteFolder={handleDeleteFolder}
      />

      {/* 2. Notes List Pane */}
      <NotesList
        notes={notes}
        folders={folders}
        activeFilter={activeFilter}
        activeNoteId={activeNoteId}
        onSelectNote={setActiveNoteId}
        onCreateNote={handleCreateNote}
      />

      {/* 3. Editor Pane */}
      <Editor
        note={activeNote}
        folders={folders}
        onUpdateNote={handleUpdateNote}
        onRestoreNote={handleRestoreNote}
        onDeleteNoteForever={handleDeleteNoteForever}
        onMoveNote={handleMoveNote}
      />

      {/* Folder CRUD Modal */}
      <FolderModal
        isOpen={folderModal.isOpen}
        onClose={() => setFolderModal(prev => ({ ...prev, isOpen: false }))}
        onSubmit={handleFolderSubmit}
        initialValue={folderModal.initialValue}
        title={folderModal.type === 'create' ? 'Create Folder' : 'Rename Folder'}
      />

      {/* Global Search Palette */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        notes={notes}
        folders={folders}
        onSelectNote={(noteId) => {
          // Open note and clear list filter so it can be seen
          setActiveNoteId(noteId);
          setActiveFilter({ type: 'all' });
        }}
      />
    </div>
  );
}
