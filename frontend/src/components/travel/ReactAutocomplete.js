import React, { useEffect, useRef, useState } from 'react';

export function ReactAutocomplete({ onSelect, placeholder = "Enter an address here" }) {
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [showClear, setShowClear] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const timeoutRef = useRef(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleInput = async () => {
      const value = input.value;
      setInputValue(value);
      
      if (!value) {
        setShowClear(false);
        setItems([]);
        return;
      }

      setShowClear(true);

      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set a new timeout
      timeoutRef.current = setTimeout(async () => {
        try {
          // Using the environment variable for the API key
          const apiKey = process.env.VUE_APP_GEOAPIFY_API_KEY || '77233530582744269b34444605bdadab';
          const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(value)}&limit=5&apiKey=${apiKey}`;
          
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            // Only update if the input value hasn't changed
            if (value === input.value) {
              setItems(data.features || []);
            }
          }
        } catch (err) {
          console.error('Error fetching locations:', err);
        }
      }, 300); // 300ms debounce
    };

    const handleKeyDown = (e) => {
      if (!items.length) return;

      if (e.keyCode === 40) { // Down arrow
        e.preventDefault();
        setFocusedIndex(prev => prev < items.length - 1 ? prev + 1 : 0);
      } else if (e.keyCode === 38) { // Up arrow
        e.preventDefault();
        setFocusedIndex(prev => prev > 0 ? prev - 1 : items.length - 1);
      } else if (e.keyCode === 13 && focusedIndex > -1) { // Enter
        e.preventDefault();
        handleSelect(items[focusedIndex]);
      }
    };

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setItems([]);
        setFocusedIndex(-1);
      }
    };

    input.addEventListener('input', handleInput);
    input.addEventListener('keydown', handleKeyDown);
    document.addEventListener('click', handleClickOutside);

    return () => {
      input.removeEventListener('input', handleInput);
      input.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [items, focusedIndex]);

  const handleSelect = (item) => {
    if (item && inputRef.current) {
      inputRef.current.value = item.properties.formatted;
      setInputValue(item.properties.formatted);
      if (typeof onSelect === 'function') {
        onSelect(item);
      }
    }
    setItems([]);
    setFocusedIndex(-1);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (inputRef.current) {
      inputRef.current.value = '';
      setInputValue('');
      if (typeof onSelect === 'function') {
        onSelect(null);
      }
    }
    setShowClear(false);
    setItems([]);
    setFocusedIndex(-1);
  };

  return (
    <div className="autocomplete-container" ref={containerRef}>
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder || "Enter an address"}
        defaultValue={inputValue}
      />
      {showClear && (
        <button 
          className="clear-button visible" 
          onClick={handleClear}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        >
          ✕
        </button>
      )}
      {items.length > 0 && (
        <div className="autocomplete-items">
          {items.map((item, index) => (
            <div
              key={index}
              className={index === focusedIndex ? 'autocomplete-active' : ''}
              onClick={() => handleSelect(item)}
            >
              {item.properties.formatted}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReactAutocomplete; 