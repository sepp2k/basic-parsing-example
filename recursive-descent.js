class RecursiveDescentParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.tokenIndex = 0;
  }

  // We'll call this helper method to throw a parse error when we encounter
  // ill-formed input.
  parseError(message) {
    let location = this.tokens[this.tokenIndex].location;
    let err = new Error("Line " + location.line + ", column " + location.column + ": " + message);
    err.name = "ParseError";
    throw err;
  }

  get currentToken() {
    return this.tokens[this.tokenIndex].kind;
  }

  get currentTokenValue() {
    return this.tokens[this.tokenIndex].value;
  }

  expect(tokenType) {
    if (this.currentToken === tokenType) {
      let value = this.currentTokenValue;
      this.tokenIndex++;
      return value;
    } else {
      this.parseError("Unexpected " + this.currentToken + " token; expected " + tokenType);
    }
  }

  parseProgram() {
    let definitions = [];
    while (this.currentToken !== 'EOF') {
      definitions.push(this.parseDefinition());
    }
    return definitions;
  }

  parseDefinition() {
    switch (this.currentToken) {
      case 'var': {
        this.tokenIndex++;
        let name = this.expect('identifier');
        this.expect('=');
        let expression = this.parseExpression();
        if (this.currentToken !== ';') {
          this.parseError("Unexpected " + this.currentToken + " token; expected infix operator or ';'");
        }
        this.tokenIndex++;
        return {kind: 'variable definition', name: name, body: expression};
      }

      case 'def': {
        this.tokenIndex++;
        let name = this.expect('identifier');
        let parameters = this.parseParameterList();
        this.expect('=');
        let expression = this.parseExpression();
        if (this.currentToken !== ';') {
          this.parseError("Unexpected " + this.currentToken + " token; expected infix operator or ';'");
        }
        this.tokenIndex++;
        return {kind: 'function definition', name: name, parameters: parameters, body: expression};
      }

      default:
      this.parseError("Unexpected " + this.currentToken + " token; expected 'var', 'def' or end of input");
    }
  }

  parseParameterList() {
    this.expect('(');
    if (this.currentToken === ')') {
      // Move the cursor beyond the ')'
      this.tokenIndex++;
      return [];
    } else {
      let params = [ this.expect('identifier') ];
      while (this.currentToken !== ')') {
        if (this.currentToken !== ',') {
          this.parseError("Unexpected " + this.currentToken + " token; expected ',' or ')'");
        }
        this.tokenIndex++;
        params.push(this.expect('identifier'));
      }
      // Move the cursor beyond the ')'
      this.tokenIndex++;
      return params;
    }
  }

  parseExpression() {
    // Use the shunting yard algorithm to handle infix operator, but recursive descent for anything
    // else. This allows the simplest possible implementation of shunting yard while removing the
    // ugliest part of recursive descent parsing (which needs an extra function for each level of
    // precedence when parsing infix expressions, whereas shunting yard just needs a table of operators).
    const infixOperators = {
      '+': {kind: '+', precedence: 1, associativity: 'left'},
      '-': {kind: '-', precedence: 1, associativity: 'left'},
      '*': {kind: '*', precedence: 2, associativity: 'left'},
      '/': {kind: '/', precedence: 2, associativity: 'left'},
      '%': {kind: '%', precedence: 2, associativity: 'left'},
      '^': {kind: '^', precedence: 3, associativity: 'right'}
    };

    const operatorStack = [];
    const outputStack = [ this.parsePrefixExpression() ];

    function popOperator() {
      let op = operatorStack.pop();
      let rhs = outputStack.pop();
      let lhs = outputStack.pop();
      outputStack.push( { kind: op.kind, lhs: lhs, rhs: rhs } );
    }

    let op;
    // While the current token is an infix operator
    while ((op = infixOperators[this.currentToken])) {
      while (operatorStack.length > 0 && (operatorStack[operatorStack.length - 1].precedence > op.precedence ||
             operatorStack[operatorStack.length - 1].precedence == op.precedence && op.associativity == "left")) {
        popOperator();
      }
      operatorStack.push(op);
      this.tokenIndex++;
      outputStack.push(this.parsePrefixExpression());
    }
    while (operatorStack.length > 0) {
      popOperator();
    }
    if (outputStack.length !== 1) {
      throw "Internal error: outputStack did not end up with exactly one element: " + JSON.stringify(outputStack);
    }
    return outputStack[0];
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

function parseProgram(tokens) {
  return new RecursiveDescentParser(tokens).parseProgram();
}