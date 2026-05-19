import React, { useState, useEffect, useRef } from 'react';
import { X, Search, FileText, Folder, Tag } from 'lucide-react';
import { formatDate } from '../utils/helpers';

// Generic Modal Shell
export function Modal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

// Folder Create/Rename Modal
export function FolderModal({ isOpen, onClose, onSubmit, initialValue = '', title = 'Create Folder' }) {
  const [name, setName] = useState(initialValue);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setName(initialValue);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, initialValue]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Folder Name</label>
          <input
            ref={inputRef}
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Work, Ideas, Recipes..."
            maxLength={32}
            required
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}

// Search Modal (Command Palette)
export function SearchModal({ isOpen, onClose, notes, folders, onSelectNote }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase().trim();
    const matches = [];

    notes.forEach((note) => {
      if (note.isTrash) return;

      const titleMatch = note.title.toLowerCase().includes(q);
      const contentMatch = note.content.toLowerCase().includes(q);
      const tagMatch = note.tags.some(tag => tag.toLowerCase().includes(q));
      
      let folderName = 'Root';
      if (note.folderId) {
        const folder = folders.find(f => f.id === note.folderId);
        if (folder) folderName = folder.name;
      }

      if (titleMatch || contentMatch || tagMatch) {
        // Find excerpt
        let excerpt = '';
        if (contentMatch) {
          const index = note.content.toLowerCase().indexOf(q);
          const start = Math.max(0, index - 30);
          const end = Math.min(note.content.length, index + q.length + 50);
          excerpt = '...' + note.content.substring(start, end) + '...';
        } else {
          excerpt = note.content.substring(0, 80) + (note.content.length > 80 ? '...' : '');
        }

        matches.push({
          note,
          titleMatch,
          tagMatch,
          excerpt,
          folderName
        });
      }
    });

    setResults(matches);
  }, [query, notes, folders]);

  if (!isOpen) return null;

  // Simple highlighter for matching text in excerpt or titles
  const highlightText = (text, q) => {
    if (!q || !text) return text;
    const parts = text.split(new RegExp(`(${q.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === q.toLowerCase() 
        ? <mark key={index}>{part}</mark> 
        : part
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content search-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="search-modal-input-wrapper">
          <Search className="search-modal-icon" size={20} />
          <input
            ref={inputRef}
            type="text"
            className="search-modal-input"
            placeholder="Search notes, tags, or content..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button 
            className="icon-btn" 
            onClick={onClose}
            style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)' }}
          >
            <X size={18} />
          </button>
        </div>
        
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {query.trim() === '' ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Type something to search across your workspace...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
              No matches found for "{query}"
            </div>
          ) : (
            <ul className="search-results-list">
              {results.map(({ note, titleMatch, tagMatch, excerpt, folderName }) => (
                <li 
                  key={note.id} 
                  className="search-result-item"
                  onClick={() => {
                    onSelectNote(note.id);
                    onClose();
                  }}
                >
                  <div className="search-result-title">
                    <span style={{ fontSize: '18px' }}>{note.emoji || '📓'}</span>
                    <span>{highlightText(note.title, query)}</span>
                    <span className="editor-breadcrumbs" style={{ fontSize: '11px', display: 'inline-flex', marginLeft: 'auto' }}>
                      <Folder size={12} /> {folderName}
                    </span>
                  </div>
                  
                  <div className="search-result-match-excerpt">
                    {highlightText(excerpt, query)}
                  </div>
                  
                  {note.tags.length > 0 && (
                    <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
                      {note.tags.map((tag, idx) => (
                        <span key={idx} className="editor-breadcrumbs" style={{ fontSize: '10px', background: 'var(--bg-secondary)', padding: '2px 6px', borderRadius: '4px' }}>
                          <Tag size={10} /> {highlightText(tag, query)}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div style={{ padding: '10px 20px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-color)', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
          <span>Search matches title, tags, and full text</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
}
