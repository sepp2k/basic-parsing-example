class RecursiveDescentParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.tokenIndex = 0;
  }

  // We'll call this helper method to throw a parse error when we encounter
  // ill-formed input.
  parseError(message) {
    let err = new Error(message);
    err.name = "ParseError";
    throw err;
  }

  get currentToken() {
    if (this.tokenIndex < this.tokens.length) {
      return this.tokens[this.tokenIndex].kind;
    } else {
      return 'EOF';
    }
  }

  get currentTokenValue() {
    return this.tokens[this.tokenIndex].value;
  }

  parseExpression() {
    return this.parseAdditiveExpression();
  }

  parseAdditiveExpression() {
    let expression = this.parseMultiplicativeExpression();
    while (this.currentToken === '+' || this.currentToken === '-') {
      let operator = this.currentToken;
      this.tokenIndex++;
      let rhs = this.parseMultiplicativeExpression();
      expression = {kind: operator, lhs: expression, rhs: rhs};
    }
    return expression;
  }

  parseMultiplicativeExpression() {
    let expression = this.parseExponentialExpression();
    while (this.currentToken === '*' || this.currentToken === '/' || this.currentToken === '%') {
      let operator = this.currentToken;
      this.tokenIndex++;
      let rhs = this.parseExponentialExpression();
      expression = {kind: operator, lhs: expression, rhs: rhs};
    }
    return expression;
  }

  parseExponentialExpression() {
    let lhs = this.parsePrefixExpression();
    // Since ^ is right-associative, we use recursive calls to parseExponentialExpression
    // instead of a while loop
    if (this.currentToken === '^') {
      this.tokenIndex++;
      let rhs = this.parseExponentialExpression();
      return {kind: '^', lhs: lhs, rhs: rhs};
    } else {
      return lhs;
    }
  }

  parsePrefixExpression() {
    let negate = false;
    // Unary + is a no-op, so we simply do nothing and continue with the
    // next token. Note that we can only do this because the only type we
    // support are numbers. If we supported types other than numbers, we'd
    // have to keep the unary + around long enough for the type checker to
    // produce an error if we try to use + on a string.
    // For unary - we keep track of a flag telling us whether to negate the
    // following expression or not (since two -s cancel each other out, we
    // we only do something if there are an uneven number of -s).
    while (this.currentToken === '+' || this.currentToken === '-') {
      if (this.currentToken === '-') {
        negate = !negate;
      }
      this.tokenIndex++;
    }
    let expression = this.parsePrimaryExpression();
    if (negate) {
      // The unary - is translated as a binary - with 0 as the left operand.
      return {kind: '-', lhs: {kind: 'numberLiteral', value: 0}, rhs: expression};
    } else {
      return expression;
    }
  }

  parsePrimaryExpression() {
    switch(this.currentToken) {
      case 'number':
      let value = this.currentTokenValue;
      this.tokenIndex++;
      return {kind: 'numberLiteral', value: value};

      case 'identifier':
      let name = this.currentTokenValue;
      this.tokenIndex++;
      if (this.currentToken === '(') {
        // Identifier followed by a '(' == function call
        this.tokenIndex++;
        if (this.currentToken === ')') {
          // Move the cursor beyond the ')'
          this.tokenIndex++;
          return {kind: 'functionCall', name: name, arguments: []};
        } else {
          let args = [ this.parseExpression() ];
          while (this.currentToken !== ')') {
            if (this.currentToken !== ',') {
              this.parseError("Unexpected " + this.currentToken + " token; expected ',', ')' or infix operator");
            }
            this.tokenIndex++;
            args.push(this.parseExpression());
          }
          // Move the cursor beyond the ')'
          this.tokenIndex++;
          return {kind: 'functionCall', name: name, arguments: args};
        }
      } else {
        // Otherwise it's a variable
        return {kind: 'variable', name: name};
      }

      case '(':
      this.tokenIndex++;
      let expression = this.parseExpression();
      if (this.currentToken === ')') {
        this.tokenIndex++;
      } else {
        this.parseError("Unexpected " + this.currentToken + " token; expected ')' or infix operator");
      }
      return expression;

      default:
      this.parseError("Unexpected " + this.currentToken + " token; expected expression");
    }
  }

  parseExpressionEOF() {
    let expression = this.parseExpression();
    if (this.currentToken === 'EOF') {
      return expression;
    } else {
      this.parseError("Unexpected " + this.currentToken + " token; expected infix operator or end of input");
    }
  }
}

function parseExpression(tokens) {
  return new RecursiveDescentParser(tokens).parseExpressionEOF();
}