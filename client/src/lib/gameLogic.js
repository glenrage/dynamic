import { evaluate as mathEvaluate } from 'mathjs';

export const evaluateExpression = (expression) => {
  if (
    !expression ||
    typeof expression !== 'string' ||
    expression.trim() === ''
  ) {
    return null;
  }
  try {
    const lastChar = expression.trim().slice(-1);
    if (['+', '-', '*', '/'].includes(lastChar)) {
      return null;
    }
    const result = mathEvaluate(expression);
    if (typeof result === 'number' && isFinite(result)) {
      return result;
    } else {
      return null;
    }
  } catch (error) {
    console.error(
      '[evaluateExpression] Error during evaluation. Returning null. Error:',
      error.message
    );
    return null;
  }
};
