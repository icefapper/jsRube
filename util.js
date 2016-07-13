(function(_exports) {
  var path = require('path'), has = Object.prototype.hasOwnProperty, fs = require('fs');
  
  _exports.assert = function (cond, message) {
//      console.log(message);
      if ( !cond )
        throw new Error(message);
  };

  _exports.each = function (name, dir, file  ) {
      var list = fs.readdirSync(name);
      var i = 0;
      while ( i < list.length ) {
         var l = path.join(name, list[i++]);
          if ( fs.statSync(l).isDirectory() )
                    dir(l);
                  
          else
                    file(l);
                      
      }
  };

  _exports.contents = function(name) {
     return fs.readFileSync ( name, 'utf-8' ) ; 

  };

  _exports.endsWith = function(str, e) {
      var i = str.lastIndexOf(e);
      return i >= 0 && str.length - i === e.length ? i : -1;
           
  };

  _exports.readJSON = function(filePath) {
      return JSON.parse( _exports.contents (filePath));
 
  };

  _exports.has = function( obj, name ) { return has.call(obj, name )  ; };

  _exports. types = { STRING: typeof "STRING",
                      BOOL: typeof false,
                      NUMBER: typeof 12
  };

  function dump(obj, level, name, withAfter ) {
     var space = "", i = 0;
     while ( i++ < level -1 ) space += "|  ";
     space += ( name || "" ) ;
     i=0 ;
     var after = "";
     if ( withAfter )   
          while ( i++ < level ) after += "|  ";

     if ( obj === null )
       return space + "null";
     
     if ( obj instanceof RegExp )
       return space + obj.toString();
    
     switch ( typeof obj ) {
       case _exports.types.BOOL:
          return space + ( obj ? "true" : "false");
    
       case _exports.types.STRING:
          return space + '\"' + obj + '\"'  ;
    
       case _exports.types.NUMBER:
          return space + obj;         
     }
    
     if ( obj === void 0 ) 
       return space + "<undefined>";

     var str = "";
    
     if ( obj.length >= 0 ) {
       i = 0;
       while ( i < obj.length ) {
          str += '\n' + dump(obj[i], level + 1, "[" + ( i + 1 ) + "]: ", i !== obj.length - 1 ) ;
          i++ ;
       }

       if ( i > 0 ) { if ( withAfter ) str += '\n' + after; }
       else {  str = "[]"; } 

       return space + str ;
     }      
         
     var item = null;
     i = 0;
     for ( item in obj ) {
       if ( !_exports.has( obj, item   ) ) continue;
       i++;
        
     }
 
     for ( item in obj ) { 
         if ( !_exports.has( obj, item ) ) continue;
         str += '\n' + dump(obj[item], level + 1, '\"' + item + '\": ', -- i );
     }
    
     if ( str === "" ) { str = "{}"; }
     else { if ( withAfter ) str += '\n' + after ; }

     return space + str ;
  }
    
  _exports.obj2str = function(obj) {
       return  dump( obj, 0, "" );

  }

  function compare(expected, actual, name ) {
    if ( typeof actual !== typeof expected ) 
      return { type: 'incompatible-types', actual: actual, expected: expected };
  
    if ( actual instanceof RegExp ) {
      if (!( expected instanceof RegExp ))
         return { type: 'incompatible-types', actual: actual, expected: expected };
  
      actual = actual.toString();
      expected = expected.toString();
    } 
  
    switch ( typeof actual ) {
       case _exports.types.STRING:
         if ( actual !== expected )
           return { type: 'not-equal', actual: actual + "(" + _exports.  toBytes(actual) + ")",
                                     expected: expected + "(" + _exports.toBytes(expected) + ")" };
       case _exports.types.BOOL:
       case _exports.types.NUMBER:
         if ( actual !== expected ) 
           return { type: 'not-equal', actual: actual, expected: expected + "(" + _exports.toBytes(expected) + ")" };
   
         return null;
    }
  
    if ( actual === null ) {
      if ( expected !== null )
        return { type: 'not-equal', actual: actual, expected: expected };
  
      return null;
    }

    return compareObj(expected, actual, name ) ;
   
    if ( actual.length >= 0 ) {
       if ( !(expected.length >= 0) )
         return { type: 'incompatible-types', actual: actual, expected: expected };
  
       return compareArray(expected,actual,name );
    }
 
  }
  _exports .compare = compare;          

  function compareArray(expected, actual, name ) {
    var comp = null, i=0;
    while ( i < expected.length ) {
       var l = null;
       if ( i < actual.length ) {
          l = compare(expected[i], actual[i], i );
       }
       else {
          l = { type: 'not-in-the-actual', val: expected[i] };
       }
  
       if ( l ) {
          if ( !comp ) comp = {};
          comp[i] = l;
       }
       i = i + 1;
    }
    
    if ( i < actual.length ) {
      if ( !comp ) comp = {};
      do {
        comp[i] = { type: 'not-in-the-expected', val: actual[i] };
        i = i + 1 ;
      } while (i < actual.length) ;
  
    }
  
    return comp;
  }
  _exports.compareArray = compareArray;  

  var adjust = require('./adjuster' ).convertEsprimaToJSRube;

  function compareObj(expected, actual, name ) {

    adjust(expected, actual, name);
    var comp = null, item;
    for ( item in expected ) {
        if ( !_exports.has(expected, item) ) continue;
        var l = null;
        if ( _exports.has(actual, item) )
           l = compare(expected[item], actual[item], item ) ;
        else
           l = { type: 'not-in-the-actual', val: expected[item]   }  ;
   
        if ( l ) {
           if ( !comp ) comp = {};
           comp[item] = l;
        }
    }
  
    for ( item in actual ) {
        if ( !_exports.has(actual, item) ||
              _exports.has(expected, item) ) continue ;

        var l = null;
        if ( !comp ) comp = {} ;
        comp[item] = { type: 'not-in-the-expected', val: actual[item] } ;
    }
  
    return comp;
  }
  _exports.compareObj = compareObj;  

  _exports.toBytes = function(str) {
      var bytes = "", i = 0;
      while ( i < str.length ) {
         if ( bytes.length )
              bytes += " ";
         
         bytes += str.charCodeAt(i++).toString(0x010 ) ;
      }
      return bytes;
  };

})(this);
