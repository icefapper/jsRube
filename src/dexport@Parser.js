this.parseExport = function() {
   if ( !this.canBeStatement && this['not.stmt']['export'].call(this) )
     return this.errorHandlerOutput ;

   this.canBeStatement = false;

   var startc = this.c0, startLoc = this.locBegin();
   this.next();

   var list = [], local = null, src = null ;
   var endI = 0;
   var ex = null;

   var semiLoc = null;
   switch ( this.lttype ) {
      case 'op':
         if (this.ltraw !== '*' &&
             this['export.all.not.*'](startc,startLoc) )
           return this.errorHandlerOutput;
 
         this.next();
         if ( !this.expectID_soft('from') &&
               this['export.all.no.from'](startc, startLoc) )
           return this.errorHandlerOutput;

         if (!(this.lttype === 'Literal' &&
              typeof this.ltval === STRING_TYPE ) && 
              this['export.all.source.not.str'](startc,startLoc) )
           return this.errorHandlerOutput;

         src = this.numstr();
         
         endI = this.semiI();
         semiLoc = this.semiLoc_soft();
         if ( !semiLoc && !this.hasNewlineBeforeLookAhead &&
              this['no.semi']( 'export.all',
              { s:startc, l:startLoc, src: src, endI: endI } ) )
           return this.errorHandlerOutput;

         this.foundStatement = !false;
         
         return  { type: 'ExportAllDeclaration',
                    start: startc,
                    loc: { start: startLoc, end: semiLoc || src.loc.end },
                     end: endI || src.end,
                    source: src };

       case '{':
         this.next();
         var firstReserved = null;

         while ( this.lttype === 'Identifier' ) {
            local = this.id();
            if ( !firstReserved ) {
              this.throwReserved = false;
              this.validateID(local.name);
              if ( this.throwReserved )
                firstReserved = local;
              else
                this.throwReserved = !false;
            }
            ex = local;
            if ( this.lttype === 'Identifier' ) {
              if ( this.ltval !== 'as' && 
                   this['export.specifier.not.as'](
                     { s: startc, l: startLoc, list: list, local, ex: ex }) )
                return this.errorHandlerOutput ;

              this.next();
              if ( this.lttype !== 'Identifier' ) { 
                 if (  this['export.specifier.after.as.id'](
                       { s:startc, l:startLoc, list:list, ex:ex }) )
                return this.errorHandlerOutput;
              }
              else
                 ex = this.id();
            }
            list.push({ type: 'ExportSpecifier',
                       start: local.start,
                       loc: { start: local.loc.start, end: ex.loc.end }, 
                        end: ex.end, exported: ex,
                       local: local }) ;

            if ( this.lttype === ',' )
              this.next();
            else
              break;
         }

         endI = this.c;
         var li = this.li, col = this.col;
   
         if ( !this.expectType_soft('}') && 
               this['export.named.list.not.finished'](
                  {s: startc,l: loc, list:list}) )
           return this.errorHandlerOutput  ;

         if ( this.lttype === 'Identifier' ) {
           if ( this.ltval !== 'from' &&
                this['export.named.not.id.from'](
                    {s: startc, l:startLoc, list:list, end: [endI, li, col]}
              ) )
              return this.errorHandlerOutput;

           else this.next();
           if ( !( this.lttype === 'Literal' &&
                  typeof this.ltval ===  STRING_TYPE) &&
                this['export.named.source.not.str'](
                   { s:startc,l:startLoc,list:list,end:[endI,li,col] }) )
             return this.errorHandlerOutput ;

           else {
              src = this.numstr();
              endI = src.end;
           }
         }
         else
            if (firstReserved && this['export.named.has.reserved'](
               { s:startc, l:startLoc, list:list, end:[endI,li,col], resv: firstReserved}) )
              return this.errorHandlerOutput ;

         endI = this.semiI() || endI;
         semiLoc = this.semiLoc_soft();
         if ( !semiLoc && !this.newLineBeforeLookAhead &&
              this['no.semi']('export.named',
                  { s:startc, l:startLoc, list: list, end: [endI,li,col], src: src } ))
           return this.errorHandlerOutput; 

         this.foundStatement = !false;
         return { type: 'ExportNamedDeclaration',
                 start: startc,
                 loc: { start: startLoc, end: semiLoc || ( src && src.loc.end ) ||
                                              { line: li, column: col } },
                  end: endI, declaration: null,
                   specifiers: list,
                  source: src };

   }

   var context = CONTEXT_NONE;

   if ( this.lttype === 'Identifier' && 
        this.ltval === 'default' ) { context = CONTEXT_DEFAULT; this.next(); }
  
   if ( this.lttype === 'Identifier' ) {
       switch ( this.ltval ) {
          case 'let':
          case 'const':
             if (context === CONTEXT_DEFAULT && 
                 this['export.default.const.let'](startc,startLoc) )
               return this.errorHandlerOutput;
                 
             this.canBeStatement = !false;
             ex = this.parseVariableDeclaration(CONTEXT_NONE);
             break;
               
          case 'class':
             this.canBeStatement = !false;
             ex = this.parseClass(context);
             break;
  
          case 'var':
             this.canBeStatement = !false;
             ex = this.parseVariableDeclaration(CONTEXT_NONE ) ;
             break ;

          case 'function':
             this.canBeStatement = !false;
             ex = this.parseFunc( context, WHOLE_FUNCTION, ANY_ARG_LEN );
             break ;
        }
   }

   if ( context !== CONTEXT_DEFAULT ) {

     if (!ex && this['export.named.no.exports'](startc, startLoc) )
       return this.errorHandlerOutput ;
     
     this.foundStatement = !false;
     return { type: 'ExportNamedDeclaration',
            start: startc,
            loc: { start: startLoc, end: ex.loc.end },
             end: ex.end , declaration: ex,
              specifiers: list ,
             source: null };
   }

   var endLoc = null;
   if ( ex === null ) {
        ex = this.parseNonSeqExpr(PREC_WITH_NO_OP, CONTEXT_NONE );
        endI = this.semiI();
        endLoc = this.semiLoc_soft(); // TODO: semiLoc rather than endLoc
        if ( !endLoc && !this.newLineBeforeLookAhead &&
             this['no.semi']( 'export.named', 
                 { s: startc, l:startLoc, e: ex } ) )
          return this.errorHandlerOutput;
   }

   this.foundStatement = !false;
   return { type: 'ExportDefaultDeclaration',    
           start: startc,
           loc: { start: startLoc, end: endLoc || ex.loc.end },
            end: endI || ex.end, declaration: core( ex ) };
}; 
