// src/components/Tile.jsx
import React from 'react';

export const Tile = ({ value, state }) => {
  let tileClass = 'tile ';

  switch (state) {
    case 'correct':
      tileClass += 'tile-correct';
      break;
    case 'present':
      tileClass += 'tile-present';
      break;
    case 'absent':
      tileClass += 'tile-absent';
      break;
    case 'current-typing':
      tileClass += 'tile-current-typing';
      break;
    case 'empty': // This applies to empty slots in the current row AND future rows
    default:
      tileClass += 'tile-empty';
      break;
  }

  // Ensure value is treated as string, and display only if non-empty
  const displayValue = String(value || '').toUpperCase();

  return <div className={tileClass}>{displayValue}</div>;
};
