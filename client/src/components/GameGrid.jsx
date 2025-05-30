// src/components/GameGrid.jsx
import React from 'react';
import { Tile } from './Tile';

// Changed prop name from 'guesses' to 'rows' to better reflect content
export const GameGrid = ({ rows }) => {
  return (
    <div className='game-grid'>
      {rows.map(
        (
          rowTiles,
          rowIndex // Iterate over the prepared rows
        ) => (
          <div key={rowIndex} className='game-row'>
            {rowTiles.map((charData, charIndex) => (
              <Tile
                key={`${rowIndex}-${charIndex}`}
                value={charData.value}
                state={charData.state}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
};
