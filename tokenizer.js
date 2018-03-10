/** Take a string containing source code and return an array of tokens.
 *
 * A token is an object with the fields `value`, `kind` and `location`. `value` is
 * the string corresponding to the token (the lexeme), `kind` is either one of
 * 'identifier' or 'number' (this allows us to just write `token.kind ==
 * 'number'` or `token.kind == 'identifier'` instead of checking whether `value`
 * contains a number or identifier respectively) or it is equal to value.
 *
 * `location` is an object with the fields `line` and `column`, which correspond
 * to the location (i.e. the line and column numbers) where the token starts in
 * the input string.
 *
 * White space between tokens is discarded.
 *
 * The last token will have the kind 'EOF' and the value '', representing the end
 * of the input. It will be the only token with that kind or with an empty vlaue.
 */
function tokenize(source) {
  let i = 0;
  let line = 1;
  let column = 1;

  function location() {
    return {
      line: line,
      column: column
    };
  }

  function readChar() {
    let char = source[i++];
    if (char === '\n') {
      line++;
      column = 1;
    } else {
      column++;
    }
    return char;
  }

  const keywords = ['var', 'def'];

  function readIdentifier() {
    let loc = location();
    let tokenStart = i;
    while (i < source.length && source[i].match(/[a-zA-Z0-9_]/)) {
      readChar();
    }
    let lexeme = source.substring(tokenStart, i);
    if (keywords.indexOf(lexeme) >= 0) {
      return { kind: lexeme, value: lexeme, location: loc };
    } else {
      return { kind: 'identifier', value: lexeme, location: loc };
    }
  }

  function readNumber() {
    let loc = location();
    let tokenStart = i;
    while (i < source.length && source[i].match(/[0-9.]/)) {
      readChar();
    }
    return { kind: 'number', value: parseFloat(source.substring(tokenStart, i)), location: loc };
  }

  function readOperator() {
    let loc = location();
    // All operators we support consist only of a single character
    let op = readChar();
    return { kind: op, value: op, location: loc };
  }

  function discardSpace() {
    while (i < source.length && source[i].match(/\s/)) {
      readChar();
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
  tokens.push( { kind: 'EOF', value: '', location: location() } );
  return tokens;
}