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
    case 'empty':
    default:
      tileClass += 'tile-empty';
      break;
  }

  const displayValue = String(value || '').toUpperCase();

  return <div className={tileClass}>{displayValue}</div>;
};
