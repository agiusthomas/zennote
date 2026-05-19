import React, { useState, useEffect, useRef } from 'react';

const EMOJI_LIST = [
  // Workspace/Notes
  { char: '📓', name: 'notebook' },
  { char: '📝', name: 'memo text page write' },
  { char: '💡', name: 'idea lightbulb bright' },
  { char: '✨', name: 'sparkles gold shine magic' },
  { char: '📋', name: 'clipboard check list task' },
  { char: '📅', name: 'calendar date schedule' },
  { char: '📌', name: 'pushpin notice mark' },
  { char: '🚀', name: 'rocket launch startup speed' },
  { char: '💻', name: 'laptop computer developer code' },
  { char: '🎨', name: 'art paint palette creative' },
  { char: '📚', name: 'books read library study' },
  { char: '🔖', name: 'bookmark tag save' },
  { char: '🔍', name: 'search find zoom glass' },
  
  // Smileys/Emotions
  { char: '😀', name: 'smile happy laugh face' },
  { char: '😊', name: 'blush smile content nice' },
  { char: '😎', name: 'cool sunglasses chill' },
  { char: '🤩', name: 'starry eye excited wowed' },
  { char: '🤔', name: 'thinking question ponder' },
  { char: '🤯', name: 'mindblown explode surprise' },
  { char: '😴', name: 'sleepy tired nap' },
  { char: '🥳', name: 'celebrate party horn' },
  
  // Symbols/Icons
  { char: '🔥', name: 'fire hot trend power' },
  { char: '🌟', name: 'star shine highlight' },
  { char: '⚡', name: 'lightning bolt energy quick' },
  { char: '🎯', name: 'target goal focus hit' },
  { char: '🛡️', name: 'shield security protect' },
  { char: '🔑', name: 'key unlock secret access' },
  { char: '⚙️', name: 'gear settings tool process' },
  { char: '❤️', name: 'heart love like' },
  { char: '⭐', name: 'star bookmark' },
  { char: '⚠️', name: 'warning alert hazard' },
  
  // Nature/Objects
  { char: '☘️', name: 'clover luck green' },
  { char: '☀️', name: 'sun sunny day light' },
  { char: '🌙', name: 'moon night dark sleep' },
  { char: '☕', name: 'coffee tea drink break' },
  { char: '🍕', name: 'pizza food snack' },
  { char: '✈️', name: 'airplane travel trip fly' }
];

export default function EmojiPicker({ onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState(EMOJI_LIST);
  const containerRef = useRef(null);

  useEffect(() => {
    const term = search.toLowerCase().trim();
    if (!term) {
      setFiltered(EMOJI_LIST);
    } else {
      setFiltered(EMOJI_LIST.filter(e => e.name.toLowerCase().includes(term)));
    }
  }, [search]);

  // Handle click outside to close
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div className="emoji-picker-popover" ref={containerRef}>
      <input
        type="text"
        className="emoji-picker-search"
        placeholder="Search emojis..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
      />
      <div className="emoji-picker-grid">
        {filtered.length > 0 ? (
          filtered.map((e, index) => (
            <span
              key={index}
              className="emoji-picker-char"
              title={e.name.split(' ')[0]}
              onClick={() => {
                onSelect(e.char);
                onClose();
              }}
            >
              {e.char}
            </span>
          ))
        ) : (
          <div style={{ gridColumn: 'span 7', padding: '10px 0', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
            No emojis found
          </div>
        )}
      </div>
    </div>
  );
}
