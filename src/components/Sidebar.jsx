import React, { useState } from 'react';
import { 
  Folder as FolderIcon, 
  FolderPlus, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Edit3, 
  Sun, 
  Moon, 
  Hash, 
  Star, 
  Trash, 
  Search,
  BookOpen
} from 'lucide-react';

export default function Sidebar({
  folders,
  notes,
  activeFilter,
  setActiveFilter,
  theme,
  toggleTheme,
  onOpenSearch,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder
}) {
  const [expandedFolders, setExpandedFolders] = useState({});

  // Toggle folder expanded state
  const toggleExpand = (folderId, e) => {
    e.stopPropagation();
    setExpandedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Get active note count for a folder (including notes in its subfolders)
  const getNoteCount = (folderId) => {
    const subFolderIds = getSubFolderIdsRecursive(folderId);
    const allFolderIds = [folderId, ...subFolderIds];
    return notes.filter(n => !n.isTrash && allFolderIds.includes(n.folderId)).length;
  };

  const getSubFolderIdsRecursive = (folderId) => {
    const directChildren = folders.filter(f => f.parentId === folderId);
    let ids = directChildren.map(f => f.id);
    directChildren.forEach(child => {
      ids = [...ids, ...getSubFolderIdsRecursive(child.id)];
    });
    return ids;
  };

  // Compile all unique tags and their note counts (excluding trash notes)
  const getTagsWithCounts = () => {
    const counts = {};
    notes.forEach(note => {
      if (note.isTrash) return;
      note.tags.forEach(tag => {
        const t = tag.trim();
        if (t) {
          counts[t] = (counts[t] || 0) + 1;
        }
      });
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  const tags = getTagsWithCounts();
  const favoriteCount = notes.filter(n => n.isFavorite && !n.isTrash).length;
  const trashCount = notes.filter(n => n.isTrash).length;
  const allNotesCount = notes.filter(n => !n.isTrash).length;

  // Recursive folder node renderer
  const FolderNode = ({ folder, level = 0 }) => {
    const children = folders.filter(f => f.parentId === folder.id);
    const hasChildren = children.length > 0;
    const isExpanded = !!expandedFolders[folder.id];
    const isActive = activeFilter.type === 'folder' && activeFilter.id === folder.id;
    const count = getNoteCount(folder.id);

    return (
      <div className="folder-node" style={{ marginLeft: level > 0 ? '4px' : '0' }}>
        <div 
          className={`folder-row ${isActive ? 'active' : ''}`}
          onClick={() => setActiveFilter({ type: 'folder', id: folder.id })}
        >
          <div className="folder-info">
            <span 
              onClick={(e) => {
                if (hasChildren) toggleExpand(folder.id, e);
              }}
              style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '2px' }}
            >
              {hasChildren ? (
                isExpanded ? <ChevronDown size={14} className="folder-icon" /> : <ChevronRight size={14} className="folder-icon" />
              ) : (
                <span style={{ width: 14 }} />
              )}
            </span>
            <FolderIcon size={16} className="folder-icon" />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{folder.name}</span>
            {count > 0 && <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '4px' }}>({count})</span>}
          </div>

          <div className="folder-actions" onClick={(e) => e.stopPropagation()}>
            <button 
              className="folder-action-btn" 
              title="Add Subfolder"
              onClick={() => onCreateFolder(folder.id)}
            >
              <FolderPlus size={13} />
            </button>
            <button 
              className="folder-action-btn" 
              title="Rename Folder"
              onClick={() => onRenameFolder(folder.id, folder.name)}
            >
              <Edit3 size={13} />
            </button>
            <button 
              className="folder-action-btn" 
              title="Delete Folder"
              onClick={() => onDeleteFolder(folder.id)}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="folder-children">
            {children.map(child => (
              <FolderNode key={child.id} folder={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  const rootFolders = folders.filter(f => !f.parentId);

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="logo">
          <span>📓</span>
          <span style={{ fontFamily: 'var(--font-title)' }}>ZenNote</span>
        </div>
        <button 
          className="icon-btn" 
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>

      {/* Global Search trigger */}
      <button className="sidebar-search-trigger" onClick={onOpenSearch}>
        <Search size={16} />
        <span>Search workspace...</span>
        <span style={{ marginLeft: 'auto', fontSize: '10px', background: 'var(--bg-tertiary)', padding: '1px 6px', borderRadius: '4px' }}>⌘K</span>
      </button>

      {/* Scrollable Contents */}
      <div className="sidebar-scrollable">
        {/* Workspace Quick Links */}
        <div className="sidebar-section">
          <ul className="sidebar-list">
            <li 
              className={`tag-pill-sidebar ${activeFilter.type === 'all' ? 'active' : ''}`}
              onClick={() => setActiveFilter({ type: 'all' })}
            >
              <div className="flex-row" style={{ gap: '8px' }}>
                <BookOpen size={16} />
                <span>All Notes</span>
              </div>
              <span className="tag-badge-count">{allNotesCount}</span>
            </li>
            
            <li 
              className={`tag-pill-sidebar ${activeFilter.type === 'favorites' ? 'active' : ''}`}
              onClick={() => setActiveFilter({ type: 'favorites' })}
            >
              <div className="flex-row" style={{ gap: '8px' }}>
                <Star size={16} style={{ fill: activeFilter.type === 'favorites' ? 'currentColor' : 'none' }} />
                <span>Favorites</span>
              </div>
              {favoriteCount > 0 && <span className="tag-badge-count">{favoriteCount}</span>}
            </li>
            
            <li 
              className={`tag-pill-sidebar ${activeFilter.type === 'trash' ? 'active' : ''}`}
              onClick={() => setActiveFilter({ type: 'trash' })}
            >
              <div className="flex-row" style={{ gap: '8px' }}>
                <Trash size={16} />
                <span>Trash</span>
              </div>
              {trashCount > 0 && <span className="tag-badge-count">{trashCount}</span>}
            </li>
          </ul>
        </div>

        {/* Folders Section */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">
            <span>Folders</span>
            <button 
              className="icon-btn" 
              style={{ width: '18px', height: '18px' }} 
              title="New Folder"
              onClick={() => onCreateFolder(null)}
            >
              <Plus size={14} />
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {rootFolders.length === 0 ? (
              <div style={{ padding: '8px 10px', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No folders. Click + to create.
              </div>
            ) : (
              rootFolders.map(folder => (
                <FolderNode key={folder.id} folder={folder} />
              ))
            )}
          </div>
        </div>

        {/* Tags Section */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">
            <span>Tags</span>
          </div>
          <ul className="sidebar-list">
            {tags.length === 0 ? (
              <div style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No tags created yet.
              </div>
            ) : (
              tags.map(([tagName, count]) => {
                const isActive = activeFilter.type === 'tag' && activeFilter.id === tagName;
                return (
                  <li
                    key={tagName}
                    className={`tag-pill-sidebar ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveFilter({ type: 'tag', id: tagName })}
                  >
                    <div className="flex-row" style={{ gap: '6px' }}>
                      <Hash size={14} style={{ color: 'var(--text-muted)' }} />
                      <span>{tagName}</span>
                    </div>
                    <span className="tag-badge-count">{count}</span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </div>
    </aside>
  );
}
