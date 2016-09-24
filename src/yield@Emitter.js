function synth_id_node(name) {
   return { type: 'Identifier', synth: !false, name: name };
}

function synth_expr_node(str) {
   return { type: 'SynthesizedExpr', contents: str, y: 0 };
}

function synth_expr_set_node(arr, isStatement ) {
   if (isStatement)
     return { type: 'SynthesizedExprSet', expressions: arr, y: 0 };

   return { type: 'SequenceExpression', expressions: arr, y: 0 };
}

function assig_node(left, right) {
   if (left.type === 'Identifier' && right.type === 'Identifier')
     if (left.synth && left.name === right.name )
       return left;
  
   return { type: 'AssignmentExpression',  operator: '=', right: right, left: left, y: 0 };
}

function cond_node(e, c, a) {
   return { type: 'ConditionalExpression', 
            test: e,
            consequent: c,
            alternate: a,
            y: 0 };
}

function id_is_synth(n) {
   this.assert(id.type === 'Identifier');
   return n.name.charCodeAt() === CHAR_MODULO;
}

var has = {}.hasOwnProperty;
var transformerList = {};

function isComplexAssignment(n) { 
   if (n.type === 'ExpressionStatement')
     n = n.expression;

   if ( n.type === 'AssignmentExpression' ) {
     if ( n.left.type === 'Identifier') return false;
     return n.left.type !== 'MemberExpression' ?
               !false : y(n.left) !== 0;
   }

   return false;
}

this.transformYield = function(n, b, isVal) {
  var yc = y(n);
  if ( (yc || isComplexAssignment(n)) && has.call(transformerList, n.type) ) {
    var transformedNode = transformerList[n.type].call(this, n, b, isVal);
    if ( transformedNode === n && yc )
      n.y = 0;
    return transformedNode;
  }
  
  return n;
};

function synth_not_node(n) {
  return { type: 'UnaryExpression', operator: '!', argument: n, y: 0 };

}

function synth_seq_or_block(b, yc, totalY) {
   if (totalY === 0) {
     ASSERT.call(this, yc === 0);
     return { type: 'SequenceExpression', expressions: b, y: yc };
   }
   return { type: 'BlockStatement', body: b, y: yc};
}

var VOID0 = synth_expr_node('(void 0)');
function synth_if_node(cond, body, alternate, yBody, yElse) {
  yBody = yBody || 0;
  yElse = yElse || 0;

  var yc = yBody + yElse;
  if (body.length > 1 || body[0].type === 'IfStatement' )
    body = synth_seq_or_block(body, yBody, yc);
  else
    body = body[0];

  if(alternate)
    alternate = alternate.length > 1 ? synth_seq_or_block(body, yElse, yc) : alternate[0];
  else
    alternate = null;

  return { type: yc > 0 ? 'IfStatement' : 'ConditionalExpression',
           alternate: alternate === null && yc === 0 ? VOID0 : alternate ,
           consequent: body, 
           test: cond, y: yBody + yElse };
}

function append_assig(b, left, right) {
  var assig = null;
  if ( right.type !== 'Identifier' || left !== right.name)
    assig = assig_node(synth_id_node(left), right);

  if ( assig ) b.push(assig);
}
   
function append_non_synth(b, nexpr) {
  if (nexpr.type !== 'Identifier' || !nexpr.synth )
    b. push(nexpr);

}

transformerList['BinaryExpression'] = function(n, b, vMode) {
   var leftTemp = "";

   n.left = this.transformYield(n.left, b, !false);

   if ( y(n.right) ) {
     leftTemp = this.scope.allocateTemp();

     var id = synth_id_node(leftTemp);
     var assig = assig_node( id, n.left);
     if (assig.type !== 'Identifier' || !assig.synth)
        b.push( assig );
     n.left = id;
   }

   n.right = this.transformYield(n.right, b, !false );

   if ( leftTemp !== "" )
     this.scope.releaseTemp(leftTemp);

   return n;
};
 
transformerList['LogicalExpression'] = function(n, b, vMode) {
   var temp = "";
   n.left = this.transformYield (n.left, b, !false);
   
   var id = null;

   if (y(n.right)) {
     if (vMode) {
       temp = this.scope.allocateTemp();
       if ( n.left.type !== 'Identifier' || n.left.name !== temp)
         n.left = assig_node(synth_id_node(temp), n.left);

       this.scope.releaseTemp(temp);
     }

     if (n.operator === '||')
       n.left = synth_not_node(n.left);

     var ifBody = [], yBody = y(n.right);
     n.right = this.transformYield (n.right, ifBody, vMode);
     if (vMode) {
       temp = this.scope.allocateTemp();
       if ( n.right.type !== 'Identifier' || n.right.name !== temp )
         ifBody.push( assig_node(synth_id_node(temp), n.right));

       this.scope.releaseTemp(temp);
     }
     else if (n.right.type !== 'Identifier' || !n.right.synth )
       ifBody.push(n.right);

     b. push( synth_if_node(n.left, ifBody, null, yBody ) );       
     return vMode ? synth_id_node(temp) : NOEXPRESSION ;
   }

   n.right = this.transformYield (n.right, b, vMode);
   return n;
};          
     
transformerList['YieldExpression'] = function(n, b, vMode) {
   if (n.argument)
     n.argument = this.transformYield(n.argument,b, IS_VAL);

   b. push(n);
   return synth_id_node('sent');
};
          
transformerList['UpdateExpression'] = function(n, b, vMode) {        
   n.argument = this.transformYield(n.argument, b, IS_REF);
   return n;
};

transformerList['MemberExpression'] = function(n, b, vMode) {
   n.object = this.transformYield(n.object, b, IS_VAL);
   var objTemp = "";
   if (y(n.property)) {
     objTemp = this.scope.allocateTemp();
     append_assig(b, objTemp, n.object);
     n.object = synth_id_node(objTemp);
   }
   if (n.computed)
     n. property = this.transformYield(n.property, b, vMode);

   if (objTemp !== "") 
     this.scope.releaseTemp(objTemp);

   return n;
} 

this.transformCallArgs = function(args, b, yc) {
  var tempList = [], e = 0;
  while (e < args.length) {
     yc -= y(args[e]);
     args[e] = this.transformYield(args[e], b, IS_VAL);
     if (yc > 0) {
       var temp = this.scope.allocateTemp();
       append_assig(b, temp, args[e]);
       args[e] = synth_id_node(temp);
       tempList.push(temp);
     }
     else
       break;

     e++ ;
  }

  e = 0;
  while (e < tempList.length)
    this.scope.releaseTemp(tempList[e++]);

};      

function synth_mem_node(obj, prop, c) {
  return { type: 'MemberExpression',
           computed: c,
           object: obj,
           property: (prop),  
           y: 0 };

}

function synth_call_node(callee, argList) {
   return { type: 'CallExpression', arguments: argList, callee: callee, synth: !false, y: 0 };

}

var FUNC_PROTO_CALL = synth_id_node('call');

function call_call(thisObj, callee, argList) {
   return synth_call_node(
      synth_mem_node(synth_id_node(callee), FUNC_PROTO_CALL, false),
      [synth_id_node(thisObj)].concat(argList)
   );
}
   
transformerList['CallExpression'] = function(n, b, vMode) {
   vMode = IS_VAL;
   var yCall = y(n);
   var yArgs = yCall - y(n.callee) ;

   if (!yCall) return n;

   var callee = n.callee;
   if (callee.type !== 'MemberExpression') {
     if (y(callee)) 
       n.callee = this.transformYield(n.callee, b, IS_VAL);

     if (yArgs) {
       var temp = this.scope.allocateTemp();
       append_assig(b, temp, n.callee);
       n.callee = synth_id_node(temp);
       this.transformCallArgs(n.arguments, b, yArgs);
       this.scope.releaseTemp(temp);
     }
     return n;
   }

   var yObj = y(callee.object);
   if (yObj)
     callee.object = this.transformYield(callee.object, b, IS_VAL);
   
   var yProp = y(callee.property);
   var objTemp = "";

   if (yProp || yArgs) {
     objTemp = this.scope.allocateTemp();
     append_assig(b, objTemp, callee.object);
     callee.object = synth_id_node(objTemp);
   }

   callee.property = this.transformYield(callee.property, b, vMode);

   var calleeTemp = "";
   if (yArgs) {
     calleeTemp = this.scope.allocateTemp();
     append_assig(b, calleeTemp, callee);
     this.transformCallArgs(n.arguments, b, yArgs);
     this.scope.releaseTemp(objTemp);
     this.scope.releaseTemp(calleeTemp);

     return call_call(objTemp, calleeTemp, n.arguments);
   }

   return n;
};           

var transformAssig = null;
transformAssig = {};

this.transformAssignment = transformerList['AssignmentExpression'] = function(n, b, vMode) {
   var lefttype = n.left.type;
   var temp = this.scope.allocateTemp();
   this.evaluateAssignee(n.left, b, y(n));
   this.scope.releaseTemp(temp);

   n.right = this.transformYield(n.right, b, IS_VAL);
   var assigValue = transformAssig[lefttype].call(this, n, b);

   switch (lefttype) {
     case 'Identifier': 
     case 'MemberExpression':
        assigValue.y = 0; 
        return assigValue;

     default:
        return vMode ? assigValue : NOEXPRESSION;
   }
};

this.evaluateAssignee = function( assignee, b, yc ) {
    if (assignee.type === 'Property' || assignee.type === 'AssignmentProperty' ) {
      if (assignee.computed ) {
        assignee.key = this.transformYield(assignee.key, b, IS_VAL);
        var t = this.scope.allocateTemp();
        append_assig(b, t, assignee.key);
        assignee.key = synth_id_node(t);
      }

      assignee = assignee.value;
    }
            
    if (assignee.type === 'AssignmentPattern' )
      assignee = assignee.left;

    var e = 0;

    switch (assignee.type) {
       case 'Identifier':
          break;

       case 'ArrayPattern':
          while (e < assignee.elements.length) {
             yc = this.evaluateAssignee(assignee.elements[e], b, yc);
             e++ ;
          }
          break;

       case 'ObjectPattern':
          while (e < assignee.properties.length) {
             yc = this.evaluateAssignee(assignee.properties[e], b, yc);
             e++ ;
          }
          break ;

       case 'MemberExpression':
          var objTemp = "";
          var propTemp = "";

          assignee.object = this.transformYield(assignee.object, b, IS_VAL);
          objTemp = this.scope.allocateTemp();

          append_assig( b, objTemp, assignee.object);
          assignee.object = synth_id_node(objTemp);
          if (assignee.computed) {
            assignee.property = this.transformYield(assignee.property, b, IS_VAL);
            propTemp = this.scope.allocateTemp();

            append_assig(b, propTemp, assignee.property );
            assignee.property = synth_id_node(propTemp);
          }
 
          break ;
    }

    return yc ;
}

var GET = synth_id_node('get');

function synth_literal_node(value) {
   return { type: 'Literal', value: value };
}

var UNORNULL = synth_id_node('unORnull');

this.is_sent_var = function(id) { return id.name === 'sent'; };

this.release_if_synth = function(nexpr) {
  if ( nexpr.type === 'Identifier' && !this.is_sent_var(nexpr) && nexpr.synth )
    this.scope.releaseTemp(nexpr.name);
};

this.assigElement = function(left, right, b) {
   var defaultVal = null;

   if (left.type === 'AssignmentPattern' ) {
     var n = left;
     defaultVal = n.right;
     left = n.left;
     var defTemp = this.scope.allocateTemp();
     var cond =  assig_node(synth_id_node( defTemp), right);
     cond = synth_call_node(UNORNULL, [cond]);
     this.scope.releaseTemp(defTemp);
     var ifBody = [], yBody = y( defaultVal) ;

     defaultVal = this.transformYield(defaultVal, ifBody, IS_VAL);
     defTemp = this.scope.allocateTemp(); // lolhehe
     append_assig(ifBody, defTemp, defaultVal);
     this.scope.releaseTemp(defTemp);
     right = synth_id_node(defTemp);
     b. push( synth_if_node(cond, ifBody, null, yBody ) ); 
   }
   
   return transformAssig[left.type].call(this, assig_node(left, right), b); // TODO: eliminate need for assig_node
};

transformAssig['Identifier'] = function(n, b) {
  return n;
};

var VAL = synth_id_node('val');
var ARR_ITER = synth_id_node('arrIter');
transformAssig['ArrayPattern'] = function(n, b) {

  var right = n.right,
      e = 0,
      list = n.left.elements,
      temp = this.scope.allocateTemp();

  right = synth_call_node(ARR_ITER, [n.right]);
  append_assig(b, temp, right);
  var next = synth_call_node(
              synth_mem_node(synth_id_node(temp),
              GET), [] );
  while (e < list.length) {
     var assig = this.assigElement(list[e], next, b);
     if (assig.type === 'AssignmentExpression') b. push(assig);
     e++ ;
  }

  this.scope.releaseTemp(temp);

  return synth_mem_node( synth_id_node(temp), VAL );
};

var OBJ_ITER = synth_id_node('objIter');
transformAssig['ObjectPattern'] = function(n, b) {
   var temp = this.scope.allocateTemp(), e = 0, list = n.left.properties; 

   var right = synth_call_node(OBJ_ITER, [n.right]);
   append_assig(b, temp, right);
   
   while (e < list.length) {
      var prop = list[e];
      var k = prop.key;
      if (k.type === 'Identifier') {
         if (prop.computed) {
           if (k.synth && !this.is_sent_var(k)) this.scope.releaseTemp( k.name );
         }
         else
           k = synth_literal_node(k.name);
      }
      var next = synth_call_node(
                   synth_mem_node(synth_id_node(temp), GET),
                   [k]
                 );
      var assig = this.assigElement(list[e].value, next, b);

      if (assig.type === 'AssignmentExpression') b. push(assig);
      e++ ;
   } 

   this.scope.releaseTemp(temp);
   
   return synth_mem_node( synth_id_node(temp), VAL ) ;
};
 
transformAssig['MemberExpression'] = function(n, b) {
   var left = n.left;
   if (left.object.type === 'Identifier' && left.object.synth)
     this.release_if_synth(left.object);

   if (left.property.type === 'Identifier' && left. property.synth)
     this.release_if_synth(left.property);

   return n;
};

transformerList['ConditionalExpression'] = function( n, b, vMode ) {
  var yAll = y(n), yTest = y(n.test) ;
  n.test = this.transformYield(n.test, b, IS_VAL);
  yAll -= yTest;
  if (!yAll)
    return n;
  
  var ifB = [], yBody = y(n.consequent) ;

  n.consequent = this.transformYield(n.consequent, ifB, vMode);
  var temp = "";
  if (vMode) {
    temp = this.scope.allocateTemp();
    append_assig(ifB, temp, n.consequent);
    this.scope.releaseTemp(temp);
  }
  else
    append_non_synth(ifB, n.consequent);

  var elseB = [], yElse = y(n.alternate) ;

  n.alternate = this.transformYield(n.alternate, elseB, vMode);
  if (vMode) {
    temp = this.scope.allocateTemp();
    append_assig(elseB, temp, n.alternate);
    this.scope.releaseTemp(temp);
  }
  else
    append_non_synth(elseB, n.alternate);

  b. push(synth_if_node(n.test, ifB, elseB, yBody, yElse ));
  return vMode ? synth_id_node(temp) : NOEXPRESSION;
};
  
transformerList['ArrayExpression'] = function(n, b, vMode) {
   var list = n.elements, e = 0, yc = y(n), elem = null;

   var temp = this.scope.allocateTemp();
   append_assig(b, temp, synth_expr_node('[]'));

   var arrayID = synth_id_node(temp);
   while (e < list.length) {
      elem = this.transformYield(list[e], b, IS_VAL);
      b. push( assig_node( synth_expr_node(temp+'['+e+']'), elem) );
      e++ ;
   }

   this.scope.releaseTemp(temp);
   return vMode ? arrayID : NOEXPRESSION; 
};

transformerList['ObjectExpression'] = function(n, b, vMode) {
   var e = 0,
       list = n.properties,
       yc = y(n),
       temp = this.scope.allocateTemp(),
       currentY = 0;

   var nameTemp = "", valTemp = "";

   var objID = synth_id_node(temp);

   while (e < list.length) {
      var elem = list[e], val = elem.value, name = elem.key;
      name = this.transformYield(name, b, IS_VAL);
      if (y(val)) {
          nameTemp = this.scope.allocateTemp();
          append_assig(b, nameTemp, name);
          name = synth_id_node(nameTemp);
      }     
      val = this.transformYield(val, b, IS_VAL);
      b. push(
         assig_node(
           synth_mem_node(objID, name, !false),
           val 
         ) 
      );

      if (valTemp !== "" ) this.scope.releaseTemp(valTemp);
      if (nameTemp !== "") this.scope.releaseTemp(nameTemp);

      e++ ;
   }
 
   this.scope.releaseTemp(temp);

   return vMode ? objID : NOEXPRESSION;
};

transformerList['SequenceExpression'] = function(n, b, vMode) {
  var list = n.expressions, e = 0, yc = y(n);
  while (yc > 0 && e < list.length - 1 ) {
    var elem = list[e], currentY = y(elem);
    elem = this.transformYield(elem, b, NOT_VAL);
    if (elem !== 'NoExpression' && (elem.type !== 'Identifier' || !elem.synth) )
      b. push(elem);

    yc -= currentY; 
    e++;
  }
  if (e === list.length-1)
    return this.transformYield(list[e], b, vMode);

  n.expressions = [];
  while (e < list.length) n.expressions.push(list[e++]);

  return n;
};

transformerList['UpdateExpression'] = function(n, b, vMode) {
   var a = n.argument;
   if ( a.type === 'Identifier')
     return n;

   a.object = this.transformYield(a.object, b, IS_VAL);
   if ( a.computed && y(a.property) ) {
     var temp = this.scope.allocateTemp();
     append_assig(b, temp, a.object);
     a.object = synth_id_node(temp);
     a.property = this.transformYield(a.property, b, IS_VAL);
     this.scope.releaseTemp(temp);
   }

   return n;
};

transformerList['UnaryExpression'] = function(n, b, vMode) {
  n.argument = this.transformYield(n.argument, b, IS_VAL);
  return n;
};

