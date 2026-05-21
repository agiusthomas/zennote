import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  AlignJustify,
  Table,
  Heading,
  ChevronLeft,
  ChevronDown
} from 'lucide-react';
import { getFolderBreadcrumbs, optimizeImage } from '../utils/helpers';
import EmojiPicker from './EmojiPicker';

export default function Editor({
  note,
  folders,
  onUpdateNote,
  onRestoreNote,
  onDeleteNoteForever,
  onMoveNote,
  onBackToList,
  isOffline
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
  const [showFolderDropdown, setShowFolderDropdown] = useState(false);

  // Table creator state variables
  const [showTableCreator, setShowTableCreator] = useState(false);
  const [gridHover, setGridHover] = useState({ rows: 0, cols: 0 });

  // Table editing states
  const [activeCell, setActiveCell] = useState(null);
  const [anchorCell, setAnchorCell] = useState(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState({ x: 0, y: 0 });
  const [imageOverlayPos, setImageOverlayPos] = useState({ top: 0, left: 0, width: 0, height: 0 });

  const editorRef = useRef(null);
  const tagInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const [isEditing, setIsEditing] = useState(false);

  const activeTitle = note ? (note.draft ? note.draft.title : note.title) : '';
  const activeEmoji = note ? (note.draft ? note.draft.emoji : note.emoji) : '📓';
  const activeTags = note ? (note.draft ? note.draft.tags : note.tags) : [];
  const activeFolderId = note ? (note.draft ? note.draft.folderId : note.folderId) : null;
  const activeContent = note ? (note.draft ? note.draft.content : note.content) : '';

  const updateDraft = (fields) => {
    if (!note) return;
    const currentDraft = note.draft || {
      title: note.title || '',
      content: note.content || '<p><br></p>',
      emoji: note.emoji || '📓',
      tags: note.tags || [],
      folderId: note.folderId || null
    };
    onUpdateNote(note.id, {
      draft: {
        ...currentDraft,
        ...fields
      }
    });
  };

  // Auto-focus tag input when shown
  useEffect(() => {
    if (showTagInput) {
      tagInputRef.current?.focus();
    }
  }, [showTagInput]);

  // Sync state into contentEditable innerHTML when note ID changes
  useEffect(() => {
    if (editorRef.current && note) {
      const displayContent = note.draft ? note.draft.content : (note.content || '<p><br></p>');
      if (editorRef.current.innerHTML !== displayContent) {
        editorRef.current.innerHTML = displayContent;
      }
      setSelectedImage(null);
      setShowBorderControls(false);
      updateBlockType();

      // Auto-enter editing mode for new blank notes
      const isNewBlankNote = !note.title && !note.content && !note.draft;
      if (isNewBlankNote) {
        setIsEditing(true);
        // Initialize draft immediately for blank note
        onUpdateNote(note.id, {
          draft: {
            title: '',
            content: '<p><br></p>',
            emoji: note.emoji || '📝',
            tags: [],
            folderId: note.folderId
          }
        });
      } else {
        setIsEditing(false);
      }

      try {
        document.execCommand('enableObjectResizing', false, 'false');
      } catch (e) {}
    }
  }, [note?.id]);

  // Close image popup on scroll inside editor
  useEffect(() => {
    const handleScroll = () => {
      setSelectedImage(null);
      setShowBorderControls(false);
      setShowContextMenu(false);
      setActiveCell(null);
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

  // Global click listener to dismiss image popup, context menu and table creator
  useEffect(() => {
    const handleGlobalClick = (e) => {
      const wrapper = editorRef.current?.parentNode;
      if (wrapper && !wrapper.contains(e.target) && !e.target.closest('.image-context-popup') && !e.target.closest('.image-resize-overlay')) {
        setSelectedImage(null);
        setShowBorderControls(false);
      }
      if (!e.target.closest('.table-creator-popover') && !e.target.closest('.table-creator-trigger')) {
        setShowTableCreator(false);
      }
      if (!e.target.closest('.folder-mover-container')) {
        setShowFolderDropdown(false);
      }
      
      // Close context menu on any click
      setShowContextMenu(false);
      
      // Dismiss active cell if clicked outside table, context menu or plus button
      if (!e.target.closest('table') && !e.target.closest('.table-edge-plus') && !e.target.closest('.table-context-menu')) {
        setActiveCell(null);
        setAnchorCell(null);
        document.querySelectorAll('.cell-selected').forEach(c => c.classList.remove('cell-selected'));
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => {
      document.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  // Global keydown listener to delete selected image with Backspace / Delete keys
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (!selectedImage || !isEditing || note.isTrash) return;

      if (e.key === 'Backspace' || e.key === 'Delete') {
        // Prevent deleting if the user is typing in a form input, textarea, or similar
        const activeEl = document.activeElement;
        if (activeEl && (
          activeEl.tagName === 'INPUT' || 
          activeEl.tagName === 'TEXTAREA' || 
          activeEl.closest('.emoji-picker-popover') || 
          activeEl.closest('.tag-input') || 
          activeEl.closest('.table-context-menu')
        )) {
          return;
        }

        e.preventDefault();
        selectedImage.remove();
        setSelectedImage(null);
        setShowBorderControls(false);
        handleContentChange();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      document.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [selectedImage, isEditing, note?.isTrash]);

  // Listen for selection changes to set active table cell
  useEffect(() => {
    const handleSelectionChange = () => {
      // If we have selected cells with class, don't override activeCell with null
      const hasClassSelection = editorRef.current?.querySelector('.cell-selected');
      if (hasClassSelection) return;

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && editorRef.current) {
        let node = selection.getRangeAt(0).startContainer;
        while (node && node !== editorRef.current) {
          if (node.nodeType === 1 && (node.tagName === 'TD' || node.tagName === 'TH')) {
            setActiveCell(node);
            setAnchorCell(node);
            return;
          }
          node = node.parentNode;
        }
      }
      const activeEl = document.activeElement;
      if (activeEl && !activeEl.closest('td, th') && !activeEl.closest('.table-edge-plus') && !activeEl.closest('.table-context-menu')) {
        setActiveCell(null);
        setAnchorCell(null);
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, []);

  const updateImageOverlayPosition = useCallback(() => {
    if (!selectedImage || !editorRef.current) return;
    const rect = selectedImage.getBoundingClientRect();
    const wrapper = editorRef.current.parentNode.getBoundingClientRect();
    
    setImageOverlayPos({
      top: rect.top - wrapper.top,
      left: rect.left - wrapper.left,
      width: rect.width,
      height: rect.height
    });

    // Also update the floating toolbar position
    const offset = 48;
    let topPos = rect.top - wrapper.top - offset;
    if (topPos < 55) {
      topPos = rect.bottom - wrapper.top + 8;
    }
    setImagePopupPos({
      top: topPos,
      left: rect.left - wrapper.left + rect.width / 2
    });
  }, [selectedImage]);

  // Update positions when selectedImage changes
  useEffect(() => {
    if (selectedImage) {
      updateImageOverlayPosition();
    }
  }, [selectedImage, updateImageOverlayPosition]);

  // Window resize and scroll listeners to keep overlay in sync
  useEffect(() => {
    const handleResize = () => {
      if (selectedImage) {
        updateImageOverlayPosition();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [selectedImage, updateImageOverlayPosition]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const handleScroll = () => {
      if (selectedImage) {
        updateImageOverlayPosition();
      }
    };
    editor.addEventListener('scroll', handleScroll);
    return () => {
      editor.removeEventListener('scroll', handleScroll);
    };
  }, [selectedImage, updateImageOverlayPosition]);




  if (!note) {
    return (
      <div className="editor-panel empty-state" style={{ position: 'relative' }}>
        <button 
          className="icon-btn mobile-only-btn" 
          onClick={onBackToList}
          title="Back to notes list"
          style={{ position: 'absolute', top: '16px', left: '16px', padding: '6px' }}
        >
          <ChevronLeft size={18} />
        </button>
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
    if (editorRef.current && isEditing) {
      const content = editorRef.current.innerHTML;
      const currentContent = note.draft ? note.draft.content : note.content;
      if (content !== currentContent) {
        updateDraft({ content });
      }
      updateBlockType();
    }
  };

  const handleTitleChange = (e) => {
    updateDraft({ title: e.target.value });
  };

  const handleEmojiSelect = (emoji) => {
    updateDraft({ emoji });
  };

  const toggleFavorite = () => {
    onUpdateNote(note.id, { isFavorite: !note.isFavorite });
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    const tag = newTag.trim().toLowerCase();
    const currentTags = note.draft ? note.draft.tags : note.tags;
    if (tag && !currentTags.includes(tag)) {
      updateDraft({ tags: [...currentTags, tag] });
    }
    setNewTag('');
    setShowTagInput(false);
  };

  const handleRemoveTag = (tagToRemove) => {
    const currentTags = note.draft ? note.draft.tags : note.tags;
    updateDraft({ tags: currentTags.filter(t => t !== tagToRemove) });
  };

  const handleStartEdit = () => {
    if (isOffline) {
      alert('You are offline. Note editing is disabled in offline mode.');
      return;
    }
    if (!note.draft) {
      onUpdateNote(note.id, {
        draft: {
          title: note.title || '',
          content: note.content || '<p><br></p>',
          emoji: note.emoji || '📓',
          tags: note.tags || [],
          folderId: note.folderId || null
        }
      });
    }
    setIsEditing(true);
  };

  const handlePublish = () => {
    if (note.draft) {
      onUpdateNote(note.id, {
        title: note.draft.title,
        content: note.draft.content,
        emoji: note.draft.emoji,
        tags: note.draft.tags,
        folderId: note.draft.folderId,
        draft: null // clear draft
      });
    }
    setIsEditing(false);
  };

  const handleDiscardDraft = () => {
    if (window.confirm('Are you sure you want to discard your draft changes? This cannot be undone.')) {
      onUpdateNote(note.id, {
        draft: null
      });
      setIsEditing(false);
      // Reset editor content immediately to published content
      if (editorRef.current) {
        editorRef.current.innerHTML = note.content || '<p><br></p>';
      }
    }
  };

  const handleCloseKeepDraft = () => {
    setIsEditing(false);
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
    optimizeImage(file)
      .then((dataUrl) => {
        executeCommand('insertImage', dataUrl);
        
        // Auto-set width based on natural width vs container width
        setTimeout(() => {
          if (editorRef.current) {
            const imgs = editorRef.current.querySelectorAll('img[src^="data:image"]');
            imgs.forEach(img => {
              if (!img.style.width) {
                const applyDimensions = () => {
                  const naturalWidth = img.naturalWidth;
                  const editorWidth = editorRef.current.clientWidth - 80; // 80px accounts for editor padding
                  if (naturalWidth && naturalWidth < editorWidth) {
                    img.style.width = `${naturalWidth}px`;
                  } else {
                    img.style.width = '100%';
                  }
                  img.style.height = 'auto';
                  handleContentChange();
                };

                if (img.complete) {
                  applyDimensions();
                } else {
                  img.onload = applyDimensions;
                }
              }
            });
          }
        }, 50);
      })
      .catch((err) => {
        console.error('Failed to optimize image, falling back to original:', err);
        // Fallback to loading original file directly if optimization fails
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target.result;
          executeCommand('insertImage', dataUrl);
          setTimeout(() => {
            if (editorRef.current) {
              const imgs = editorRef.current.querySelectorAll('img[src^="data:image"]');
              imgs.forEach(img => {
                if (!img.style.width) {
                  const applyDimensions = () => {
                    const naturalWidth = img.naturalWidth;
                    const editorWidth = editorRef.current.clientWidth - 80;
                    if (naturalWidth && naturalWidth < editorWidth) {
                      img.style.width = `${naturalWidth}px`;
                    } else {
                      img.style.width = '100%';
                    }
                    img.style.height = 'auto';
                    handleContentChange();
                  };

                  if (img.complete) {
                    applyDimensions();
                  } else {
                    img.onload = applyDimensions;
                  }
                }
              });
            }
          }, 50);
        };
        reader.readAsDataURL(file);
      });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      insertImageFile(file);
    }
    e.target.value = ''; // Reset input
  };

  const handlePaste = (e) => {
    // Intercept image files first
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault(); // Stop standard paste of path text
          const file = items[i].getAsFile();
          if (file) {
            insertImageFile(file);
            return;
          }
        }
      }
    }

    // Intercept HTML pastes for tables
    const htmlData = e.clipboardData?.getData('text/html');
    const plainText = e.clipboardData?.getData('text/plain');

    if (htmlData && htmlData.includes('<table')) {
      e.preventDefault();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlData, 'text/html');
      const tables = doc.querySelectorAll('table');
      
      if (tables.length > 0) {
        tables.forEach((table) => {
          table.removeAttribute('style');
          table.removeAttribute('border');
          table.removeAttribute('cellspacing');
          table.removeAttribute('cellpadding');
          table.removeAttribute('width');
          table.removeAttribute('height');
          
          table.querySelectorAll('tr, th, td').forEach((cell) => {
            cell.removeAttribute('style');
            cell.removeAttribute('class');
            cell.removeAttribute('width');
            cell.removeAttribute('height');
            
            // Clean up font tags and spans inside headers/cells
            cell.querySelectorAll('font, span, style').forEach((n) => {
              const parent = n.parentNode;
              while (n.firstChild) {
                parent.insertBefore(n.firstChild, n);
              }
              parent.removeChild(n);
            });
          });
        });

        const cleanHtml = Array.from(tables).map(t => t.outerHTML).join('<p><br></p>');
        document.execCommand('insertHTML', false, cleanHtml + '<p><br></p>');
        handleContentChange();
        return;
      }
    }

    // Intercept plain text TSV pastes from spreadsheets (contains tabs and newlines)
    if (plainText && plainText.includes('\t') && plainText.includes('\n')) {
      e.preventDefault();
      const rows = plainText.split('\n').map(line => line.split('\t'));
      const validRows = rows.filter(r => r.some(cell => cell.trim() !== ''));
      
      if (validRows.length > 0) {
        let tableHtml = '<table>';
        validRows.forEach((row, rIndex) => {
          tableHtml += '<tr>';
          row.forEach(cellText => {
            const cleanText = cellText.replace(/\r/g, '').trim();
            if (rIndex === 0) {
              tableHtml += `<th>${cleanText || 'Header'}</th>`;
            } else {
              tableHtml += `<td>${cleanText}</td>`;
            }
          });
          tableHtml += '</tr>';
        });
        tableHtml += '</table><p><br></p>';
        document.execCommand('insertHTML', false, tableHtml);
        handleContentChange();
        return;
      }
    }
  };

  // Keyboard Shortcuts for Formats: ⌥⌘[1-4, 0] (or Alt+Ctrl+[1-4, 0])
  const handleKeyDown = (e) => {
    // Delete/Backspace support for selected table cell contents
    if ((e.key === 'Backspace' || e.key === 'Delete') && activeCell) {
      const table = activeCell.closest('table');
      if (table) {
        const selectedClassCells = Array.from(table.querySelectorAll('.cell-selected'));
        // Only clear cells if multiple cells are selected
        if (selectedClassCells.length > 1) {
          e.preventDefault();
          selectedClassCells.forEach(cell => {
            cell.innerHTML = '<br>';
          });
          handleContentChange();
          return;
        }
      }
    }

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

  const handleResizeMouseDown = (e, direction) => {
    e.preventDefault();
    e.stopPropagation();

    const img = selectedImage;
    if (!img) return;

    const startWidth = img.getBoundingClientRect().width;
    const startMouseX = e.clientX;
    const editorWidth = editorRef.current.clientWidth - 80;

    const handleMouseMove = (moveEvent) => {
      const deltaX = moveEvent.clientX - startMouseX;
      let newWidth = startWidth + (direction === 'right' ? deltaX : -deltaX);
      
      newWidth = Math.max(60, Math.min(newWidth, editorWidth));
      
      img.style.width = `${newWidth}px`;
      img.style.height = 'auto'; // Preserves aspect ratio

      // Update overlay coordinates synchronously
      const rect = img.getBoundingClientRect();
      const wrapper = editorRef.current.parentNode.getBoundingClientRect();
      
      setImageOverlayPos({
        top: rect.top - wrapper.top,
        left: rect.left - wrapper.left,
        width: rect.width,
        height: rect.height
      });

      // Also update the floating toolbar position
      const offset = 48;
      let topPos = rect.top - wrapper.top - offset;
      if (topPos < 55) {
        topPos = rect.bottom - wrapper.top + 8;
      }
      setImagePopupPos({
        top: topPos,
        left: rect.left - wrapper.left + rect.width / 2
      });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      handleContentChange();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Custom mouse down logic for grid cell selection
  const handleEditorMouseDown = (e) => {
    if (e.target.tagName === 'IMG') {
      e.preventDefault();
      setSelectedImage(e.target);
      setShowBorderControls(false);
      return;
    }

    const isRightClick = e.button === 2 || (e.button === 0 && e.ctrlKey);
    const cell = e.target.closest('td, th');
    
    if (cell && editorRef.current.contains(cell)) {
      const table = cell.closest('table');
      if (table) {
        if (isRightClick) {
          // If it's a right click and the cell is already part of the selected block, do nothing
          if (cell.classList.contains('cell-selected')) {
            return;
          }
          // If it's a right click on an unselected cell, select only this cell
          table.querySelectorAll('.cell-selected').forEach(c => c.classList.remove('cell-selected'));
          cell.classList.add('cell-selected');
          setAnchorCell(cell);
          setActiveCell(cell);
          return;
        }

        if (e.shiftKey && anchorCell && anchorCell.closest('table') === table) {
          // Shift click: select range from anchorCell to clicked cell
          e.preventDefault();
          
          const rows = Array.from(table.querySelectorAll('tr'));
          let anchorRowIdx = -1;
          let anchorColIdx = -1;
          let targetRowIdx = -1;
          let targetColIdx = -1;
          
          rows.forEach((tr, rIdx) => {
            const cells = Array.from(tr.children);
            const aIdx = cells.indexOf(anchorCell);
            const tIdx = cells.indexOf(cell);
            if (aIdx !== -1) {
              anchorRowIdx = rIdx;
              anchorColIdx = aIdx;
            }
            if (tIdx !== -1) {
              targetRowIdx = rIdx;
              targetColIdx = tIdx;
            }
          });
          
          if (anchorRowIdx !== -1 && targetRowIdx !== -1) {
            table.querySelectorAll('.cell-selected').forEach(c => c.classList.remove('cell-selected'));
            const minRow = Math.min(anchorRowIdx, targetRowIdx);
            const maxRow = Math.max(anchorRowIdx, targetRowIdx);
            const minCol = Math.min(anchorColIdx, targetColIdx);
            const maxCol = Math.max(anchorColIdx, targetColIdx);
            
            for (let r = minRow; r <= maxRow; r++) {
              const tr = rows[r];
              if (tr) {
                for (let c = minCol; c <= maxCol; c++) {
                  const cellToSelect = tr.children[c];
                  if (cellToSelect) {
                    cellToSelect.classList.add('cell-selected');
                  }
                }
              }
            }
            
            setActiveCell(cell);
            window.getSelection()?.removeAllRanges();
          }
        } else {
          // Normal click: set both anchorCell and activeCell
          table.querySelectorAll('.cell-selected').forEach(c => c.classList.remove('cell-selected'));
          cell.classList.add('cell-selected');
          
          setAnchorCell(cell);
          setActiveCell(cell);
        }
      }
    } else {
      // Clear cell highlights if clicked outside table
      editorRef.current?.querySelectorAll('.cell-selected').forEach(c => c.classList.remove('cell-selected'));
    }
  };

// Editor Click Listener (handles image popup opening)
  const handleEditorClick = (e) => {
    if (e.target.tagName === 'IMG') {
      // Handled by handleEditorMouseDown to prevent browser default handles
      return;
    }
    setSelectedImage(null);
    setShowBorderControls(false);
  };


  // Statistics (stripping HTML tags first)
  const getStats = () => {
    if (!activeContent) return { words: 0, chars: 0, readTime: 1 };
    const plainText = activeContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    const words = plainText.split(/\s+/).filter(Boolean).length;
    const chars = plainText.length;
    const readTime = Math.max(1, Math.ceil(words / 200));
    return { words, chars, readTime };
  };

  const stats = getStats();
  const breadcrumbs = getFolderBreadcrumbs(activeFolderId, folders);

  // Sort and indent folders based on parent/child relationships
  const getIndentedFolders = () => {
    const list = [];
    const visit = (parentId, depth) => {
      const children = folders.filter(f => f.parentId === parentId);
      children.sort((a, b) => a.name.localeCompare(b.name));
      children.forEach(child => {
        list.push({ ...child, depth });
        visit(child.id, depth + 1);
      });
    };
    visit(null, 0);
    visit(undefined, 0);
    
    // Add any orphaned folders that didn't get visited
    folders.forEach(f => {
      if (!list.some(item => item.id === f.id)) {
        list.push({ ...f, depth: 0 });
      }
    });
    return list;
  };



  // Insert custom table element
  const insertTable = (rows, cols) => {
    let tableHtml = '<table>';
    for (let r = 0; r < rows; r++) {
      tableHtml += '<tr>';
      for (let c = 0; c < cols; c++) {
        if (r === 0) {
          tableHtml += '<th>Header</th>';
        } else {
          tableHtml += '<td>Cell</td>';
        }
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</table><p><br></p>';

    if (document.activeElement !== editorRef.current) {
      editorRef.current.focus();
    }

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editorRef.current.contains(range.startContainer)) {
        range.deleteContents();
        const el = document.createElement('div');
        el.innerHTML = tableHtml;
        const fragment = document.createDocumentFragment();
        let node;
        let lastNode;
        while ((node = el.firstChild)) {
          lastNode = fragment.appendChild(node);
        }
        range.insertNode(fragment);
        
        if (lastNode) {
          range.setStartAfter(lastNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } else {
        editorRef.current.innerHTML += tableHtml;
      }
    } else {
      editorRef.current.innerHTML += tableHtml;
    }
    
    setShowTableCreator(false);
    handleContentChange();
  };

  // Get all selected cells for bulk operations
  const getSelectedCells = () => {
    if (!activeCell) return [];
    const table = activeCell.closest('table');
    if (!table) return [activeCell];
    
    // Check if there are cells with the custom selected class
    const selectedClassCells = Array.from(table.querySelectorAll('.cell-selected'));
    if (selectedClassCells.length > 0) {
      return selectedClassCells;
    }
    
    // Fall back to native selection
    const cells = [];
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return [activeCell];
    
    table.querySelectorAll('td, th').forEach((cell) => {
      if (selection.containsNode(cell, true)) {
        cells.push(cell);
      }
    });
    
    return cells.length > 0 ? cells : [activeCell];
  };

  // Insert row helper
  const insertRow = (offset) => {
    if (!activeCell) return;
    const currentTr = activeCell.closest('tr');
    const table = activeCell.closest('table');
    if (!currentTr || !table) return;
    
    const newTr = document.createElement('tr');
    const colCount = currentTr.children.length;
    
    for (let i = 0; i < colCount; i++) {
      const cellType = currentTr.children[i].tagName.toLowerCase();
      const newCell = document.createElement(cellType);
      newCell.innerHTML = cellType === 'th' ? 'Header' : 'Cell';
      newTr.appendChild(newCell);
    }
    
    if (offset === -1) {
      currentTr.parentNode.insertBefore(newTr, currentTr);
    } else {
      currentTr.parentNode.insertBefore(newTr, currentTr.nextSibling);
    }
    
    handleContentChange();
    setShowContextMenu(false);
  };

  // Insert column helper
  const insertColumn = (offset) => {
    if (!activeCell) return;
    const table = activeCell.closest('table');
    if (!table) return;
    
    const currentTr = activeCell.closest('tr');
    if (!currentTr) return;
    const colIndex = Array.from(currentTr.children).indexOf(activeCell);
    if (colIndex === -1) return;
    
    table.querySelectorAll('tr').forEach(tr => {
      const targetCell = tr.children[colIndex];
      if (targetCell) {
        const cellType = targetCell.tagName.toLowerCase();
        const newCell = document.createElement(cellType);
        newCell.innerHTML = cellType === 'th' ? 'Header' : 'Cell';
        
        if (offset === -1) {
          tr.insertBefore(newCell, targetCell);
        } else {
          tr.insertBefore(newCell, targetCell.nextSibling);
        }
      }
    });
    
    handleContentChange();
    setShowContextMenu(false);
  };

  // Delete selected rows (bulk)
  const deleteSelectedRows = () => {
    if (!activeCell) return;
    const cells = getSelectedCells();
    const rowsToDelete = new Set(cells.map(c => c.closest('tr')).filter(Boolean));
    const table = activeCell.closest('table');
    
    if (table) {
      rowsToDelete.forEach(tr => {
        tr.remove();
      });
      
      if (table.querySelectorAll('tr').length === 0) {
        table.remove();
      }
      
      handleContentChange();
    }
    setShowContextMenu(false);
    setActiveCell(null);
  };

  // Delete selected columns (bulk)
  const deleteSelectedColumns = () => {
    if (!activeCell) return;
    const cells = getSelectedCells();
    const table = activeCell.closest('table');
    if (!table) return;
    
    const colIndices = new Set();
    cells.forEach(cell => {
      const tr = cell.closest('tr');
      if (tr) {
        const index = Array.from(tr.children).indexOf(cell);
        if (index !== -1) colIndices.add(index);
      }
    });
    
    const sortedIndices = Array.from(colIndices).sort((a, b) => b - a);
    
    table.querySelectorAll('tr').forEach(tr => {
      sortedIndices.forEach(idx => {
        if (tr.children[idx]) {
          tr.children[idx].remove();
        }
      });
    });
    
    const firstTr = table.querySelector('tr');
    if (!firstTr || firstTr.children.length === 0) {
      table.remove();
    }
    
    handleContentChange();
    setShowContextMenu(false);
    setActiveCell(null);
  };

  // Toggle header row
  const toggleHeaderRow = () => {
    if (!activeCell) return;
    const table = activeCell.closest('table');
    if (!table) return;
    
    const firstTr = table.querySelector('tr');
    if (!firstTr) return;
    
    const cells = Array.from(firstTr.children);
    const isCurrentlyHeader = cells[0].tagName.toLowerCase() === 'th';
    const newTag = isCurrentlyHeader ? 'td' : 'th';
    
    cells.forEach(cell => {
      const newCell = document.createElement(newTag);
      newCell.innerHTML = cell.innerHTML;
      firstTr.replaceChild(newCell, cell);
    });
    
    handleContentChange();
    setShowContextMenu(false);
    setActiveCell(null);
  };

  const handleContextMenu = (e) => {
    const cell = e.target.closest('td, th');
    if (cell && editorRef.current.contains(cell)) {
      e.preventDefault();
      setActiveCell(cell);
      setContextMenuPos({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    } else {
      setShowContextMenu(false);
    }
  };

  // Custom copy handler to construct tabular representation for range selection
  const handleCopy = (e) => {
    if (!activeCell) return;
    const table = activeCell.closest('table');
    if (!table) return;
    
    const selectedClassCells = Array.from(table.querySelectorAll('.cell-selected'));
    // Only intercept if we have multiple cells selected
    if (selectedClassCells.length > 1) {
      e.preventDefault();
      
      const rows = Array.from(table.querySelectorAll('tr'));
      let minR = rows.length, maxR = -1;
      let minC = 1000, maxC = -1;
      
      rows.forEach((tr, rIdx) => {
        Array.from(tr.children).forEach((cell, cIdx) => {
          if (cell.classList.contains('cell-selected')) {
            minR = Math.min(minR, rIdx);
            maxR = Math.max(maxR, rIdx);
            minC = Math.min(minC, cIdx);
            maxC = Math.max(maxC, cIdx);
          }
        });
      });
      
      if (maxR !== -1) {
        let textOutput = '';
        let htmlOutput = '<table>';
        
        for (let r = minR; r <= maxR; r++) {
          let rowText = [];
          htmlOutput += '<tr>';
          const tr = rows[r];
          
          for (let c = minC; c <= maxC; c++) {
            const cell = tr?.children[c];
            if (cell && cell.classList.contains('cell-selected')) {
              rowText.push(cell.innerText || cell.textContent || '');
              const tag = cell.tagName.toLowerCase();
              htmlOutput += `<${tag}>${cell.innerHTML}</${tag}>`;
            } else {
              rowText.push('');
              htmlOutput += '<td></td>';
            }
          }
          textOutput += rowText.join('\t') + '\n';
          htmlOutput += '</tr>';
        }
        htmlOutput += '</table>';
        
        e.clipboardData.setData('text/plain', textOutput.trimEnd());
        e.clipboardData.setData('text/html', htmlOutput);
      }
    }
  };



  // Calculate coordinates for table plus icons
  let rowPlusPos = { top: 0, left: 0 };
  let colPlusPos = { top: 0, left: 0 };
  
  if (activeCell && editorRef.current) {
    const rect = activeCell.getBoundingClientRect();
    const wrapper = editorRef.current.parentNode.getBoundingClientRect();
    
    rowPlusPos = {
      top: rect.bottom - wrapper.top,
      left: rect.left - wrapper.left + rect.width / 2
    };
    
    colPlusPos = {
      top: rect.top - wrapper.top + rect.height / 2,
      left: rect.right - wrapper.left
    };
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
        <button 
          className="icon-btn mobile-only-btn" 
          onClick={onBackToList}
          title="Back to notes list"
          style={{ marginRight: '8px', padding: '4px' }}
        >
          <ChevronLeft size={18} />
        </button>
        {/* Breadcrumbs */}
        <div className="editor-breadcrumbs">
          <Folder size={12} />
          <span>Root</span>
          {breadcrumbs.map(folder => (
            <React.Fragment key={folder.id}>
              <span>/</span>
              <span 
                style={{ cursor: isEditing ? 'pointer' : 'default' }}
                onClick={() => isEditing && onMoveNote && updateDraft({ folderId: folder.id })}
              >
                {folder.name}
              </span>
            </React.Fragment>
          ))}
          
          {/* Custom Folder Mover Dropdown */}
          {!note.isTrash && (
            <div className="folder-mover-container">
              <button
                type="button"
                className={`folder-mover-trigger ${showFolderDropdown ? 'active' : ''}`}
                onClick={() => setShowFolderDropdown(!showFolderDropdown)}
                title="Move note to folder"
              >
                <Folder size={14} />
                <span>Move</span>
                <ChevronDown size={12} style={{ opacity: 0.7 }} />
              </button>
              
              {showFolderDropdown && (
                <div className="folder-mover-dropdown">
                  <button
                    type="button"
                    className={`folder-mover-item ${!activeFolderId ? 'selected' : ''}`}
                    onClick={() => {
                      const fId = null;
                      if (isEditing) {
                        updateDraft({ folderId: fId });
                      } else {
                        onMoveNote(note.id, fId);
                      }
                      setShowFolderDropdown(false);
                    }}
                  >
                    <Folder size={14} style={{ opacity: 0.6 }} />
                    <span>Move to Root</span>
                  </button>
                  {getIndentedFolders().map(f => {
                    const isSelected = activeFolderId === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        className={`folder-mover-item ${isSelected ? 'selected' : ''}`}
                        style={{ paddingLeft: `${10 + f.depth * 12}px` }}
                        onClick={() => {
                          const fId = f.id;
                          if (isEditing) {
                            updateDraft({ folderId: fId });
                          } else {
                            onMoveNote(note.id, fId);
                          }
                          setShowFolderDropdown(false);
                        }}
                      >
                        <Folder size={14} style={{ opacity: 0.6 }} />
                        <span>{f.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Note Title Row */}
        <div className="editor-title-row">
          <div style={{ position: 'relative' }}>
            <button 
              className="emoji-selector-trigger"
              onClick={() => !note.isTrash && isEditing && setShowEmojiPicker(!showEmojiPicker)}
              disabled={!isEditing || note.isTrash}
              title="Select note header emoji"
            >
              {activeEmoji || '📓'}
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
            className={`editor-title-input ${!isEditing ? 'read-only' : ''}`}
            value={activeTitle}
            onChange={handleTitleChange}
            placeholder="Untitled Note"
            disabled={!isEditing || note.isTrash}
            title="Note title"
          />

          {!note.isTrash && (
            <div className="flex-row" style={{ gap: '8px', alignItems: 'center' }}>
              {isEditing ? (
                <>
                  <button className="btn btn-primary" onClick={handlePublish} style={{ padding: '6px 12px', fontSize: '13px' }}>
                    Save
                  </button>
                  <button className="btn btn-secondary" onClick={handleCloseKeepDraft} style={{ padding: '6px 12px', fontSize: '13px' }}>
                    Cancel
                  </button>
                  {note.draft && (
                    <button className="btn btn-discard" onClick={handleDiscardDraft} style={{ padding: '6px 12px', fontSize: '13px' }}>
                      Discard Draft
                    </button>
                  )}
                </>
              ) : (
                <>
                  {note.draft && (
                    <span className="draft-header-badge" style={{ marginRight: '8px' }}>
                      Draft Version
                    </span>
                  )}
                  <button 
                    className="btn btn-primary" 
                    onClick={handleStartEdit} 
                    style={{ padding: '6px 12px', fontSize: '13px', opacity: isOffline ? 0.6 : 1 }}
                    title={isOffline ? "Editing is disabled in offline mode" : "Edit note"}
                    disabled={isOffline}
                  >
                    Edit
                  </button>
                  {note.draft && (
                    <button className="btn btn-discard" onClick={handleDiscardDraft} style={{ padding: '6px 12px', fontSize: '13px' }}>
                      Discard Draft
                    </button>
                  )}
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
                </>
              )}
            </div>
          )}
        </div>

        {/* Tags Row */}
        <div className="editor-tags-row">
          <TagIcon size={14} style={{ color: 'var(--text-muted)' }} />
          {activeTags.map(tag => (
            <span key={tag} className="editor-tag-pill">
              #{tag}
              {!note.isTrash && isEditing && (
                <span className="editor-tag-remove" onClick={() => handleRemoveTag(tag)} title={`Remove #${tag}`}>
                  <X size={12} />
                </span>
              )}
            </span>
          ))}

          {!note.isTrash && isEditing && (
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

      {/* Editor Toolbar (Only show if not in Trash and in Edit Mode) */}
      {!note.isTrash && isEditing && (
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

            <div style={{ position: 'relative', display: 'inline-block' }}>
              <button 
                className={`icon-btn table-creator-trigger ${showTableCreator ? 'active' : ''}`} 
                title="Insert Table" 
                onClick={() => setShowTableCreator(!showTableCreator)}
              >
                <Table size={16} />
              </button>
              
              {showTableCreator && (
                <div 
                  className="table-creator-popover" 
                  style={{
                    position: 'absolute',
                    top: '32px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 100,
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    padding: '12px',
                    boxShadow: 'var(--shadow-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    width: '180px'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ fontSize: '11px', fontWeight: '600', display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)' }}>
                    <span>Table Size</span>
                    <span style={{ color: 'var(--accent-color)' }}>
                      {gridHover.rows} × {gridHover.cols}
                    </span>
                  </div>
                  <div 
                    style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(8, 1fr)', 
                      gap: '4px' 
                    }}
                    onMouseLeave={() => setGridHover({ rows: 0, cols: 0 })}
                  >
                    {Array.from({ length: 8 }).map((_, r) => (
                      Array.from({ length: 8 }).map((_, c) => {
                        const isActive = r < gridHover.rows && c < gridHover.cols;
                        return (
                          <div
                            key={`${r}-${c}`}
                            onMouseEnter={() => setGridHover({ rows: r + 1, cols: c + 1 })}
                            onClick={() => insertTable(r + 1, c + 1)}
                            style={{
                              width: '14px',
                              height: '14px',
                              borderRadius: '2px',
                              border: isActive ? '1px solid var(--accent-color)' : '1px solid var(--border-color)',
                              backgroundColor: isActive ? 'var(--accent-color)' : 'transparent',
                              cursor: 'pointer',
                              transition: 'all 0.05s ease'
                            }}
                          />
                        );
                      })
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Editor Content Area */}
      <div className="editor-split-container">
        <div className="editor-textarea-wrapper" style={{ position: 'relative' }}>


          {/* Table Hover Edge Plus Buttons */}
          {activeCell && !note.isTrash && isEditing && (
            <>
              {/* Row insertion plus button */}
              <button
                className="table-edge-plus"
                style={{
                  position: 'absolute',
                  top: `${rowPlusPos.top}px`,
                  left: `${rowPlusPos.left}px`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 15
                }}
                onClick={() => insertRow(1)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  insertRow(-1);
                }}
                title="Click: Add row below | Right-click: Add row above"
              >
                <Plus size={10} />
              </button>

              {/* Column insertion plus button */}
              <button
                className="table-edge-plus"
                style={{
                  position: 'absolute',
                  top: `${colPlusPos.top}px`,
                  left: `${colPlusPos.left}px`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 15
                }}
                onClick={() => insertColumn(1)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  insertColumn(-1);
                }}
                title="Click: Add col to right | Right-click: Add col to left"
              >
                <Plus size={10} />
              </button>
            </>
          )}

          <div
            ref={editorRef}
            className="wysiwyg-editor"
            contentEditable={isEditing && !note.isTrash}
            onInput={handleContentChange}
            onBlur={handleContentChange}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            onMouseDown={handleEditorMouseDown}
            onClick={handleEditorClick}
            onContextMenu={handleContextMenu}
            onCopy={handleCopy}
            onMouseUp={() => {
              updateBlockType();
            }}
            onKeyUp={updateBlockType}
            placeholder="Start typing your note here..."
          />

          {/* Image Resize Overlay Handles — rendered AFTER editor so it paints on top */}
          {selectedImage && (
            <div 
              className="image-resize-overlay"
              style={{
                position: 'absolute',
                top: `${imageOverlayPos.top}px`,
                left: `${imageOverlayPos.left}px`,
                width: `${imageOverlayPos.width}px`,
                height: `${imageOverlayPos.height}px`,
                pointerEvents: 'none',
                zIndex: 10
              }}
            >
              <div className="image-resize-outline" />

              {!note.isTrash && isEditing && (
                <div 
                  className="image-resize-handle left-handle"
                  style={{ pointerEvents: 'auto' }}
                  onMouseDown={(e) => handleResizeMouseDown(e, 'left')}
                />
              )}

              {!note.isTrash && isEditing && (
                <div 
                  className="image-resize-handle right-handle"
                  style={{ pointerEvents: 'auto' }}
                  onMouseDown={(e) => handleResizeMouseDown(e, 'right')}
                />
              )}
            </div>
          )}

          {/* Floating Image Editor Toolbar — rendered AFTER editor so it paints on top */}
          {selectedImage && isEditing && (
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
              <button 
                className={`icon-btn ${selectedImage.style.borderWidth && selectedImage.style.borderWidth !== '0px' ? 'active' : ''}`}
                onClick={() => {
                  const nextShow = !showBorderControls;
                  setShowBorderControls(nextShow);
                  if (nextShow) {
                    const hasBorder = selectedImage.style.borderWidth && selectedImage.style.borderWidth !== '0px';
                    if (!hasBorder) {
                      selectedImage.style.borderStyle = 'solid';
                      selectedImage.style.borderWidth = lastBorderWidth;
                      selectedImage.style.borderColor = lastBorderColor;
                      selectedImage.style.padding = '6px';
                      selectedImage.style.backgroundColor = 'var(--bg-secondary)';
                      handleContentChange();
                      // Recalculate overlay after border changes layout
                      setTimeout(() => updateImageOverlayPosition(), 0);
                    }
                  }
                }}
                title="Border Options"
                style={{ padding: '4px', height: '24px', width: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Square size={14} />
              </button>

              {showBorderControls && (
                <div className="flex-row inline-border-options" style={{ gap: '6px', marginLeft: '6px', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Size:</span>
                  <select
                    value={selectedImage.style.borderWidth || '0px'}
                    onChange={(e) => {
                      const width = e.target.value;
                      if (width === '0px') {
                        selectedImage.style.border = '';
                        selectedImage.style.borderWidth = '';
                        selectedImage.style.borderStyle = '';
                        selectedImage.style.borderColor = '';
                        selectedImage.style.padding = '';
                        selectedImage.style.backgroundColor = '';
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
                      // Recalculate overlay after border changes layout
                      setTimeout(() => updateImageOverlayPosition(), 0);
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
                            setTimeout(() => updateImageOverlayPosition(), 0);
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
                      setTimeout(() => updateImageOverlayPosition(), 0);
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
                      setTimeout(() => updateImageOverlayPosition(), 0);
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
                      setTimeout(() => updateImageOverlayPosition(), 0);
                    }}
                    title="Align Right"
                    style={{ padding: '4px', height: '24px', width: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <AlignRight size={14} />
                  </button>
                </>
              )}

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

          {/* Table Context Menu */}
          {showContextMenu && activeCell && isEditing && (
            <div 
              className="table-context-menu"
              style={{
                top: `${contextMenuPos.y}px`,
                left: `${contextMenuPos.x}px`
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button className="table-context-menu-item" onClick={() => insertRow(-1)}>
                <Plus size={14} /> Insert Row Above
              </button>
              <button className="table-context-menu-item" onClick={() => insertRow(1)}>
                <Plus size={14} /> Insert Row Below
              </button>
              <div className="table-context-menu-divider" />
              <button className="table-context-menu-item" onClick={() => insertColumn(-1)}>
                <Plus size={14} /> Insert Column Left
              </button>
              <button className="table-context-menu-item" onClick={() => insertColumn(1)}>
                <Plus size={14} /> Insert Column Right
              </button>
              <div className="table-context-menu-divider" />
              <button className="table-context-menu-item" onClick={toggleHeaderRow}>
                <Heading size={14} /> Toggle Header Row
              </button>
              <div className="table-context-menu-divider" />
              <button className="table-context-menu-item" style={{ color: '#ef4444' }} onClick={deleteSelectedRows}>
                <Trash size={14} /> Delete Selected Row(s)
              </button>
              <button className="table-context-menu-item" style={{ color: '#ef4444' }} onClick={deleteSelectedColumns}>
                <Trash size={14} /> Delete Selected Column(s)
              </button>
              <div className="table-context-menu-divider" />
              <button className="table-context-menu-item" style={{ color: '#ef4444' }} onClick={() => {
                const table = activeCell.closest('table');
                if (table) table.remove();
                setActiveCell(null);
                setShowContextMenu(false);
                handleContentChange();
              }}>
                <Trash size={14} /> Delete Table
              </button>
            </div>
          )}
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
