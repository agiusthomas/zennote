import React, { useState, useEffect, useRef } from 'react';
import { 
  Star, 
  Trash2, 
  RotateCcw, 
  Trash, 
  Bold, 
  Italic, 
  List, 
  Code, 
  Quote, 
  Link as LinkIcon, 
  Image as ImageIcon,
  Tag as TagIcon, 
  Plus, 
  X,
  FileText,
  Folder,
  Square,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify
} from 'lucide-react';
import { getFolderBreadcrumbs } from '../utils/helpers';
import EmojiPicker from './EmojiPicker';

export default function Editor({
  note,
  folders,
  onUpdateNote,
  onRestoreNote,
  onDeleteNoteForever,
  onMoveNote
}) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [blockType, setBlockType] = useState('p');
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePopupPos, setImagePopupPos] = useState({ top: 0, left: 0 });
  const [showBorderControls, setShowBorderControls] = useState(false);
  const [lastBorderWidth, setLastBorderWidth] = useState('2px');
  const [lastBorderColor, setLastBorderColor] = useState('var(--border-color)');

  // Drag resizing states
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartWidth, setDragStartWidth] = useState(0);
  const [dragStartMouseX, setDragStartMouseX] = useState(0);
  const [dragDirection, setDragDirection] = useState('right'); // 'left' | 'right'
  
  const editorRef = useRef(null);
  const tagInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Auto-focus tag input when shown
  useEffect(() => {
    if (showTagInput) {
      tagInputRef.current?.focus();
    }
  }, [showTagInput]);

  // Sync state into contentEditable innerHTML when note ID changes
  useEffect(() => {
    if (editorRef.current && note) {
      if (editorRef.current.innerHTML !== note.content) {
        editorRef.current.innerHTML = note.content || '<p><br></p>';
      }
      setSelectedImage(null);
      setShowBorderControls(false);
      updateBlockType();
    }
  }, [note?.id]);

  // Close image popup on scroll inside editor
  useEffect(() => {
    const handleScroll = () => {
      setSelectedImage(null);
      setShowBorderControls(false);
    };
    const editor = editorRef.current;
    if (editor) {
      editor.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (editor) {
        editor.removeEventListener('scroll', handleScroll);
      }
    };
  }, [note?.id]);

  // Global click listener to dismiss image popup
  useEffect(() => {
    const handleGlobalClick = (e) => {
      const wrapper = editorRef.current?.parentNode;
      if (wrapper && !wrapper.contains(e.target) && !e.target.closest('.image-context-popup')) {
        setSelectedImage(null);
        setShowBorderControls(false);
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  // Window resize listener to dismiss image selection
  useEffect(() => {
    const handleResize = () => {
      setSelectedImage(null);
      setShowBorderControls(false);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Global Mouse Move and Mouse Up drag resizing handlers
  useEffect(() => {
    if (!isDragging || !selectedImage) return;

    const handleMouseMove = (e) => {
      const deltaX = e.clientX - dragStartMouseX;
      let newWidth = dragStartWidth + (dragDirection === 'right' ? deltaX : -deltaX);
      
      // Keep width constraints between 60px and the editor field boundaries
      const editorWidth = editorRef.current.clientWidth - 80;
      newWidth = Math.max(60, Math.min(newWidth, editorWidth));
      
      selectedImage.style.width = `${newWidth}px`;
      selectedImage.style.height = 'auto'; // Preserves aspect ratio

      // Recalculate popup and handle positions on layout update
      const rect = selectedImage.getBoundingClientRect();
      const wrapper = editorRef.current.parentNode.getBoundingClientRect();
      
      const offset = 48;
      let topPos = rect.top - wrapper.top - offset;
      if (topPos < 55) {
        topPos = rect.bottom - wrapper.top + 8; // below image
      }

      setImagePopupPos({
        top: topPos,
        left: rect.left - wrapper.left + rect.width / 2
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      handleContentChange();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, selectedImage, dragStartWidth, dragStartMouseX, dragDirection]);

  if (!note) {
    return (
      <div className="editor-panel empty-state">
        <FileText size={64} className="empty-state-icon" />
        <h2 style={{ fontFamily: 'var(--font-title)', fontSize: '24px', marginBottom: '8px' }}>
          Welcome to ZenNote
        </h2>
        <p style={{ maxWidth: '400px', fontSize: '15px' }}>
          Select an existing note from the sidebar, or create a new note in your folders to start writing.
        </p>
        <div style={{ marginTop: '24px', fontSize: '12px', color: 'var(--text-muted)' }}>
          Tip: Press <kbd style={{ padding: '2px 6px', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '4px' }}>⌘K</kbd> to search anywhere.
        </div>
      </div>
    );
  }

  // Handle rich text updates
  const handleContentChange = () => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      if (content !== note.content) {
        onUpdateNote(note.id, { content });
      }
      updateBlockType();
    }
  };

  const handleTitleChange = (e) => {
    onUpdateNote(note.id, { title: e.target.value });
  };

  const handleEmojiSelect = (emoji) => {
    onUpdateNote(note.id, { emoji });
  };

  const toggleFavorite = () => {
    onUpdateNote(note.id, { isFavorite: !note.isFavorite });
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    const tag = newTag.trim().toLowerCase();
    if (tag && !note.tags.includes(tag)) {
      onUpdateNote(note.id, { tags: [...note.tags, tag] });
    }
    setNewTag('');
    setShowTagInput(false);
  };

  const handleRemoveTag = (tagToRemove) => {
    onUpdateNote(note.id, { tags: note.tags.filter(t => t !== tagToRemove) });
  };

  // Formatting helpers using execCommand
  const executeCommand = (command, value = null) => {
    document.execCommand(command, false, value);
    handleContentChange();
  };

  const formatBlock = (tag) => {
    executeCommand('formatBlock', tag);
  };

  const addLink = () => {
    const url = prompt('Enter link URL:');
    if (url) {
      const formattedUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
      executeCommand('createLink', formattedUrl);
    }
  };

  // Wrap selection in inline <code> tag
  const insertInlineCode = () => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const selectedText = range.toString();
    const codeNode = document.createElement('code');
    codeNode.textContent = selectedText || 'code';
    
    range.deleteContents();
    range.insertNode(codeNode);

    // Refocus cursor
    const newRange = document.createRange();
    newRange.selectNodeContents(codeNode);
    selection.removeAllRanges();
    selection.addRange(newRange);
    handleContentChange();
  };

  // Image Upload and Paste Helpers
  const insertImageFile = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      executeCommand('insertImage', dataUrl);
      
      // Auto-set width to 100% and height to auto for newly inserted data images
      setTimeout(() => {
        if (editorRef.current) {
          const imgs = editorRef.current.querySelectorAll('img[src^="data:image"]');
          imgs.forEach(img => {
            if (!img.style.width) {
              img.style.width = '100%';
              img.style.height = 'auto';
            }
          });
          handleContentChange();
        }
      }, 50);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      insertImageFile(file);
    }
    e.target.value = ''; // Reset input
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault(); // Stop standard paste of path text
          const file = items[i].getAsFile();
          if (file) {
            insertImageFile(file);
          }
        }
      }
    }
  };

  // Keyboard Shortcuts for Formats: ⌥⌘[1-4, 0] (or Alt+Ctrl+[1-4, 0])
  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.altKey) {
      if (e.key === '1') {
        e.preventDefault();
        formatBlock('<h1>');
        setBlockType('h1');
      } else if (e.key === '2') {
        e.preventDefault();
        formatBlock('<h2>');
        setBlockType('h2');
      } else if (e.key === '3') {
        e.preventDefault();
        formatBlock('<h3>');
        setBlockType('h3');
      } else if (e.key === '4') {
        e.preventDefault();
        formatBlock('<h4>');
        setBlockType('h4');
      } else if (e.key === '0') {
        e.preventDefault();
        formatBlock('<p>');
        setBlockType('p');
      }
    }
  };

  // Traverse DOM tree up from cursor node to find active block type tag
  const updateBlockType = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      let node = selection.getRangeAt(0).startContainer;
      while (node && node !== editorRef.current) {
        if (node.nodeType === 1) {
          const tag = node.tagName.toLowerCase();
          if (['h1', 'h2', 'h3', 'h4', 'p', 'pre', 'blockquote'].includes(tag)) {
            setBlockType(tag);
            return;
          }
        }
        node = node.parentNode;
      }
    }
    setBlockType('p');
  };

  // Editor Click Listener (handles image popup opening)
  const handleEditorClick = (e) => {
    if (e.target.tagName === 'IMG') {
      const img = e.target;
      setSelectedImage(img);
      setShowBorderControls(false); // Reset submenu to primary toolbar options
      
      const rect = img.getBoundingClientRect();
      const wrapper = editorRef.current.parentNode.getBoundingClientRect();
      
      // Calculate top coordinate, offset by 48px
      const offset = 48;
      let topPos = rect.top - wrapper.top - offset;
      
      // Flip position below image if it overlaps with the top toolbar (topPos < 55px)
      if (topPos < 55) {
        topPos = rect.bottom - wrapper.top + 8;
      }
      
      setImagePopupPos({
        top: topPos,
        left: rect.left - wrapper.left + rect.width / 2
      });
    } else {
      setSelectedImage(null);
      setShowBorderControls(false);
    }
  };

  // Initialize drag action
  const startDrag = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragDirection(direction);
    setDragStartWidth(selectedImage.clientWidth);
    setDragStartMouseX(e.clientX);
  };

  // Statistics (stripping HTML tags first)
  const getStats = () => {
    if (!note.content) return { words: 0, chars: 0, readTime: 1 };
    const plainText = note.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = plainText.split(/\s+/).filter(Boolean).length;
    const chars = plainText.length;
    const readTime = Math.max(1, Math.ceil(words / 200));
    return { words, chars, readTime };
  };

  const stats = getStats();
  const breadcrumbs = getFolderBreadcrumbs(note.folderId, folders);

  // Calculate side handles styles dynamically for the selected image
  let handleLeft = 0;
  let handleRight = 0;
  let handleTop = 0;
  let handleHeight = 0;

  if (selectedImage && editorRef.current) {
    const rect = selectedImage.getBoundingClientRect();
    const wrapper = editorRef.current.parentNode.getBoundingClientRect();
    
    handleTop = rect.top - wrapper.top;
    handleLeft = rect.left - wrapper.left;
    handleRight = rect.right - wrapper.left;
    handleHeight = rect.height;
  }

  return (
    <div className="editor-panel">
      {/* Hidden file input for image uploading */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageUpload}
      />

      {/* Trash Warning Banner */}
      {note.isTrash && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
          padding: '12px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'between',
          gap: '16px',
          color: '#ef4444',
          fontSize: '14px'
        }}>
          <div className="flex-row" style={{ gap: '8px', flex: 1 }}>
            <Trash2 size={16} />
            <span>This note is in the Trash. You cannot edit it unless you restore it.</span>
          </div>
          <div className="flex-row" style={{ gap: '8px' }}>
            <button className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => onRestoreNote(note.id)}>
              <RotateCcw size={12} /> Restore
            </button>
            <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: '12px', backgroundColor: '#ef4444' }} onClick={() => onDeleteNoteForever(note.id)}>
              Delete Forever
            </button>
          </div>
        </div>
      )}

      {/* Editor Header */}
      <div className="editor-header">
        {/* Breadcrumbs */}
        <div className="editor-breadcrumbs">
          <Folder size={12} />
          <span>Root</span>
          {breadcrumbs.map(folder => (
            <React.Fragment key={folder.id}>
              <span>/</span>
              <span 
                style={{ cursor: 'pointer' }}
                onClick={() => onMoveNote && onMoveNote(note.id, folder.id)}
              >
                {folder.name}
              </span>
            </React.Fragment>
          ))}
          
          {/* Simple Folder Mover Dropdown */}
          {!note.isTrash && (
            <select
              value={note.folderId || ''}
              onChange={(e) => onMoveNote(note.id, e.target.value || null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '12px',
                marginLeft: '8px',
                cursor: 'pointer'
              }}
            >
              <option value="">Move to Root</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>Move to: {f.name}</option>
              ))}
            </select>
          )}
        </div>

        {/* Note Title Row */}
        <div className="editor-title-row">
          <div style={{ position: 'relative' }}>
            <button 
              className="emoji-selector-trigger"
              onClick={() => !note.isTrash && setShowEmojiPicker(!showEmojiPicker)}
              disabled={note.isTrash}
              title="Select note header emoji"
            >
              {note.emoji || '📓'}
            </button>
            {showEmojiPicker && (
              <EmojiPicker 
                onSelect={handleEmojiSelect} 
                onClose={() => setShowEmojiPicker(false)} 
              />
            )}
          </div>

          <input
            type="text"
            className="editor-title-input"
            value={note.title}
            onChange={handleTitleChange}
            placeholder="Untitled Note"
            disabled={note.isTrash}
            title="Note title"
          />

          {!note.isTrash && (
            <div className="flex-row" style={{ gap: '8px' }}>
              <button 
                className={`icon-btn ${note.isFavorite ? 'active' : ''}`}
                onClick={toggleFavorite}
                title={note.isFavorite ? 'Remove from Favorites' : 'Mark as Favorite'}
              >
                <Star size={20} style={{ fill: note.isFavorite ? 'currentColor' : 'none' }} />
              </button>
              <button 
                className="icon-btn" 
                onClick={() => onDeleteNoteForever(note.id, false /* send to trash */)}
                title="Move note to Trash"
              >
                <Trash size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Tags Row */}
        <div className="editor-tags-row">
          <TagIcon size={14} style={{ color: 'var(--text-muted)' }} />
          {note.tags.map(tag => (
            <span key={tag} className="editor-tag-pill">
              #{tag}
              {!note.isTrash && (
                <span className="editor-tag-remove" onClick={() => handleRemoveTag(tag)} title={`Remove #${tag}`}>
                  <X size={12} />
                </span>
              )}
            </span>
          ))}

          {!note.isTrash && (
            <>
              {showTagInput ? (
                <form onSubmit={handleAddTag} style={{ display: 'inline-flex' }}>
                  <input
                    ref={tagInputRef}
                    type="text"
                    className="form-input"
                    style={{ padding: '2px 8px', fontSize: '13px', width: '100px', height: '24px' }}
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onBlur={() => setTimeout(() => setShowTagInput(false), 200)}
                    placeholder="tag..."
                    title="Type tag name and press Enter"
                  />
                </form>
              ) : (
                <button className="editor-tag-add-btn" onClick={() => setShowTagInput(true)} title="Add tag to note">
                  <Plus size={12} /> Add Tag
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Editor Toolbar (Only show if not in Trash) */}
      {!note.isTrash && (
        <div className="editor-toolbar">
          {/* Format buttons */}
          <div className="toolbar-group">
            {/* Heading Dropdown Selector */}
            <select
              className="toolbar-select"
              value={blockType}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'p') {
                  formatBlock('<p>');
                } else {
                  formatBlock(`<${val}>`);
                }
                setBlockType(val);
              }}
              title="Formatting Style (H1-H4, Normal Text)"
            >
              <option value="p">Normal Text (⌥⌘0)</option>
              <option value="h1">Heading 1 (⌥⌘1)</option>
              <option value="h2">Heading 2 (⌥⌘2)</option>
              <option value="h3">Heading 3 (⌥⌘3)</option>
              <option value="h4">Heading 4 (⌥⌘4)</option>
              {blockType === 'pre' && <option value="pre">Code Block</option>}
              {blockType === 'blockquote' && <option value="blockquote">Quote Block</option>}
            </select>

            <div className="toolbar-divider" />

            <button className="icon-btn" title="Bold (⌘B)" onClick={() => executeCommand('bold')}>
              <Bold size={16} />
            </button>
            <button className="icon-btn" title="Italic (⌘I)" onClick={() => executeCommand('italic')}>
              <Italic size={16} />
            </button>
            
            <div className="toolbar-divider" />

            <button className="icon-btn" title="Align Left" onClick={() => executeCommand('justifyLeft')}>
              <AlignLeft size={16} />
            </button>
            <button className="icon-btn" title="Align Center" onClick={() => executeCommand('justifyCenter')}>
              <AlignCenter size={16} />
            </button>
            <button className="icon-btn" title="Align Right" onClick={() => executeCommand('justifyRight')}>
              <AlignRight size={16} />
            </button>
            <button className="icon-btn" title="Justify" onClick={() => executeCommand('justifyFull')}>
              <AlignJustify size={16} />
            </button>
            
            <div className="toolbar-divider" />
            
            <button className="icon-btn" title="Bullet List" onClick={() => executeCommand('insertUnorderedList')}>
              <List size={16} />
            </button>
            <button className="icon-btn" title="Inline Code" onClick={insertInlineCode}>
              <Code size={16} />
            </button>
            <button className="icon-btn" title="Code Block" onClick={() => formatBlock('<pre>')}>
              <Code size={16} style={{ borderLeft: '2px solid currentColor', paddingLeft: '2px' }} />
            </button>
            <button className="icon-btn" title="Blockquote" onClick={() => formatBlock('<blockquote>')}>
              <Quote size={16} />
            </button>
            <button className="icon-btn" title="Insert Link" onClick={addLink}>
              <LinkIcon size={16} />
            </button>
            <button className="icon-btn" title="Upload Image" onClick={() => imageInputRef.current?.click()}>
              <ImageIcon size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Editor Content Area */}
      <div className="editor-split-container">
        <div className="editor-textarea-wrapper" style={{ position: 'relative' }}>
          {/* Overlay Resize Handles */}
          {selectedImage && !note.isTrash && (
            <>
              <div 
                className={`image-resize-handle left ${isDragging && dragDirection === 'left' ? 'active' : ''}`}
                style={{
                  top: `${handleTop}px`,
                  left: `${handleLeft}px`,
                  height: `${handleHeight}px`,
                  transform: 'translateX(-50%)'
                }}
                onMouseDown={(e) => startDrag(e, 'left')}
              />
              <div 
                className={`image-resize-handle right ${isDragging && dragDirection === 'right' ? 'active' : ''}`}
                style={{
                  top: `${handleTop}px`,
                  left: `${handleRight}px`,
                  height: `${handleHeight}px`,
                  transform: 'translateX(-50%)'
                }}
                onMouseDown={(e) => startDrag(e, 'right')}
              />
            </>
          )}

          {/* Floating Image Editor Toolbar */}
          {selectedImage && (
            <div 
              className="image-context-popup" 
              style={{ 
                position: 'absolute', 
                top: `${imagePopupPos.top}px`, 
                left: `${imagePopupPos.left}px`,
                transform: 'translateX(-50%)',
                zIndex: 20
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Border Toggle Icon Button */}
              <button 
                className={`icon-btn ${selectedImage.style.borderWidth && selectedImage.style.borderWidth !== '0px' ? 'active' : ''}`}
                onClick={() => {
                  const nextShow = !showBorderControls;
                  setShowBorderControls(nextShow);
                  if (nextShow) {
                    // Apply last style automatically if it doesn't have a border yet
                    const hasBorder = selectedImage.style.borderWidth && selectedImage.style.borderWidth !== '0px';
                    if (!hasBorder) {
                      selectedImage.style.borderStyle = 'solid';
                      selectedImage.style.borderWidth = lastBorderWidth;
                      selectedImage.style.borderColor = lastBorderColor;
                      selectedImage.style.padding = '6px';
                      selectedImage.style.backgroundColor = 'var(--bg-secondary)';
                      handleContentChange();
                    }
                  }
                }}
                title="Border Options"
                style={{ padding: '4px', height: '24px', width: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Square size={14} />
              </button>

              {/* Inline Options (Size select & Color dots) shown on the right next to the border icon */}
              {showBorderControls && (
                <div className="flex-row inline-border-options" style={{ gap: '6px', marginLeft: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Size:</span>
                  <select
                    value={selectedImage.style.borderWidth || '0px'}
                    onChange={(e) => {
                      const width = e.target.value;
                      if (width === '0px') {
                        selectedImage.style.border = 'none';
                        selectedImage.style.padding = '0';
                        selectedImage.style.backgroundColor = 'transparent';
                      } else {
                        selectedImage.style.borderStyle = 'solid';
                        selectedImage.style.borderWidth = width;
                        selectedImage.style.padding = '6px';
                        selectedImage.style.backgroundColor = 'var(--bg-secondary)';
                        if (!selectedImage.style.borderColor) {
                          selectedImage.style.borderColor = lastBorderColor;
                        }
                        setLastBorderWidth(width);
                      }
                      handleContentChange();
                    }}
                    className="toolbar-select"
                    style={{ height: '22px', padding: '0 4px', fontSize: '11px' }}
                  >
                    <option value="0px">None</option>
                    <option value="2px">Thin (2px)</option>
                    <option value="4px">Medium (4px)</option>
                    <option value="6px">Thick (6px)</option>
                  </select>

                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Color:</span>
                  <div className="flex-row" style={{ gap: '4px', alignItems: 'center' }}>
                    {[
                      { name: 'Neutral', value: 'var(--border-color)' },
                      { name: 'Indigo', value: 'var(--accent-color)' },
                      { name: 'Red', value: '#ef4444' },
                      { name: 'Green', value: '#22c55e' },
                      { name: 'Blue', value: '#3b82f6' }
                    ].map((color) => {
                      const activeColor = selectedImage.style.borderColor || '';
                      const isMatch = activeColor === color.value || 
                                      (color.name === 'Neutral' && (activeColor === 'var(--border-color)' || activeColor === ''));
                      
                      return (
                        <button
                          key={color.name}
                          onClick={() => {
                            selectedImage.style.borderStyle = 'solid';
                            if (!selectedImage.style.borderWidth || selectedImage.style.borderWidth === '0px') {
                              selectedImage.style.borderWidth = lastBorderWidth;
                              selectedImage.style.padding = '6px';
                              selectedImage.style.backgroundColor = 'var(--bg-secondary)';
                            }
                            selectedImage.style.borderColor = color.value;
                            setLastBorderColor(color.value);
                            handleContentChange();
                          }}
                          className="color-dot-btn"
                          style={{
                            backgroundColor: color.value === 'var(--border-color)' ? 'var(--text-muted)' : color.value,
                            border: isMatch ? '2px solid var(--text-primary)' : '1px solid var(--border-color)'
                          }}
                          title={color.name}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              
              {/* Image alignment options */}
              {!showBorderControls && (
                <>
                  <div className="toolbar-divider" style={{ height: '14px', margin: '0 8px' }} />
                  
                  <button 
                    className={`icon-btn ${selectedImage.style.marginLeft === '0px' || !selectedImage.style.marginLeft ? 'active' : ''}`}
                    onClick={() => {
                      selectedImage.style.display = 'block';
                      selectedImage.style.marginLeft = '0px';
                      selectedImage.style.marginRight = 'auto';
                      handleContentChange();
                    }}
                    title="Align Left"
                    style={{ padding: '4px', height: '24px', width: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <AlignLeft size={14} />
                  </button>
                  <button 
                    className={`icon-btn ${selectedImage.style.marginLeft === 'auto' && selectedImage.style.marginRight === 'auto' ? 'active' : ''}`}
                    onClick={() => {
                      selectedImage.style.display = 'block';
                      selectedImage.style.marginLeft = 'auto';
                      selectedImage.style.marginRight = 'auto';
                      handleContentChange();
                    }}
                    title="Align Center"
                    style={{ padding: '4px', height: '24px', width: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <AlignCenter size={14} />
                  </button>
                  <button 
                    className={`icon-btn ${selectedImage.style.marginLeft === 'auto' && selectedImage.style.marginRight === '0px' ? 'active' : ''}`}
                    onClick={() => {
                      selectedImage.style.display = 'block';
                      selectedImage.style.marginLeft = 'auto';
                      selectedImage.style.marginRight = '0px';
                      handleContentChange();
                    }}
                    title="Align Right"
                    style={{ padding: '4px', height: '24px', width: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <AlignRight size={14} />
                  </button>
                </>
              )}
              
              <div className="toolbar-divider" style={{ height: '14px', margin: '0 8px' }} />
              
              <button 
                className="icon-btn" 
                onClick={() => {
                  selectedImage.remove();
                  setSelectedImage(null);
                  setShowBorderControls(false);
                  handleContentChange();
                }}
                title="Delete image block"
                style={{ color: '#ef4444' }}
              >
                <Trash size={14} />
              </button>
            </div>
          )}

          <div
            ref={editorRef}
            className="wysiwyg-editor"
            contentEditable={!note.isTrash}
            onInput={handleContentChange}
            onBlur={handleContentChange}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            onClick={handleEditorClick}
            onMouseUp={() => {
              updateBlockType();
            }}
            onKeyUp={updateBlockType}
            placeholder="Start typing your note here..."
          />
        </div>
      </div>

      {/* Stats Footer */}
      <div style={{
        padding: '8px 32px',
        borderTop: '1px solid var(--border-color)',
        fontSize: '12px',
        color: 'var(--text-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        backgroundColor: 'var(--bg-secondary)'
      }}>
        <span>{stats.words} words • {stats.chars} characters</span>
        <span>{stats.readTime} min read</span>
      </div>
    </div>
  );
}
