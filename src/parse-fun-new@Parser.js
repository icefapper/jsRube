this.parseFunc = function(context, st) {
  var prevLabels = this.labels,
      prevDeclMode = this.declMode; 

  var isStmt = false,
      startc = this.c0,
      startLoc = this.locBegin();

  if (this.canBeStatement) {
    isStmt = true;
    this.canBeStatement = false;
  }

  var isGen = false,
      isMeth = st & (ST_CLSMEM|ST_OBJMEM);

  var fnName = null,
      argLen = !(st & ST_ACCESSOR) ? ARGLEN_ANY :
        (st & ST_SETTER) ? ARGLEN_SET : ARGLEN_GET;

  // it is not a meth -- so the next token is `function`
  if (!isMeth) {
    this.kw(); this.next();
    st |= isStmt ? ST_DECL : ST_EXPR;
    if (this.lttype === 'op' && this.ltraw === '*') {
      if (this.v <= 5)
        this.err('ver.gen');
      if (isStmt) {
        if (st & ST_ASYNC)
          this.err('async.gen.not.yet.supported');
        if (this.unsatisfiedlLabel)
          this.err('gen.label.notAllowed');
        if (this.scope.isBody())
          this.err('gen.decl.not.allowed');
      }
      isGen = true;
      st |= ST_GEN;
      this.next();
    }
    else {
      if (isStmt) {
        var isAsync = st & ST_ASYNC;
        if (this.scope.isBody()) {
          if (isAsync)
            this.err('async.decl.not.allowed');
          if (!this.scope.insideIf())
            this.err('async.decl.not.allowed');
          if (this.unsatisfiedLabel)
            this.fixupLabels(false);
        }

        if (this.unsatisfiedLabel)
          this.err('func.label.not.allowed');
      }
    }

    if (isStmt) {
      if (this.lttype === 'Identifier') {
        fnName = this.parsePattern();
      } else if (!(context & CTX_DEFAULT)) {
        this.err('func.decl.has.no.name');
      }
      // get the name and enter the scope
      this.enterScope(this.scope.genScope(st));
    }
    else {
      // enter the scope and get the name
      this.enterScope(this.scope.genScope(st));
      if (this.lttype === 'Identifier') {
        fnName = this.validateID(null);
      }
    }
  }
  else
    this.enterScope(this.scope.fnScope(st));

  this.scope.enterFuncArgs();
  var argList = this.parseArgs(argLen);
  this.scope.exitFuncArgs();

  this.labels = {};

  var body = this.parseFuncBody(context & CTX_FOR);

  var n = {
    type: isStmt ? 'FunctionDeclaration' : 'FunctionExpression',
    id: fnName,
    start: startc,
    end: body.end,
    generator: (st & ST_GEN) !== 0,
    body: body,
    loc: { start: startLoc, end: body.loc.end },
    expression: body.type !== 'BlockStatement', params: argList,
    async: (st & ST_ASYNC) !== 0
  };

  if (isStmt)
    this.foundStatement = true;

  this.labels = prevLabels;
  this.declMode = prevDeclMode;

  return n;
};
