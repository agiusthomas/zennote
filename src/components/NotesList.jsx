import React, { useState } from 'react';
import { Plus, Search, ArrowUpDown, Star, Trash, Archive, Menu } from 'lucide-react';
import { formatDate } from '../utils/helpers';

export default function NotesList({
  notes,
  folders,
  activeFilter,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onBackToSidebar
}) {
  const [localSearch, setLocalSearch] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt'); // 'updatedAt' | 'createdAt' | 'title'

  // 1. Get header label based on filter
  const getHeaderInfo = () => {
    switch (activeFilter.type) {
      case 'all':
        return { title: 'All Notes', icon: null };
      case 'favorites':
        return { title: 'Favorites', icon: <Star size={18} style={{ fill: 'var(--accent-color)', color: 'var(--accent-color)' }} /> };
      case 'trash':
        return { title: 'Trash Bin', icon: <Trash size={18} /> };
      case 'tag':
        return { title: `#${activeFilter.id}`, icon: null };
      case 'folder':
        const folder = folders.find(f => f.id === activeFilter.id);
        return { title: folder ? folder.name : 'Folder', icon: null };
      default:
        return { title: 'Notes', icon: null };
    }
  };

  // 2. Filter notes
  const filteredNotes = notes.filter((note) => {
    // First, filter by trash status
    if (activeFilter.type === 'trash') {
      if (!note.isTrash) return false;
    } else {
      if (note.isTrash) return false;
    }

    // Next, filter by primary selector
    if (activeFilter.type === 'favorites') {
      if (!note.isFavorite) return false;
    } else if (activeFilter.type === 'tag') {
      if (!note.tags.includes(activeFilter.id)) return false;
    } else if (activeFilter.type === 'folder') {
      // Include notes in this folder specifically
      if (note.folderId !== activeFilter.id) return false;
    }

    // Lastly, filter by local search query
    if (localSearch.trim()) {
      const q = localSearch.toLowerCase().trim();
      const titleMatch = note.title.toLowerCase().includes(q);
      const contentMatch = note.content.toLowerCase().includes(q);
      const tagMatch = note.tags.some(t => t.toLowerCase().includes(q));
      return titleMatch || contentMatch || tagMatch;
    }

    return true;
  });

  // 3. Sort notes
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (sortBy === 'title') {
      const tA = (a.title || 'Untitled').toLowerCase();
      const tB = (b.title || 'Untitled').toLowerCase();
      return tA.localeCompare(tB);
    } else if (sortBy === 'createdAt') {
      return b.createdAt - a.createdAt; // Newest first
    } else {
      return b.updatedAt - a.updatedAt; // Recently updated first
    }
  });

  const headerInfo = getHeaderInfo();

  // Strip HTML for snippet text
  const getNoteSnippet = (content) => {
    if (!content) return 'No additional text';
    
    // Simple HTML tag stripping
    const stripped = content
      .replace(/<[^>]*>/g, ' ')        // remove HTML tags
      .replace(/&nbsp;/g, ' ')         // replace HTML entity spaces
      .replace(/\s+/g, ' ')            // clean multiple whitespaces/newlines
      .trim();
      
    return stripped || 'No additional text';
  };

  const handleCreateNote = () => {
    // If we're inside a folder, create it in that folder
    const folderId = activeFilter.type === 'folder' ? activeFilter.id : null;
    onCreateNote(folderId);
  };

  return (
    <div className="notes-list-panel">
      {/* Header Info */}
      <div className="notes-list-header">
        <div className="notes-list-title-area">
          <div className="flex-row" style={{ gap: '8px' }}>
            <button 
              className="icon-btn mobile-only-btn" 
              onClick={onBackToSidebar} 
              title="Show Folders"
              style={{ marginRight: '4px' }}
            >
              <Menu size={18} />
            </button>
            {headerInfo.icon}
            <h2 style={{ fontSize: '20px' }}>{headerInfo.title}</h2>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '10px' }}>
              {sortedNotes.length}
            </span>
          </div>
          {activeFilter.type !== 'trash' && (
            <button className="icon-btn active" title="Create Note" onClick={handleCreateNote}>
              <Plus size={18} />
            </button>
          )}
        </div>

        {/* Search & Sort Row */}
        <div className="flex-row" style={{ gap: '8px' }}>
          <div className="notes-list-search-wrapper" style={{ flex: 1 }}>
            <Search className="search-icon-inside" size={14} />
            <input
              type="text"
              className="notes-list-search"
              placeholder="Filter list..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>

          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <select
              className="icon-btn"
              title="Sort Order"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                appearance: 'none',
                paddingRight: '6px',
                paddingLeft: '6px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                backgroundColor: 'var(--bg-secondary)',
                cursor: 'pointer',
                height: '32px'
              }}
            >
              <option value="updatedAt">Modified</option>
              <option value="createdAt">Created</option>
              <option value="title">A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* List Body */}
      <div className="notes-list-scrollable">
        {sortedNotes.length === 0 ? (
          <div className="empty-state">
            <Archive className="empty-state-icon" size={32} />
            <h3>No notes found</h3>
            <p style={{ fontSize: '13px' }}>
              {localSearch ? 'Try adjusting your search criteria' : 'Create a note to get started!'}
            </p>
          </div>
        ) : (
          sortedNotes.map((note) => {
            const isActive = note.id === activeNoteId;
            const hasTags = note.tags && note.tags.length > 0;
            return (
              <div
                key={note.id}
                className={`note-card ${isActive ? 'active' : ''}`}
                onClick={() => onSelectNote(note.id)}
              >
                <div className="note-card-title flex-between">
                  <div className="flex-row" style={{ gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <span>{note.emoji || '📓'}</span>
                    <span style={{ fontWeight: isActive ? '600' : '500' }}>
                      {note.title || 'Untitled Note'}
                    </span>
                  </div>
                  {note.isFavorite && (
                    <Star size={12} style={{ fill: 'var(--accent-color)', color: 'var(--accent-color)', flexShrink: 0 }} />
                  )}
                </div>

                <p className="note-card-snippet">{getNoteSnippet(note.content)}</p>

                <div className="note-card-footer">
                  <span>{formatDate(note.updatedAt)}</span>
                  
                  {hasTags && (
                    <div className="note-card-tags">
                      {note.tags.slice(0, 2).map((tag, i) => (
                        <span key={i} className="note-card-tag">
                          {tag}
                        </span>
                      ))}
                      {note.tags.length > 2 && (
                        <span className="note-card-tag" style={{ background: 'transparent' }}>
                          +{note.tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
