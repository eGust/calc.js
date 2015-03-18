function Scope(name)
{
	if (Scope.prototype.newScopeId === undefined)
	{
		var scopeId = 0, self = Scope.prototype;
		self.newScopeId = function() {
			return scopeId++;
		}

		self.toString = function() {
			return "Scope{" + this.name + "(" + this.id + ")}";
		}
	}
	if (!(this instanceof Scope))
        return new Scope(name);

    this.name = name;
	this.id = this.newScopeId();
}

const
	scpValue = Scope('Value'), scpOperator = Scope('Operator'), scpFlower = Scope('Flower'), scpInline = Scope('Inline'),
	scpQuest = Scope('Quest'), scpBracket = Scope('Bracket'), scpArray = Scope('Array');

function Operator(str, rank, operand, name, fnModifier, fnCalc) {
	if (Operator.prototype.modifyStacks == undefined)
	{
		var scopeId = 0, self = Operator.prototype;

		self.newExpr = function() {
			return OperatorExpr(this);
		};

		self.toString = function() {
			return 'op' + this.name + '{"' + this.op + '" '+ this.operand + '}';
		}
	}
	if (!(this instanceof Operator))
        return new Operator(str, rank, operand, name, fnModifier, fnCalc);

    this.op = str;
    this.name = name;
    this.rank = rank;
    this.operand = operand;
    this.stackModifier = fnModifier;
    this.calc = fnCalc; //function(args, symbols) {};
}

const 
	fnModifiers = {
		gaurd:	function (curOp, stackExpr, stackScope) 
			{	// #GAURD
				stackExpr.push(curOp)
				stackScope.curScope = scpOperator;
				return true;
			},
		unary:	function (curOp, stackExpr, stackScope) 
			{	// + - ~ !
				var stkOp = stackExpr.cur();
				stkOp.push(curOp);
				stackExpr.push(curOp);
				stackScope.curScope = scpOperator;
				return true;
			},
		binary:	function (curOp, stackExpr, stackScope) 
			{	// ** * / % \  + - & | ^  == != > >= > >=  && ||
				var stkOp = stackExpr.cur(), crank = curOp.op.rank;

				while (crank <= stkOp.op.rank)
				{
					stackExpr.pop();
					stkOp = stackExpr.cur();
				}

				stkOp.changeCurrentParameter(curOp);
				stackExpr.push(curOp);
				stackScope.curScope = scpOperator;
				return true;
			},
		comma:	function (curOp, stackExpr, stackScope) 
			{	// ,
				var scp = stackScope.cur();
				if (scp != scpArray && scp != scpBracket)
					throw 'Comma "," not in any open bracket range.';

				var stkOp = stackExpr.cur(), crank = curOp.op.rank;
				while (stkOp.op.rank !== crank )
				{
					stackExpr.pop();
					stkOp = stackExpr.cur();
				}

				var curOp = stkOp.op;
				if ( curOp.op !== '[' && curOp !== operators.OpenFunction )
					throw 'Invalid position of ",".';

				stackScope.curScope = scpOperator;
				return true;
			},
		quest:	function (curOp, stackExpr, stackScope) 
			{	// ?
				var stkOp = stackExpr.cur(), crank = curOp.op.rank;

				while (crank < stkOp.op.rank)
				{
					stackExpr.pop();
					stkOp = stackExpr.cur();
				}

				stkOp.changeCurrentParameter(curOp);
				stackExpr.push(curOp);
				stackScope.push(scpQuest);
				stackScope.curScope = scpOperator;
				return true;
			},
		colon:	function (curOp, stackExpr, stackScope) 
			{	// :
				var scp = stackScope.cur();
				if (scp !== scpQuest)
					throw 'Colon ":" not in a question "?" expression.';

				var stkOp = stackExpr.cur();

				while (stkOp.op !== operators._Quest)
				{
					stackExpr.pop();
					stkOp = stackExpr.cur();
				}

				stkOp.op = operators.Quest;
				stackScope.pop();
				stackScope.curScope = scpOperator;
				return true;
			},
		assign:	function (curOp, stackExpr, stackScope)
			{	// =
				var stkOp = stackExpr.cur(), crank = curOp.op.rank;

				while (crank < stkOp.op.rank)
				{
					stackExpr.pop();
					stkOp = stackExpr.cur();
				}

				stkOp.changeCurrentParameter(curOp);
				stackExpr.push(curOp);
				stackScope.curScope = scpOperator;
				stackExpr.containAssign = true;
				return true;
			},

	},

	operators = {
		// key = name
		// str, rank, operand, name, fnModifier, fnCalc
'Positive':		Operator( '+',	45,	1,	'Positive',	fnModifiers.unary,	function(args, sbt) { return args[0].calc(sbt); } ),
'Negative':		Operator( '-',	45,	1,	'Negative',	fnModifiers.unary,	function(args, sbt) { return CalcLib.negate(args[0].calc(sbt)); } ),
'BitNot':		Operator( '~',	43,	1,	'BitNot',	fnModifiers.unary,	function(args, sbt) { return CalcLib.bitNot(args[0].calc(sbt)); } ),
'LgcNot':		Operator( '!',	41,	1,	'LgcNot',	fnModifiers.unary,	function(args, sbt) { return CalcLib.logicNot(args[0].calc(sbt)); } ),
'OpenBracket':	Operator( '(',	1,	1,	'OpenBracket',	null,	function(args, sbt) { return args[0].calc(sbt); } ),
'OpenArray':	Operator( '[',	1,	-1,	'OpenArray',	null,	function(args, sbt) { return CalcLib.arrayValue(args, sbt); } ),

'_OpenFunction':	Operator( '(',	81,	-1,	'_OpenFunction',	null,	null /* not real op holder */ ),
'_OpenDerefArray':	Operator( '[',	81,	-1,	'_OpenDerefArray',	null,	null /* not real op holder */ ),
'Property':		Operator( '.',	81,	2,	'Property',	fnModifiers.binary,	function(args, sbt) { return CalcLib.property(args[0], args[1], sbt); } ),
'Power':		Operator( '**',	47,	2,	'Power',	fnModifiers.binary,	function(args, sbt) { return CalcLib.power(args[0].calc(sbt), args[1].calc(sbt)); } ),
'Times':		Operator( '*',	46,	2,	'Times',	fnModifiers.binary,	function(args, sbt) { return CalcLib.multiply(args[0].calc(sbt), args[1].calc(sbt)); } ),
'Divide':		Operator( '/',	46,	2,	'Divide',	fnModifiers.binary,	function(args, sbt) { return CalcLib.divide(args[0].calc(sbt), args[1].calc(sbt)); } ),
'Modulo':		Operator( '%',	46,	2,	'Modulo',	fnModifiers.binary,	function(args, sbt) { return CalcLib.modulo(args[0].calc(sbt), args[1].calc(sbt)); } ),
'IntDivide':	Operator( '//',	46,	2,	'IntDivide',	fnModifiers.binary,	function(args, sbt) { return CalcLib.intDivide(args[0].calc(sbt), args[1].calc(sbt)); } ),
'Plus':			Operator( '+',	45,	2,	'Plus',	fnModifiers.binary,	function(args, sbt) { return CalcLib.add(args[0].calc(sbt), args[1].calc(sbt)); } ),
'Minus':		Operator( '-',	45,	2,	'Minus',	fnModifiers.binary,	function(args, sbt) { return CalcLib.sub(args[0].calc(sbt), args[1].calc(sbt)); } ),
'BitAnd':		Operator( '&',	43,	2,	'BitAnd',	fnModifiers.binary,	function(args, sbt) { return CalcLib.bitAnd(args[0].calc(sbt), args[1].calc(sbt)); } ),
'BitOr':		Operator( '|',	43,	2,	'BitOr',	fnModifiers.binary,	function(args, sbt) { return CalcLib.bitOr(args[0].calc(sbt), args[1].calc(sbt)); } ),
'BitXor':		Operator( '^',	43,	2,	'BitXor',	fnModifiers.binary,	function(args, sbt) { return CalcLib.bitXor(args[0].calc(sbt), args[1].calc(sbt)); } ),
'CmpEqual':			Operator( '==',	42,	2,	'CmpEqual',	fnModifiers.binary,	function(args, sbt) { return CalcLib.isEqual(args[0].calc(sbt), args[1].calc(sbt)); } ),
'CmpNotEqual':		Operator( '!=',	42,	2,	'CmpNotEqual',	fnModifiers.binary,	function(args, sbt) { return CalcLib.notEqual(args[0].calc(sbt), args[1].calc(sbt)); } ),
'CmpGreater':		Operator( '>',	42,	2,	'CmpGreater',	fnModifiers.binary,	function(args, sbt) { return CalcLib.isGreater(args[0].calc(sbt), args[1].calc(sbt)); } ),
'CmpGreaterEqual':	Operator( '>=',	42,	2,	'CmpGreaterEqual',	fnModifiers.binary,	function(args, sbt) { return CalcLib.isGreaterEqual(args[0].calc(sbt), args[1].calc(sbt)); } ),
'CmpLess':			Operator( '<',	42,	2,	'CmpLess',	fnModifiers.binary,	function(args, sbt) { return CalcLib.isLess(args[0].calc(sbt), args[1].calc(sbt)); } ),
'CmpLessEqual':		Operator( '<=',	42,	2,	'CmpLessEqual',	fnModifiers.binary,	function(args, sbt) { return CalcLib.isLessEqual(args[0].calc(sbt), args[1].calc(sbt)); } ),
'LgcAnd':	Operator( '&&',	41,	2,	'LgcAnd',	fnModifiers.binary,	function(args, sbt) { return CalcLib.logicAnd(args[0], args[1], sbt); } ),
'LgcOr':	Operator( '||',	41,	2,	'LgcOr',	fnModifiers.binary,	function(args, sbt) { return CalcLib.logicOr(args[0], args[1], sbt); } ),
'_Quest':	Operator( '?',	30,	3,	'_Quest',	fnModifiers.quest,	null /* not real op holder */ ),
'Colon':	Operator( ':',	30,	0,	'Colon',	fnModifiers.colon,	null ),
'Unit':		Operator( '@',	20,	2,	'Unit',	fnModifiers.binary,	function(args, sbt) { return CalcLib.setUnit(args[0], args[1], sbt); } ),
'Assign':	Operator( '=',	10,	2,	'Assign',	fnModifiers.assign,	function(args, sbt) { return CalcLib.assign(args[0], args[1].calc(sbt), sbt); } ),
'CloseBracket':	Operator( ')',	1,	0,	'CloseBracket',	null,	null ),
'CloseArray':	Operator( ']',	1,	0,	'CloseArray',	null,	null ),
'Comma':		Operator( ',',	1,	0,	'Comma',	fnModifiers.comma,	null ),

'$GAURD':	Operator( '#',	-1,	1,	'$GAURD',	fnModifiers.gaurd,	null ),
'Quest':	Operator( '?',	30,	3,	'Quest',	null,	function(args, sbt) { return CalcLib.quest(args[0].calc(sbt), args[1], args[2], sbt); }),
'OpenFunction':		Operator( '(',	1,	-1,	'OpenFunction',	null,	CalcLib.callFunction ),
'OpenDerefArray':	Operator( '[',	1,	-1,	'OpenDerefArray',	null,	CalcLib.derefArray ),
// 'Call':	Operator( ':',	30,	-1, 'Call', null, CalcLib.callFunction ),

	}
//	,
	;

/*
todo:
	@
*/

(function () {
	function getUnaryOpenerModifier(scp) {	// [ (
		return function (curOp, stackExpr, stackScope)
		{	// ( [	Bracket Array
			var stkOp = stackExpr.cur();
			stkOp.push(curOp);
			stackExpr.push(curOp);
			stackScope.push(scp);
			stackScope.curScope = scpOperator;
			return true;
		};
	}

	function getBiaryOpenerModifier(scp, realOp) {	// [ (
		return function (curOp, stackExpr, stackScope)
		{	// ( [	Function Dereference
			var stkOp = stackExpr.cur(), crank = curOp.op.rank;

			while (crank <= stkOp.op.rank)
			{
				stackExpr.pop();
				stkOp = stackExpr.cur();
			}

			curOp.op = realOp;
			stkOp.changeCurrentParameter(curOp);
			stackExpr.push(curOp);
			stackScope.push(scp);
			stackScope.curScope = scpOperator;
			return true;
		};
	}

	function getCloserModifier(scp, opstr) {	// ] )
		return function (curOp, stackExpr, stackScope)
		{	// ) ]
			if (stackScope.cur() != scp)
				throw 'Not matched close bracket ")" or "]"';

			var stkOp = stackExpr.cur();
			while (stkOp.op.op != opstr)
			{
				stackExpr.pop();
				stkOp = stackExpr.cur();
			}

			stackExpr.pop();
			stackScope.pop();
			stackScope.curScope = scpValue;
			return true;
		};
	}

	operators.OpenBracket.stackModifier	= getUnaryOpenerModifier(scpBracket);
	operators.OpenArray.stackModifier	= getUnaryOpenerModifier(scpArray);

	operators._OpenFunction.stackModifier	= getBiaryOpenerModifier(scpBracket, operators.OpenFunction);
	operators._OpenDerefArray.stackModifier	= getUnaryOpenerModifier(scpArray, operators.OpenDerefArray);

	operators.CloseBracket.stackModifier	= getCloserModifier(scpBracket, '(');
	operators.CloseArray.stackModifier		= getCloserModifier(scpBracket, '[');
})();
