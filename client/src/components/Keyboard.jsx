export const Keyboard = ({ onKeyPress, keyboardStates }) => {
  const rows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['+', '-', '*', '/'],
    ['ENTER', 'BACKSPACE'],
  ];

  const handleButtonClick = (key) => {
    onKeyPress(key);
  };

  const getKeyClass = (key) => {
    let classNames = 'key-button ';

    if (key === 'ENTER' || key === 'BACKSPACE') {
      classNames += 'key-action ';
      if (key === 'ENTER') classNames += 'key-enter';
      if (key === 'BACKSPACE') classNames += 'key-backspace';
    } else if (['+', '-', '*', '/'].includes(key)) {
      classNames += 'key-operator ';
    }

    // Apply color based on its state in previous guesses
    const state = keyboardStates[key];
    if (state) {
      if (state === 'correct') {
        classNames += 'key-correct';
      } else if (state === 'present') {
        classNames += 'key-present';
      } else if (state === 'absent') {
        classNames += 'key-absent';
      }
    }

    return classNames;
  };

  return (
    <div className='keyboard-container'>
      {rows.map((row, rowIndex) => (
        <div key={rowIndex} className='keyboard-row'>
          {row.map((key) => (
            <button
              key={key}
              onClick={() => handleButtonClick(key)}
              className={getKeyClass(key)}
              style={{
                flexBasis:
                  key === 'ENTER' || key === 'BACKSPACE' ? 'auto' : '10%',
              }}>
              {key === 'BACKSPACE' ? 'DEL' : key}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
};
