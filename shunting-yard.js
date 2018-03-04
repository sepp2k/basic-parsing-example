function shuntingYard(tokens) {
  // We'll call this helper function to throw a parse error when we encounter
  // ill-formed input.
  function parseError(message) {
    let err = new Error(message);
    err.name = "ParseError";
    throw err;
  }

  const infixOperators = {
    '+': {kind: '+', precedence: 1, associativity: 'left'},
    '-': {kind: '-', precedence: 1, associativity: 'left'},
    '*': {kind: '*', precedence: 2, associativity: 'left'},
    '/': {kind: '/', precedence: 2, associativity: 'left'},
    '%': {kind: '%', precedence: 2, associativity: 'left'},
    '^': {kind: '^', precedence: 3, associativity: 'right'}
  };
  const operatorStack = [];

  // Performance note: Unlike other languages that have `shift` and `unshift`
  // methods, JavaScript's `shift` and `unshift` are usually implemented as O(n)
  // operations rather than O(1), so using an array as a queue is inefficient.
  // However for the sake of simplicity, we'll still use them rather than a
  // third part library or rolling our own.
  const outputQueue = [];

  // We'll need this stack to support function calls without knowing the arity
  // ahead of time.
  // The top element of the stack will count how many arguments there have been
  // so far in the function call being parsed. When encountering nested function
  // calls, a new element will be pushed on the stack and, once the corresponding
  // `)` is encountered, popped again to continue with the previous element.
  const arityStack = [];

  function popOperator() {
    let op = operatorStack.pop();
    switch (op.kind) {
      case '+': case '-': case '*': case '/': case '%': case '^': {
        if (outputQueue.length < 2) {
          parseError("Operator at end of file");
        }

        let rhs = outputQueue.pop();
        let lhs = outputQueue.pop();
        outputQueue.push( { kind: op.kind, lhs: lhs, rhs: rhs } );
        break;
      }

      case 'unary -': {
        // The unary - is translated as a binary - with 0 as the left operand.
        let rhs = outputQueue.pop();
        let lhs = { kind: 'numberLiteral', value: 0 };
        outputQueue.push( { kind: '-', lhs: lhs, rhs: rhs } );
        break;
      }

      case '(': case 'function call': {
        parseError("Unclosed opening parenthesis");
      }
    }
  }

  // Since we want to support prefix operators, we keep track of whether we're
  // currently at a point where we expect prefix operators (or numbers, variables
  // or function calls) or infix operators.
  let expectingPrefix = true;
  for (let i = 0; i < tokens.length; i++) {
    if (expectingPrefix) {
      switch (tokens[i].kind) {
        case 'number':
        outputQueue.push({kind: 'numberLiteral', value: tokens[i].value});
        expectingPrefix = false;
        break;

        case '+':
        // Unary + is a no-op, so we simply do nothing and continue with the
        // next token. Note that we can only do this because the only type we
        // support are numbers. If we supported types other than numbers, we'd
        // have to keep the unary + around long enough for the type checker to
        // produce an error if we try to use + on a string.
        break;

        case '-':
        // Unary operators have higher precedence than all other operators
        // because `-x ? y` should be parsed as `(-x) ? y`, not `-(x ? y)`,
        // regardless of which infix operator we substitute for `?`.
        operatorStack.push( { kind: 'unary -', associativity: 'n/a', precedence: Infinity} );
        break;

        case '(':
        operatorStack.push( { kind: '(', associativity: 'n/a', precedence: -Infinity});
        break;

        case 'identifier':
        if (tokens.length > i + 1 && tokens[i + 1].kind == '(') {
          // We support functions of arity zero, but we still push 1 as the initial arity.
          // This is okay because we only check the arity when we encounter ) in an infix
          // position. For 0-arity function calls we'll encounter ) in a prefix position
          // and thus know that the arity is 0.
          arityStack.push(1);
          // Like with plain opening parentheses, we give function calls the lowest possible
          // precedence for the same reason.
          operatorStack.push({
            kind: 'function call',
            functionName: tokens[i].value,
            precedence: -Infinity,
            associativity: 'n/a'
          });
          // The upcoming ( is part of this function call, so we shouldn't handle
          // it again at the next iteration
          i++;
        } else {
          outputQueue.push({kind: 'variable', name: tokens[i].value});
          expectingPrefix = false;
        }
        break;

        case ')':
        // If we see ')' while expecting the beginning of an expression, we're either directly
        // behind the opening '(' of a function call or it's a syntax error (note that `f()` is
        // valid syntax, but `()` by itself is not).
        if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].kind == "function call") {
          let f = operatorStack.pop();
          arityStack.pop();
          outputQueue.push( { kind: 'function call', functionName: f.functionName, arguments: [] } );
          expectingPrefix = false;
        } else {
          parseError("Unexpected ) token; expected the beginning of an expression instead");
        }
        break;

        default:
        parseError("Unexpected " + tokens[i].kind + " token; expected the beginning of an expression instead");
      }
    } else {
      switch (tokens[i].kind) {
        case '+': case '-': case '*': case '/': case '%': case '^':
        let op = infixOperators[tokens[i].kind];
        while (operatorStack.length > 0 && (operatorStack[operatorStack.length - 1].precedence > op.precedence ||
               operatorStack[operatorStack.length - 1].precedence == op.precedence && op.associativity == "left")) {
          popOperator();
        }
        operatorStack.push(op);
        expectingPrefix = true;
        break;

        case ',':
        while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].kind != "function call") {
          popOperator();
        }
        if (arityStack.length > 0) {
          arityStack[arityStack.length - 1]++;
        } else {
          parseError("',' outside of a function call");
        }
        expectingPrefix = true;
        break;

        case ')':
        while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].kind != "function call" &&
               operatorStack[operatorStack.length - 1].kind != "(") {
          popOperator();
        }
        if (operatorStack.length > 0) {
          let op = operatorStack.pop();
          if (op.kind == "function call") {
            let arity = arityStack.pop();
            let args = [];
            for (let j = 0; j < arity; j++) {
              args.push(outputQueue.pop());
            }
            outputQueue.push( {
              kind: 'function call',
              functionName: op.functionName,
              arguments: args.reverse()
            } );
          }
        } else {
          parseError("Unmatched closing parenthesis");
        }
        break;

        default:
        parseError("Unexpected " + tokens[i].value + " token; expected ',', ')' or infix operator");
      }
    }
  }
  while (operatorStack.length > 0) {
    popOperator();
  }
  if (outputQueue.length == 0) {
    parseError("Empty program");
  } else if (outputQueue.length == 1) {
    return outputQueue[0];
  } else {
    parseError("Multiple consecutive expressions without infix operator in between");
  }
}