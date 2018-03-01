/** Take a string containing source code and return an array of tokens.
 *
 * A token is an object with the fields `value` and `kind`. `value` is the
 * string corresponding to the token (the lexeme), `kind` is either one of
 * 'identifier' or 'number' (this allows us to just write `token.kind ==
 * 'number'` or `token.kind == 'identifier'` instead of checking whether `value`
 * contains a number or identifier respectively) or it is equal to value.
 *
 * White space between tokens is discarded.
 */
function tokenize(source) {
  let i = 0;
  const keywords = ['var', 'def'];

  function readIdentifier() {
    let tokenStart = i;
    while (i < source.length && source[i].match(/[a-zA-Z0-9_]/)) {
      i++;
    }
    let lexeme = source.substring(tokenStart, i);
    if (keywords.indexOf(lexeme) >= 0) {
      return { kind: lexeme, value: lexeme };
    } else {
      return { kind: 'identifier', value: lexeme };
    }
  }

  function readNumber() {
    let tokenStart = i;
    while (i < source.length && source[i].match(/[0-9.]/)) {
      i++;
    }
    return { kind: 'number', value: parseFloat(source.substring(tokenStart, i)) };
  }

  function readOperator() {
    // All operators we support consist only of a single character
    let op = source[i++];
    return { kind: op, value: op };
  }

  function discardSpace() {
    while (i < source.length && source[i].match(/\s/)) {
      i++;
    }
  }

  let tokens = [];
  discardSpace();
  while (i < source.length) {
    if (source[i].match(/[a-zA-Z_]/)) {
      tokens.push(readIdentifier());
    } else if (source[i].match(/[0-9]/)) {
      tokens.push(readNumber());
    } else {
      tokens.push(readOperator());
    }
    discardSpace();
  }
  return tokens;
}