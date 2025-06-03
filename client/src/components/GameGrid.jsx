import { Tile } from './Tile';

export const GameGrid = ({ rows }) => {
  return (
    <div className='game-grid'>
      {rows.map((rowTiles, rowIndex) => (
        <div key={rowIndex} className='game-row'>
          {rowTiles.map((charData, charIndex) => (
            <Tile
              key={`${rowIndex}-${charIndex}`}
              value={charData.value}
              state={charData.state}
            />
          ))}
        </div>
      ))}
    </div>
  );
};
