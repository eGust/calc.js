/*
[dependency]
	decimal.js

	lexer.js
	exprs.js
	operators.js
	symbol.js
	calclib.js
*/

function Stack()
{
	if (Stack.prototype.push == undefined)
	{
		var self = Stack.prototype;

		self.push = function(item) {
			this.items[this.count++] = item;
		}

		self.pop = function() {
			return (this.count > 0) ? this.items[--this.count] : null;
		}

		self.cur = function() {
			return (this.count > 0) ? this.items[this.count-1] : null;
		}

		self.toString = function() {
			var slog = this.count + ": [ ";
			for (var i = 0; i < this.count; i++)
				slog += "(" + this.items[i] + "),";
			return slog + " ]";
		}
	}
	if (!(this instanceof Stack))
        return new Stack();

    this.items = [];
    this.count = 0;
}

function InfixExprConstructor(scanner, stackScope) {
	if (!(this instanceof InfixExprConstructor))
        return new InfixExprConstructor(scanner, stackScope);

	var opGaurd = operators.$GAURD.newExpr(), stackExpr = Stack(), stackScopeCount = stackScope.count;
	opGaurd.modifyStacks(stackExpr, stackScope);

	this.next = function () {
		var curScope = stackScope.curScope, str = scanner.tokenString;
		//console.log('[infix]', scanner.nextToken, str);

		switch (scanner.nextToken) {
			case tkOperator:
				var op = curScope === scpOperator ? this.setOperator[str] : this.setValue[str];
				if (op === undefined)
				{
					if (str === ')' && stackExpr.cur().op === operators.OpenFunction)
					{
						op = this.setValue[str];
					} else
						throw "Invalid Operator: " + str;
				}

				if (!op.stackModifier)
					throw "Not supported operator: " + op;

				if (!op.newExpr().modifyStacks(stackExpr, stackScope))
				{
					// failed!
					throw 'Modify stack failed!';
				}
				break;
			case tkIdentity:
			case tkNumber:
			case tkString:
				if (curScope !== scpOperator)
					throw "Invalid Operator: " + scanner.nextToken;

				var
					ve = scanner.nextToken === tkIdentity ? IdentityExpr(str) : ValueExpr(str, scanner.nextToken === tkNumber),
					oe = stackExpr.cur();
				if (!oe.push(ve))
				{
					throw 'Expression push value failed!';
				}

				stackScope.curScope = scpValue;
				break;
			default:
			/* Invalid!
			case tkInvalidInput:
			case tkInvalidNumber:
			case tkInvalidHex:
			case tkInvalidOctal:
			case tkInvalidBin:
				// invalid! */
				throw '[ERROR] At position ' + scanner.from + ': "' + str + '" - ' + scanner.nextToken.name;
				//return scanner;
		}
	};

	this.push = function (expr) {
		stackExpr.cur().push(expr);
		stackScope.curScope = scpValue;
	}

	this.close = function () {
		if (stackScope.count > stackScopeCount)
		{
			/*
			if (stackScope.cur() == scpQuery)
			{
				stackScope.pop();
			} else
			*/
				throw (stackScope.count-stackScopeCount) + ' of open operatorer(s) like "?", "(", "[" not be closed!';
		}

		if (stackScope.curScope != scpValue)
			throw 'The expression is not completed!';

		var r = opGaurd.parameters[0];
		r.assign = stackExpr.containAssign;
		return r;
	};
}

(function () {
	var setOperators = { }, setValues = { }, i, op;
	// const SoloSimples = "+ - ~ !".split(" "), DuoSimples = "** * / % //  + - & | ^  == != > >= < <=  && ||".split(" ");
	const
		opOperators = [ 'Positive', 'Negative', 'BitNot', 'LgcNot', 'OpenBracket', 'OpenArray', ],
		opValues = [ '_OpenFunction', '_OpenDerefArray', 'Property',
		'Power', 'Times', 'Root',
		'Divide', 'Modulo', 'IntDivide', 'Plus', 'Minus',
		'BitAnd', 'BitOr', 'BitXor',
		'CmpEqual', 'CmpNotEqual', 'CmpGreater', 'CmpGreaterEqual', 'CmpLess', 'CmpLessEqual',
		'LgcAnd', 'LgcOr',
		'_Quest', 'Colon', 'Unit', 'Assign', 'CloseBracket', 'CloseArray', 'Comma', ];

	for (i in opOperators) {
		op = operators[opOperators[i]];
		setOperators[op.op] = op;
	}

	for (i in opValues) {
		op = operators[opValues[i]];
		setValues[op.op] = op;
	}

	InfixExprConstructor.prototype.setOperator = setOperators;
	InfixExprConstructor.prototype.setValue = setValues;
})();

function PostfixExprContructor(scanner, stackScope) {
	if (!(this instanceof PostfixExprContructor))
        return new PostfixExprContructor(scanner, stackScope);

    var stack = Stack(), assign = false, stackScopeCount = stackScope.count;
	this.next = function () {
		var curScope = stackScope.curScope, str = scanner.tokenString;
		//console.log('[postfix]', scanner.nextToken, str);

		switch (scanner.nextToken) {
			case tkOperator:
				switch (str) {
					case '(':
						stackScope.push(scpBracket);
						stack.push(operators.OpenFunction.newExpr());
						return;
					case ')':
						if (stackScope.cur() !== scpBracket)
							throw 'Unexpected ")"';

						stackScope.pop();
						var args = [], e = stack.cur();
						while ( !(e.type === etOperator && e.op === operators.OpenFunction) ) {
							args.push(stack.pop());
							e = stack.cur();
						}

						e.push(args[0]);
						var count = args.length-1;
						for (var i = args.length-1; i > 0; --i) {
							e.push(args[i]);
						}
						return;
					case ',':
						return;
				}

				var op = this.supported[str];
				if (!op)
					throw "Invalid Postfix Operator: " + str;

				var oprd = op.operand, oe = op.newExpr(), args = [];
				assign = assign || op.op === '=';
				if (oprd > stack.count)
					throw 'Too less operands for operator "'+op.op+'" ('+oprd+' requested, '+stack.count+' given)';

				args.length = oprd;
				for (var i = oprd-1; i >= 0; i--) {
					args[i] = stack.pop();
				}

				for (var i in args)
					oe.push(args[i]);
				stack.push(oe);
				break;
			case tkIdentity:
			case tkNumber:
			case tkString:
				var ve = scanner.nextToken === tkIdentity ? IdentityExpr(str) : ValueExpr(str, scanner.nextToken === tkNumber);
				stack.push(ve);
				break;
			default:
			/* Invalid!
			case tkInvalidInput:
			case tkInvalidNumber:
			case tkInvalidHex:
			case tkInvalidOctal:
			case tkInvalidBin:
				// invalid! */
				throw '[ERROR] At position ' + scanner.from + ': "' + str + '" - ' + scanner.nextToken.name;
		}
	};

	this.push = function (expr) {
		stack.push(expr);
	}

	this.close = function () {
		if (stackScope.count > stackScopeCount)
		{
			/*
			if (stackScope.cur() == scpQuery)
			{
				stackScope.pop();
			} else
			*/
				throw stackScope.count + ' of open operatorer(s) like "(" not be closed!';
		}

		var r = stack.pop();
		r.assign = assign;
		return r;
	};
}

(function () {
	var supported = {}, ops = [
		//'Positive', //		Operator( '+',	45,	1,	'Positive',	fnModifiers.unary,	function(args, sbt) { return args[0].calc(sbt); } ),
		//'Negative', //		Operator( '-',	45,	1,	'Negative',	fnModifiers.unary,	function(args, sbt) { return CalcLib.negate(args[0].calc(sbt)); } ),
		'BitNot', //		Operator( '~',	43,	1,	'BitNot',	fnModifiers.unary,	function(args, sbt) { return CalcLib.bitNot(args[0].calc(sbt)); } ),
		'LgcNot', //		Operator( '!',	41,	1,	'LgcNot',	fnModifiers.unary,	function(args, sbt) { return CalcLib.logicNot(args[0].calc(sbt)); } ),
		//'OpenBracket', //	Operator( '(',	1,	1,	'OpenBracket',	fnModifiers.getUnaryOpenerModifier(scpBracket),	function(args, sbt) { return args[0].calc(sbt); } ),
		//'OpenArray', //	Operator( '[',	1,	-1,	'OpenArray',	fnModifiers.getUnaryOpenerModifier(scpArray),	function(args, sbt) { return CalcLib.arrayValue(args, sbt); } ),

		//'_OpenFunction', //	Operator( '(',	81,	-1,	'_OpenFunction',	fnModifiers.getBiaryOpenerModifier(scpBracket, this.OpenFunction),	null /* not real op holder */ ),
		//'_OpenDerefArray', //	Operator( '[',	81,	-1,	'_OpenDerefArray',	fnModifiers.getBiaryOpenerModifier(scpArray, this.OpenDerefArray),	null /* not real op holder */ ),
		'Property', //		Operator( '.',	81,	2,	'Property',	fnModifiers.binary,	function(args, sbt) { return CalcLib.property(args[0], args[1], sbt); } ),
		'Power', //		Operator( '**',	47,	2,	'Power',	fnModifiers.binary,	function(args, sbt) { return CalcLib.power(args[0].calc(sbt), args[1].calc(sbt)); } ),
		'Times', //		Operator( '*',	46,	2,	'Times',	fnModifiers.binary,	function(args, sbt) { return CalcLib.multiply(args[0].calc(sbt), args[1].calc(sbt)); } ),
		'Divide', //		Operator( '/',	46,	2,	'Divide',	fnModifiers.binary,	function(args, sbt) { return CalcLib.divide(args[0].calc(sbt), args[1].calc(sbt)); } ),
		'Modulo', //		Operator( '%',	46,	2,	'Modulo',	fnModifiers.binary,	function(args, sbt) { return CalcLib.modulo(args[0].calc(sbt), args[1].calc(sbt)); } ),
		'IntDivide', //	Operator( '//',	46,	2,	'IntDivide',	fnModifiers.binary,	function(args, sbt) { return CalcLib.intDivide(args[0].calc(sbt), args[1].calc(sbt)); } ),
		'Plus', //			Operator( '+',	45,	2,	'Plus',	fnModifiers.binary,	function(args, sbt) { return CalcLib.add(args[0].calc(sbt), args[1].calc(sbt)); } ),
		'Minus', //		Operator( '-',	45,	2,	'Minus',	fnModifiers.binary,	function(args, sbt) { return CalcLib.sub(args[0].calc(sbt), args[1].calc(sbt)); } ),
		'BitAnd', //		Operator( '&',	43,	2,	'BitAnd',	fnModifiers.binary,	function(args, sbt) { return CalcLib.bitAnd(args[0].calc(sbt), args[1].calc(sbt)); } ),
		'BitOr', //		Operator( '|',	43,	2,	'BitOr',	fnModifiers.binary,	function(args, sbt) { return CalcLib.bitOr(args[0].calc(sbt), args[1].calc(sbt)); } ),
		'BitXor', //		Operator( '^',	43,	2,	'BitXor',	fnModifiers.binary,	function(args, sbt) { return CalcLib.bitXor(args[0].calc(sbt), args[1].calc(sbt)); } ),
		'CmpEqual', //			Operator( '==',	42,	2,	'CmpEqual',	fnModifiers.binary,	function(args, sbt) { return CalcLib.isEqual(args[0].calc(sbt), args[1].calc(sbt)); } ),
		'CmpNotEqual', //		Operator( '!=',	42,	2,	'CmpNotEqual',	fnModifiers.binary,	function(args, sbt) { return CalcLib.notEqual(args[0].calc(sbt), args[1].calc(sbt)); } ),
		'CmpGreater', //		Operator( '>',	42,	2,	'CmpGreater',	fnModifiers.binary,	function(args, sbt) { return CalcLib.isGreater(args[0].calc(sbt), args[1].calc(sbt)); } ),
		'CmpGreaterEqual', //	Operator( '>=',	42,	2,	'CmpGreaterEqual',	fnModifiers.binary,	function(args, sbt) { return CalcLib.isGreaterEqual(args[0].calc(sbt), args[1].calc(sbt)); } ),
		'CmpLess', //			Operator( '<',	42,	2,	'CmpLess',	fnModifiers.binary,	function(args, sbt) { return CalcLib.isLess(args[0].calc(sbt), args[1].calc(sbt)); } ),
		'CmpLessEqual', //		Operator( '<=',	42,	2,	'CmpLessEqual',	fnModifiers.binary,	function(args, sbt) { return CalcLib.isLessEqual(args[0].calc(sbt), args[1].calc(sbt)); } ),
		'LgcAnd', //	Operator( '&&',	41,	2,	'LgcAnd',	fnModifiers.binary,	function(args, sbt) { return CalcLib.logicAnd(args[0], args[1], sbt); } ),
		'LgcOr', //	Operator( '||',	41,	2,	'LgcOr',	fnModifiers.binary,	function(args, sbt) { return CalcLib.logicOr(args[0], args[1], sbt); } ),
		//'_Quest', //	Operator( '?',	30,	3,	'_Quest',	fnModifiers.binary,	null /* not real op holder */ ),
		'Colon', //	Operator( ':',	30,	0,	'Colon',	fnModifiers.colon,	null ),
		'Unit', //		Operator( '@',	20,	2,	'Unit',	fnModifiers.binary,	function(args, sbt) { return CalcLib.setUnit(args[0], args[1], sbt); } ),
		'Assign', //	Operator( '=',	10,	2,	'Assign',	fnModifiers.assign,	function(args, sbt) { return CalcLib.assign(args[0], args[1].calc(sbt), sbt); } ),
		//'CloseBracket', //	Operator( ')',	1,	0,	'CloseBracket',	fnModifiers.getCloserModifier(scpBracket, '('),	null ),
		//'CloseArray', //	Operator( ']',	1,	0,	'CloseArray',	fnModifiers.getCloserModifier(scpBracket, '['),	null ),
		//'Comma', //		Operator( ',',	1,	0,	'Comma',	fnModifiers.binary,	null ),

		//'$GAURD', //	Operator( '#',	-1,	1,	'$GAURD',	fnModifiers.gaurd,	null ),
		'Quest', //	Operator( '?:',	30,	3,	'Quest',	fnModifiers.quest,	function(args, sbt ),
		//'OpenFunction', //		Operator( '(',	1,	-1,	'OpenFunction',	null,	CalcLib.callFunction ),
		//'OpenDerefArray', //	Operator( '[',	1,	-1,	'OpenDerefArray',	null,	CalcLib.derefArray ),
	];
	for (var i in ops) {
		var op = operators[ops[i]];
		supported[op.op] = op;
	}
	PostfixExprContructor.prototype.supported = supported;
})();

var
	NotationExprMap = {
		'infix':	InfixExprConstructor,
		'postfix':	PostfixExprContructor,
	},
	NotationDOMAttrs	= {
		'infix':	{ placeholder: 'infix:', title: 'infix notation', },
		'postfix':	{ placeholder: 'postfix:', title: 'Reverse Polish notation', },
	},
	ExprContructors = {
		'#{IN:':	InfixExprConstructor,
		'#{RPN:':	PostfixExprContructor,
	};

function parse(scanner) {
	var stackScope = Stack(), cur = NotationExprMap[notation](scanner, stackScope), stack = Stack(), assign = false;
	stack.push(cur);
	while (scanner.next()) {
		var str = scanner.tokenString;
		//console.log(scanner.nextToken, str);

		switch (scanner.nextToken) {
			case tkWhiteSpace:
			case tkComment:
				continue;
			case tkScope:
				var ec = ExprContructors[str.toUpperCase()];
				if (!ec)
					throw 'Unknown Notation symbol: "'+str.substring(2, str.length-1)+'"';
				stack.push(cur = ec(scanner, stackScope));
				stackScope.push(scpInline);
				break;
			case tkOperator:
				if (str === '}' && stackScope.cur() === scpInline) {
					if (stack.count <= 1)
						throw 'Unexpected operator "}"';

					stackScope.pop();
					var e = stack.pop().close();
					assign = assign || e.assign;
					cur = stack.cur();
					cur.push(e);
					continue;
				}

				cur.next();
				break;
			case tkIdentity:
			case tkNumber:
			case tkString:
				cur.next();
				break;
			default:
			/* Invalid!
			case tkInvalidInput:
			case tkInvalidNumber:
			case tkInvalidHex:
			case tkInvalidOctal:
			case tkInvalidBin:
				// invalid! */
				throw '[ERROR] At position ' + scanner.from + ': "' + str + '" - ' + scanner.nextToken.name;
				return scanner;
		}
		//console.log(""+opGaurd.parameters[0]);
	}

	if (stack.count > 1)
		throw 'Unclosed inline Notation';

	var r = cur.close();
	r.assign = r.assign || assign;
	return r;
}
