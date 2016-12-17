
this.parenParamError = function() {
  return this.err('err.arrow.arg', this.firstParen);
};

this.restError = function(r) {
  return this.err('err.arrow.arg', r);
};

this.containsYieldOrSuperError = function() {
  return this.err('err.arrow.arg', this.firstElemWithYS );
};
 
this.notBindableError = function(l) {
  return this.err('err.arrow.arg', l) ;
};

this.notParamList = function(l) {
  return this.err('err.arrow.arg', l);
};

this .asArrowFuncArgList = function(head) {
   if ( head === null )
     return;

   if ( head.type === 'SequenceExpression' ) {
         if ( head === this.firstParen && this.parenParamError() )
           return this.errorHandlerOutput ;

         var i = 0, list = head.expressions;
         while ( i < list.length ) {
           this.asArrowFuncArg(list[i]);
           i++;
         }
   }
   else
      this.asArrowFuncArg(head);
};

this. asArrowFuncArg = function(arg) {
    var i = 0, list = null;

    if (arg.type !== 'Identifier')
      this.firstNonSimpArg = arg;

    if (arg === this.po)
      this.err('invalid.arg');

    switch  ( arg.type ) {
        case 'Identifier':
           if (this.tight)
             this.assert(!arguments_or_eval(arg.name));

           return this.declare(arg);

        case 'ArrayExpression':

           list = arg.elements;
           while ( i < list.length ) {
              if ( list[i] ) {
                 this.asArrowFuncArg(list[i]);
              }
              i++;
           }
           if ( i !== list.length && this.restError() )
             return this.errorHandlerOutput;

           arg.type = 'ArrayPattern';
           return;

        case 'AssignmentExpression':
           if (arg === this.firstParen && this.parenParamError() )
             return this.errorHandlerOutput;

           if (arg.operator !== '=' && this.notBindableError(arg) )
             return this.errorHandlerOutput ;

           this.asArrowFuncArg(arg.left);
           if ( arg === this.firstElemWithYS && this.containsYieldOrSuperError() )
             return this.errorHandlerOutput;

           arg.type = 'AssignmentPattern';
           delete arg.operator ;
           return;

        case 'ObjectExpression':
           if (arg === this.firstParen && this.parenParamError() )
             return this.errorHandlerOutput ;
           list = arg.properties;
           while ( i < list.length )
              this.asArrowFuncArg(list[i++].value );

           arg.type = 'ObjectPattern';
           return;

        case 'AssignmentPattern':
           if (arg === this.firstParen && this.parenParamError() )
             return this.errorHandlerOutput ;

           if ( arg === this.firstElemWithYS && this.containsYieldOrSuper() )
             return this.errorHandlerOutput;

           this.asArrowFuncArg(arg.left) ;
           return;

        case 'ArrayPattern' :
           list = arg.elements;
           while ( i < list.length )
             this.asArrowFuncArg(list[i++] ) ;

           return;

        case 'SpreadElement':
            this.assert(arg !== this.firstNonTailRest);
            if (arg.argument.type !== 'Identifier')
              this.err('binding.rest.arg.not.id', {tn:arg});
            this.asArrowFuncArg(arg.argument);
            arg.type = 'RestElement';
            return;

        case 'RestElement':
            if (arg.argument.type !== 'Identifier')
              this.err('binding.rest.arg.not.id',{tn:arg});
            this.asArrowFuncArg(arg.argument);
            return;

        case 'ObjectPattern':
            list = arg.properties;
            while ( i < list.length )
               this.asArrowFuncArgList ( list[i++].value  );

            return;

        default:
           if ( this.notBindableError(arg) )
             return this.errorHandlerOutput;
    }
};


this . parseArrowFunctionExpression = function(arg,context)   {

  var tight = this.tight;

  this.enterFuncScope(false);
  this.declMode = DECL_MODE_FUNCTION_PARAMS;
  this.enterComplex();

  switch ( arg.type ) {
    case 'Identifier':
       this.asArrowFuncArg(arg, 0)  ;
       break ;

    case PAREN:
       this.asArrowFuncArgList(core(arg));
       break ;

    default:
       if ( this.notParamList(arg) )
         return this.errorHandlerOutput ;
  }

  this.currentExprIsParams();

  if ( this.newLineBeforeLookAhead &&
       this.err('new.line.before.arrow'))
     return this.errorHandlerOutput;

  this.next();

  var scopeFlags = this.scopeFlags;
  this.scopeFlags &= INHERITED_SCOPE_FLAGS;

  var isExpr = true, nbody = null;

  if ( this.lttype === '{' ) {
       var prevLabels = this.labels, prevYS = this.firstYS;
       this.firstYS = null;
       this.labels = {};
       isExpr = false;
       this.scopeFlags |= SCOPE_FLAG_FN;
       nbody = this.parseFuncBody(CTX_NONE);
       this.labels = prevLabels;
       this.firstYS = prevYS;
  }
  else
    nbody = this. parseNonSeqExpr(PREC_WITH_NO_OP, context|CTX_PAT) ;

  this.exitScope();
  var params = core(arg);
  this.tight = tight;

  this.scopeFlags = scopeFlags;

  return { type: 'ArrowFunctionExpression',
           params: params ?  params.type === 'SequenceExpression' ? params.expressions : [params] : [] ,
           start: arg.start,
           end: nbody.end,
           loc: { start: arg.loc.start, end: nbody.loc.end },
           generator: false,
           expression: isExpr,
           body: core(nbody),
           id : null
  }; 
};


