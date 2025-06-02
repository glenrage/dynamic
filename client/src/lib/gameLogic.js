import * as math from 'mathjs';

export const evaluateExpression = (expression) => {
  try {
    const result = math.evaluate(expression);
    return typeof result === 'number' && Number.isFinite(result)
      ? result
      : null;
  } catch (e) {
    return null;
  }
};
