import React, { useState, useEffect } from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import Sidebar from './components/Sidebar';
import NotesList from './components/NotesList';
import Editor from './components/Editor';
import { FolderModal, SearchModal } from './components/Modal';
import { generateId } from './utils/helpers';
import { supabase, isSupabaseConfigured } from './utils/supabaseClient';
import AuthPage from './components/AuthPage';

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
  },
  {
    id: 'n-tables',
    title: 'Interactive Tables Guide 📊',
    content: `<h1>Interactive Tables Guide 📊</h1>
<p>ZenNote features a built-in interactive table widget that lets you organize data in structured grids, perfect for design briefs, pricing sheets, or checklist comparisons.</p>

<h2>🛠️ Interactive Table Features</h2>
<ul>
  <li><strong>Easy Insert</strong>: Select the Table icon in the toolbar above and drag to create the grid size you need (up to 10x10).</li>
  <li><strong>Context Menu Controls</strong>: Right-click inside any table cell to add or delete rows and columns.</li>
  <li><strong>Custom Borders & Backgrounds</strong>: Apply custom border colors, widths, or backgrounds to emphasize critical cells.</li>
  <li><strong>Multi-Cell Selection</strong>: Hold Shift while clicking to highlight multiple cells for bulk formatting or clearing values.</li>
</ul>

<table>
  <tr>
    <th>Widget Name</th>
    <th>Toolbar Shortcut</th>
    <th>Highlight / Benefit</th>
  </tr>
  <tr>
    <td><strong>Rich Tables</strong></td>
    <td>Table icon (3x3 grid)</td>
    <td>Context menus for rows & columns, background color cells.</td>
  </tr>
  <tr>
    <td><strong>Resizable Images</strong></td>
    <td>Image icon</td>
    <td>Drag handles to scale premium screenshots and assets.</td>
  </tr>
  <tr>
    <td><strong>Styled Blockquotes</strong></td>
    <td>Quote icon</td>
    <td>Elegant side-border quote blocks.</td>
  </tr>
</table>
<p><br></p>`,
    folderId: 'f-welcome',
    tags: ['guide', 'widgets'],
    isFavorite: false,
    isTrash: false,
    emoji: '📊',
    createdAt: 1716140200000,
    updatedAt: 1716140200000
  },
  {
    id: 'n-media',
    title: 'Media & Rich Formatting 🎨',
    content: `<h1>Media & Rich Formatting 🎨</h1>
<p>A beautiful note isn't just text. ZenNote supports full inline images and rich block styles that are designed to feel premium and state of the art.</p>

<h2>📷 Responsive Image Widget</h2>
<p>Images can be placed directly within notes. Try clicking the screenshot below to show the active resize overlay and customize border rules:</p>
<img src="/showcase_widgets.png" alt="ZenNote Workspace Showcase" style="width: 100%; height: auto;" />

<h2>💡 Advanced Styling Blocks</h2>
<p>Need to highlight a quote or write down a block of code? Use the specialized typography blocks:</p>

<blockquote><strong>Pro Tip:</strong> You can resize any image by clicking on it and entering custom width dimensions in the popup box, or dragging the boundary!</blockquote>

<pre><code>// Example ZenNote styling utility
const applyPremiumTheme = (el) => {
  el.style.backdropFilter = 'blur(12px)';
  el.style.border = '1px solid rgba(255, 255, 255, 0.1)';
};</code></pre>
<p><br></p>`,
    folderId: 'f-welcome',
    tags: ['guide', 'media'],
    isFavorite: false,
    isTrash: false,
    emoji: '🎨',
    createdAt: 1716140300000,
    updatedAt: 1716140300000
  }
];

// --- Database Schema Mappers ---
function mapFolderFromDb(dbFolder) {
  return {
    id: dbFolder.id,
    name: dbFolder.name,
    parentId: dbFolder.parent_id
  };
}

function mapFolderToDb(folder, userId) {
  const row = {
    id: folder.id,
    name: folder.name,
    parent_id: folder.parentId
  };
  if (userId) {
    row.user_id = userId;
  }
  return row;
}

function mapNoteFromDb(dbNote) {
  return {
    id: dbNote.id,
    title: dbNote.title || '',
    content: dbNote.content || '',
    folderId: dbNote.folder_id,
    tags: dbNote.tags || [],
    isFavorite: !!dbNote.is_favorite,
    isTrash: !!dbNote.is_trash,
    emoji: dbNote.emoji || '📝',
    createdAt: dbNote.created_at ? new Date(dbNote.created_at).getTime() : Date.now(),
    updatedAt: dbNote.updated_at ? new Date(dbNote.updated_at).getTime() : Date.now(),
    draft: dbNote.draft
  };
}

function mapNoteToDb(note, userId) {
  const row = {
    id: note.id,
    title: note.title || '',
    content: note.content || '',
    folder_id: note.folderId,
    tags: note.tags || [],
    is_favorite: !!note.isFavorite,
    is_trash: !!note.isTrash,
    emoji: note.emoji || '📝',
    created_at: note.createdAt ? new Date(note.createdAt).toISOString() : new Date().toISOString(),
    updated_at: note.updatedAt ? new Date(note.updatedAt).toISOString() : new Date().toISOString(),
    draft: note.draft || null
  };
  if (userId) {
    row.user_id = userId;
  }
  return row;
}

export default function App() {
  // Session & Auth Status States
  const [user, setUser] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [bypassAuth, setBypassAuth] = useLocalStorage('zennote_bypass_auth', false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Guest-mode local storages
  const [localFolders, setLocalFolders] = useLocalStorage('zennote_folders', DEFAULT_FOLDERS);
  const [localNotes, setLocalNotes] = useLocalStorage('zennote_notes', DEFAULT_NOTES);
  const [theme, setTheme] = useLocalStorage('zennote_theme', 'dark');

  // Upgrade local storage notes if they don't contain the new widget showcase notes
  useEffect(() => {
    const hasTableGuide = localNotes.some(n => n.id === 'n-tables');
    const hasMediaGuide = localNotes.some(n => n.id === 'n-media');
    if (!hasTableGuide || !hasMediaGuide) {
      const tableNote = DEFAULT_NOTES.find(n => n.id === 'n-tables');
      const mediaNote = DEFAULT_NOTES.find(n => n.id === 'n-media');
      
      setLocalNotes(prev => {
        const updated = [...prev];
        if (tableNote && !updated.some(n => n.id === 'n-tables')) {
          updated.push(tableNote);
        }
        if (mediaNote && !updated.some(n => n.id === 'n-media')) {
          updated.push(mediaNote);
        }
        return updated;
      });

      if (!user && bypassAuth) {
        setNotes(prev => {
          const updated = [...prev];
          if (tableNote && !updated.some(n => n.id === 'n-tables')) {
            updated.push(tableNote);
          }
          if (mediaNote && !updated.some(n => n.id === 'n-media')) {
            updated.push(mediaNote);
          }
          return updated;
        });
      }
    }
  }, [localNotes, setLocalNotes, user, bypassAuth]);

  // Active runtime folders and notes states
  const [folders, setFolders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  // Filter state
  const [activeFilter, setActiveFilter] = useState({ type: 'all' });
  const [activeNoteId, setActiveNoteId] = useState(null);

  // Mobile navigation state: 'sidebar' | 'list' | 'editor'
  const [mobileView, setMobileView] = useState('list');

  // Modal states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [folderModal, setFolderModal] = useState({
    isOpen: false,
    type: 'create', // 'create' | 'rename'
    parentId: null,
    folderId: null,
    initialValue: ''
  });

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync session and setup supabase auth listener
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      setLoadingSession(false);
    }).catch(err => {
      console.error('Error getting Supabase session:', err);
      setLoadingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null;
      setUser(u);
      if (u) {
        setBypassAuth(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [setBypassAuth]);

  // Seeding helper for empty databases
  const seedDefaultData = async (userId) => {
    try {
      const dbFoldersToSeed = DEFAULT_FOLDERS.map(f => mapFolderToDb(f, userId));
      const { error: fErr } = await supabase.from('folders').insert(dbFoldersToSeed);
      if (fErr) throw fErr;

      const dbNotesToSeed = DEFAULT_NOTES.map(n => mapNoteToDb(n, userId));
      const { error: nErr } = await supabase.from('notes').insert(dbNotesToSeed);
      if (nErr) throw nErr;

      setFolders(DEFAULT_FOLDERS);
      setNotes(DEFAULT_NOTES);
      localStorage.setItem('zennote_folders_cache', JSON.stringify(DEFAULT_FOLDERS));
      localStorage.setItem('zennote_notes_cache', JSON.stringify(DEFAULT_NOTES));
    } catch (err) {
      console.error('Failed to seed default user guide database:', err);
      // Fallback state
      setFolders(DEFAULT_FOLDERS);
      setNotes(DEFAULT_NOTES);
    }
  };

  // Sync data whenever user status, offline state, or guest bypass toggles
  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        setLoadingData(true);
        try {
          if (isOffline) {
            // Read-only offline cache loading
            const cachedFolders = localStorage.getItem('zennote_folders_cache');
            const cachedNotes = localStorage.getItem('zennote_notes_cache');
            const f = cachedFolders ? JSON.parse(cachedFolders) : [];
            const n = cachedNotes ? JSON.parse(cachedNotes) : [];
            setFolders(f);
            setNotes(n);
            if (n.length > 0 && !activeNoteId) {
              // Try to find a non-trash note to make active
              const firstActive = n.find(x => !x.isTrash) || n[0];
              setActiveNoteId(firstActive.id);
            }
            setLoadingData(false);
            return;
          }

          // Fetch folders
          const { data: dbFolders, error: foldersErr } = await supabase
            .from('folders')
            .select('*');
          if (foldersErr) throw foldersErr;

          // Fetch notes
          const { data: dbNotes, error: notesErr } = await supabase
            .from('notes')
            .select('*')
            .order('updated_at', { ascending: false });
          if (notesErr) throw notesErr;

          const mappedFolders = dbFolders.map(mapFolderFromDb);
          const mappedNotes = dbNotes.map(mapNoteFromDb);

          if (mappedFolders.length === 0 && mappedNotes.length === 0) {
            // Seeding empty database
            await seedDefaultData(user.id);
          } else {
            // Check if welcome folder is missing
            const hasWelcomeFolder = mappedFolders.some(f => f.id === 'f-welcome');
            const hasTableGuide = mappedNotes.some(n => n.id === 'n-tables');
            const hasMediaGuide = mappedNotes.some(n => n.id === 'n-media');
            
            if (!hasWelcomeFolder && (!hasTableGuide || !hasMediaGuide)) {
              try {
                const welcomeFolder = DEFAULT_FOLDERS.find(f => f.id === 'f-welcome');
                if (welcomeFolder) {
                  const { error: folderErr } = await supabase
                    .from('folders')
                    .insert(mapFolderToDb(welcomeFolder, user.id));
                  if (!folderErr) {
                    mappedFolders.push(welcomeFolder);
                  }
                }
              } catch (err) {
                console.error('Failed to recreate welcome folder in Supabase:', err);
              }
            }
            
            setFolders(mappedFolders);
            
            let updatedNotes = [...mappedNotes];
            if (!hasTableGuide || !hasMediaGuide) {
              const missingNotes = [];
              if (!hasTableGuide) {
                const tableNote = DEFAULT_NOTES.find(n => n.id === 'n-tables');
                if (tableNote) missingNotes.push(tableNote);
              }
              if (!hasMediaGuide) {
                const mediaNote = DEFAULT_NOTES.find(n => n.id === 'n-media');
                if (mediaNote) missingNotes.push(mediaNote);
              }
              
              if (missingNotes.length > 0) {
                try {
                  const dbNotesToSeed = missingNotes.map(n => mapNoteToDb(n, user.id));
                  const { error: seedErr } = await supabase.from('notes').insert(dbNotesToSeed);
                  if (seedErr) throw seedErr;
                  updatedNotes.push(...missingNotes);
                } catch (err) {
                  console.error('Failed to seed missing widget notes to Supabase:', err);
                }
              }
            }

            setNotes(updatedNotes);
            localStorage.setItem('zennote_folders_cache', JSON.stringify(mappedFolders));
            localStorage.setItem('zennote_notes_cache', JSON.stringify(updatedNotes));
            if (updatedNotes.length > 0 && !activeNoteId) {
              const firstActive = updatedNotes.find(x => !x.isTrash) || updatedNotes[0];
              setActiveNoteId(firstActive.id);
            }
          }
        } catch (err) {
          console.error('Error fetching folders/notes from Supabase:', err);
          // Fallback to cache
          const cachedFolders = localStorage.getItem('zennote_folders_cache');
          const cachedNotes = localStorage.getItem('zennote_notes_cache');
          setFolders(cachedFolders ? JSON.parse(cachedFolders) : []);
          setNotes(cachedNotes ? JSON.parse(cachedNotes) : []);
        } finally {
          setLoadingData(false);
        }
      };
      fetchData();
    } else if (bypassAuth) {
      // Load standard local workspace
      setFolders(localFolders);
      setNotes(localNotes);
      if (localNotes.length > 0 && !activeNoteId) {
        const firstActive = localNotes.find(x => !x.isTrash) || localNotes[0];
        setActiveNoteId(firstActive.id);
      }
    }
  }, [user, bypassAuth, isOffline]);

  // Keep local storage files updated when guest makes modifications
  useEffect(() => {
    if (!user && bypassAuth) {
      setLocalFolders(folders);
    }
  }, [folders, user, bypassAuth, setLocalFolders]);

  useEffect(() => {
    if (!user && bypassAuth) {
      setLocalNotes(notes);
    }
  }, [notes, user, bypassAuth, setLocalNotes]);

  // Apply theme class to document element on load / changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Mobile responsive view controllers
  useEffect(() => {
    setMobileView('list');
  }, [activeFilter]);

  useEffect(() => {
    if (activeNoteId) {
      setMobileView('editor');
    } else {
      setMobileView('list');
    }
  }, [activeNoteId]);

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
        if (isOffline && user) {
          alert('You are offline. Note creation is disabled.');
          return;
        }
        const activeFolderId = activeFilter.type === 'folder' ? activeFilter.id : null;
        handleCreateNote(activeFolderId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFilter, isOffline, user]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleSignOut = async () => {
    if (user) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Error logging out:', err);
      }
    }
    // Clear states
    setUser(null);
    setBypassAuth(false);
    setFolders([]);
    setNotes([]);
    setActiveNoteId(null);
  };

  const handleBypassAuth = () => {
    setBypassAuth(true);
  };

  // --- Note Operations ---

  const handleCreateNote = async (folderId = null) => {
    if (isOffline && user) {
      alert('You are offline. Note creation is disabled.');
      return;
    }

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
    
    // Optimistic update
    setNotes(prev => [newNote, ...prev]);
    setActiveNoteId(newNote.id);

    if (user && !isOffline) {
      try {
        const { error } = await supabase
          .from('notes')
          .insert(mapNoteToDb(newNote, user.id));
        
        if (error) throw error;
      } catch (err) {
        console.error('Error saving new note to cloud database:', err);
      }
    }
  };

  const handleUpdateNote = async (id, fields) => {
    if (isOffline && user) {
      alert('You are offline. Note changes cannot be saved.');
      return;
    }

    // Optimistic update
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

    if (user && !isOffline) {
      try {
        const dbFields = {};
        if ('title' in fields) dbFields.title = fields.title;
        if ('content' in fields) dbFields.content = fields.content;
        if ('emoji' in fields) dbFields.emoji = fields.emoji;
        if ('tags' in fields) dbFields.tags = fields.tags;
        if ('isFavorite' in fields) dbFields.is_favorite = fields.isFavorite;
        if ('isTrash' in fields) dbFields.is_trash = fields.isTrash;
        if ('folderId' in fields) dbFields.folder_id = fields.folderId;
        if ('draft' in fields) dbFields.draft = fields.draft;

        dbFields.updated_at = new Date().toISOString();

        const { error } = await supabase
          .from('notes')
          .update(dbFields)
          .eq('id', id);

        if (error) throw error;
      } catch (err) {
        console.error('Error synchronizing note edit with cloud database:', err);
      }
    }
  };

  const handleRestoreNote = (id) => {
    handleUpdateNote(id, { isTrash: false });
  };

  const handleDeleteNoteForever = async (id, forceDelete = true) => {
    if (isOffline && user) {
      alert('You are offline. Permanent deletion is disabled.');
      return;
    }

    if (forceDelete) {
      // Permanent deletion (optimistic)
      setNotes(prev => prev.filter(note => note.id !== id));
      if (activeNoteId === id) {
        setActiveNoteId(null);
      }

      if (user && !isOffline) {
        try {
          const { error } = await supabase
            .from('notes')
            .delete()
            .eq('id', id);

          if (error) throw error;
        } catch (err) {
          console.error('Error deleting note from cloud database:', err);
        }
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
    if (isOffline && user) {
      alert('You are offline. Creating folders is disabled.');
      return;
    }
    setFolderModal({
      isOpen: true,
      type: 'create',
      parentId,
      folderId: null,
      initialValue: ''
    });
  };

  const openRenameFolderModal = (folderId, currentName) => {
    if (isOffline && user) {
      alert('You are offline. Renaming folders is disabled.');
      return;
    }
    setFolderModal({
      isOpen: true,
      type: 'rename',
      parentId: null,
      folderId,
      initialValue: currentName
    });
  };

  const handleFolderSubmit = async (name) => {
    if (folderModal.type === 'create') {
      const newFolder = {
        id: generateId(),
        name,
        parentId: folderModal.parentId
      };
      
      setFolders(prev => [...prev, newFolder]);

      if (user && !isOffline) {
        try {
          const { error } = await supabase
            .from('folders')
            .insert(mapFolderToDb(newFolder, user.id));

          if (error) throw error;
        } catch (err) {
          console.error('Error saving folder to cloud database:', err);
        }
      }
    } else if (folderModal.type === 'rename') {
      setFolders(prev => prev.map(f => {
        if (f.id === folderModal.folderId) {
          return { ...f, name };
        }
        return f;
      }));

      if (user && !isOffline) {
        try {
          const { error } = await supabase
            .from('folders')
            .update({ name })
            .eq('id', folderModal.folderId);

          if (error) throw error;
        } catch (err) {
          console.error('Error renaming folder in cloud database:', err);
        }
      }
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (isOffline && user) {
      alert('You are offline. Deleting folders is disabled.');
      return;
    }

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

      // Mark all notes in these folders as Trash (optimistic)
      setNotes(prev => prev.map(note => {
        if (foldersToDelete.includes(note.folderId)) {
          return { ...note, isTrash: true, isFavorite: false, updatedAt: Date.now() };
        }
        return note;
      }));

      // Delete folders (optimistic)
      setFolders(prev => prev.filter(f => !foldersToDelete.includes(f.id)));

      // If active filter was one of the deleted folders, reset to all
      if (activeFilter.type === 'folder' && foldersToDelete.includes(activeFilter.id)) {
        setActiveFilter({ type: 'all' });
      }

      if (user && !isOffline) {
        try {
          // Cloud Notes sync (moves to Trash)
          const { error: notesErr } = await supabase
            .from('notes')
            .update({ is_trash: true, is_favorite: false, updated_at: new Date().toISOString() })
            .in('folder_id', foldersToDelete);
          if (notesErr) throw notesErr;

          // Cloud Folders deletion (cascades on child folders)
          const { error: foldersErr } = await supabase
            .from('folders')
            .delete()
            .eq('id', folderId);
          if (foldersErr) throw foldersErr;
        } catch (err) {
          console.error('Error deleting folder from cloud database:', err);
        }
      }
    }
  };

  // Check login interface rendering state
  const isBypassed = bypassAuth || !isSupabaseConfigured;
  const showLogin = !user && !isBypassed;
  const showGlobalLoading = loadingSession || (user && loadingData && folders.length === 0 && notes.length === 0);

  if (showGlobalLoading) {
    return (
      <div className="loader-screen" style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        width: '100vw',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-secondary)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: 'var(--radius-md)',
          background: 'linear-gradient(135deg, var(--accent-color), #ec4899)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pulse 1.5s infinite alternate',
          boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)'
        }}>
          <span style={{ fontSize: '28px' }}>📓</span>
        </div>
        <p style={{ marginTop: '20px', fontFamily: 'var(--font-title)', fontWeight: 600 }}>
          {loadingSession ? 'Securing your workspace...' : 'Syncing notes with cloud...'}
        </p>
      </div>
    );
  }

  if (showLogin) {
    return <AuthPage onBypassAuth={handleBypassAuth} />;
  }

  const activeNote = notes.find(n => n.id === activeNoteId);

  return (
    <div className={`app-container view-${mobileView}`}>
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
        user={user}
        onSignOut={handleSignOut}
        isOffline={isOffline}
      />

      {/* 2. Notes List Pane */}
      <NotesList
        notes={notes}
        folders={folders}
        activeFilter={activeFilter}
        activeNoteId={activeNoteId}
        onSelectNote={setActiveNoteId}
        onCreateNote={handleCreateNote}
        onBackToSidebar={() => setMobileView('sidebar')}
      />

      {/* 3. Editor Pane */}
      <Editor
        note={activeNote}
        folders={folders}
        onUpdateNote={handleUpdateNote}
        onRestoreNote={handleRestoreNote}
        onDeleteNoteForever={handleDeleteNoteForever}
        onMoveNote={handleMoveNote}
        onBackToList={() => setMobileView('list')}
        isOffline={isOffline}
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
