/*

[dependency]
	lexer.js
	decimal.js
	symbol.js
	calclib.js

[classes]
	Expression:
		Value calc(VariantDictionary symbols)
		int paramCount
		Expression[] parameters

	ValueExpr(Expression):
		Value	value
		func calc(symbols) => value

	OperatorExpr(Expression):
		Operator	op
		func calc(symbols) => args = map(param.calc(symbols)), return op.calc(args)

	ExprStackItem:
		Expression	expr
		StackItem	parent

	Scope = ( scpValue, scpOperator, scpQueryTrue, scpQueryFalse, scpBracket, scpArray )
*/

function ValueExpr(str) {
	if (ValueExpr.prototype.calc == undefined) {
		var self = ValueExpr.prototype;

		self.calc = function() {
			return this.value;
		};

		self.toString = function() {
			return "ValueExpr(" + this.value.toString() + ")";
		};
	}

	if (!(this instanceof ValueExpr))
        return new ValueExpr(str);

    this.value = CalcLib.stringToValue(str);
    this.paramCount = 0;
    this.parameters = null;
}

function VariantExpr(str) {
	if (VariantExpr.prototype.calc == undefined) {
		var self = VariantExpr.prototype;

		self.calc = function(symbols) {
			var symbol = symbols[this.vname];
			if (symbol == undefined)
				throw 'Can not find symbol: "' + this.vname + '"';
			return symbol.getValue();
		};

		self.toString = function() {
			return "VariantExpr(" + this.vname + ")";
		};
	}

	if (!(this instanceof VariantExpr))
        return new VariantExpr(str);

    this.vname = str;
    this.paramCount = 0;
    this.parameters = null;
}

function OperatorExpr(op) {
	if (OperatorExpr.prototype.calc == undefined) {
		var self = OperatorExpr.prototype;

		self.calc = function(symbols) {
			/*
			var args = new Array(this.paramCount);
			for (var i = 0; i < args.length; i++)
				args[i] = this.parameters[i].calc(true);

			//return this.op.calc(args, symbols);
			var r = this.op.calc(this.parameters, symbols);

			if (!symbols)
			{
				console.log(this+"")
				for (var i = 0; i < args.length; i++)
					console.log("  " + args[i]);
				console.log(" = " + r);
			}

			return r;
			//*/
			var fnCalc = this.op.calc;
			if (fnCalc)
				return fnCalc(this.parameters, symbols);
			
			throw "Not supported calculation of: " + this.op;
		};

		self.push = function(ve) {
			var pcnt = this.paramCount;
			if (pcnt >= 0 && this.index >= pcnt)
				return false;

			this.parameters[this.index++] = ve;
			return this.index;
		};

		self.changeCurrent = function(oe) {
			if (this.index == 0)
				return false;
			var i = this.index-1, ve = this.parameters[i];
			if (!oe.push(ve))
				return false;
			this.parameters[i] = oe;
			return ve;
		}

		self.modifyStacks = function(stackExpr, stackScope) {
			return this.op.stackModifier(this, stackExpr, stackScope);
		};

		self.toString = function() {
			var r = "OperatorExpr: " + this.op;
			for (var i in this.parameters)
			{
				var lines = ("" + this.parameters[i]).split("\n");
				for (var j in lines)
					r += "\n\t" + lines[j];
				//
			}
			return r;
		};
	}

	if (!(this instanceof OperatorExpr))
        return new OperatorExpr(op);

    this.op = op;
    this.paramCount = op.operand;
    this.parameters = new Array(this.paramCount);
    this.index = 0;
}

function Scope(name)
{
	if (Scope.prototype.newScopeId == undefined)
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
	scpValue = Scope('Value'), scpOperator = Scope('Operator'), 
	scpQueryTrue = Scope('QueryTrue'), scpQueryFalse = Scope('QueryFalse'), 
	scpBracket = Scope('Bracket'), scpArray = Scope('Array');

function Operator(str, name, rank, operand, fnCalc) {
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
        return new Operator(str, name, rank, operand, fnCalc);

    this.op = str;
    this.name = name;
    this.rank = rank;
    this.operand = operand;
    this.calc = fnCalc; //function(args, symbols) {};
    this.stackModifier = null;
}

function Stack()
{
	if (Stack.prototype.push == undefined)
	{
		var self = Stack.prototype;

		self.push = function(item) {
			this.items[this.count++] = item;
		}

		self.pop = function() {
			if (this.count > 0)
				--this.count;
		}

		self.popItem = function() {
			if (this.count == 0)
				return undefined;
			return this.items[--this.count];
		}

		self.cur = function() {
			if (this.count == 0)
				return undefined;
			return this.items[this.count-1];
		}

		self.relpaceTop = function(item) {
			var idx = this.count-1;
			if (idx < 0)
				return false;
			var r = this.items[idx];
			this.items[idx] = item;
			return r;
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

function Parser(scanner)
{
	if (Parser.prototype.parse == undefined) {
		var self = Parser.prototype;

		var setOperator = { }, setValue = { };
		const ranks = [ 0, 11, 22, 33, 44, 55, 66, 77, 88, 99, ];

		function generateOps() {
			const
				soloOps = [
					Operator('+', 'Positive', ranks[7], 1, function(args, sbt) { return args[0].calc(sbt); }),
					Operator('-', 'Negative', ranks[7], 1, function(args, sbt) { return CalcLib.negate(args[0].calc(sbt)); }),
					Operator('~', 'BitNot', ranks[3], 1, function(args, sbt) { return CalcLib.bitNot(args[0].calc(sbt)); }),
					Operator('!', 'LogicNot', ranks[9], 1, function(args, sbt) { return CalcLib.logicNot(args[0].calc(sbt)); }),
					Operator('(', 'OpenBracket', ranks[0], 1, function(args, sbt) { return args[0].calc(sbt); }),
					Operator('[', 'OpenArray', ranks[0], -1, function(args, sbt) { return CalcLib.arrayValue(args, sbt); }),
				],
				duoOps = [
					Operator('**', 'Power', ranks[9], 2, function(args, sbt) { return CalcLib.power(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('*', 'Times', ranks[8], 2, function(args, sbt) { return CalcLib.multiply(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('/', 'Divide', ranks[8], 2, function(args, sbt) { return CalcLib.divide(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('%', 'Modulo', ranks[8], 2, function(args, sbt) { return CalcLib.modulo(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('\\', 'IntDivide', ranks[8], 2, function(args, sbt) { return CalcLib.intDivide(args[0].calc(sbt), args[1].calc(sbt)); }),

					Operator('+', 'Plus', ranks[7], 2, function(args, sbt) { return CalcLib.add(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('-', 'Minus', ranks[7], 2, function(args, sbt) { return CalcLib.sub(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('&', 'BitAnd', ranks[5], 2, function(args, sbt) { return CalcLib.bitAnd(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('|', 'BitOr', ranks[5], 2, function(args, sbt) { return CalcLib.bitOr(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('^', 'BitXor', ranks[5], 2, function(args, sbt) { return CalcLib.bitXor(args[0].calc(sbt), args[1].calc(sbt)); }),

					Operator('==', 'CompareEqual', ranks[4], 2, function(args, sbt) { return CalcLib.isEqual(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('!=', 'CompareNotEqual', ranks[4], 2, function(args, sbt) { return CalcLib.notEqual(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('>', 'CompareGreater', ranks[4], 2, function(args, sbt) { return CalcLib.isGreater(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('>=', 'CompareGreaterEqual', ranks[4], 2, function(args, sbt) { return CalcLib.isGreaterEqual(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('<', 'CompareLess', ranks[4], 2, function(args, sbt) { return CalcLib.isLess(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('<=', 'CompareLessEqual', ranks[4], 2, function(args, sbt) { return CalcLib.isLessEqual(args[0].calc(sbt), args[1].calc(sbt)); }),

					Operator('&&', 'LogicAnd', ranks[3], 2, function(args, sbt) { return CalcLib.logicAnd(args[0], args[1], sbt); }),
					Operator('||', 'LogicOr', ranks[3], 2, function(args, sbt) { return CalcLib.logicOr(args[0], args[1], sbt); }),
					Operator('?', 'Query', ranks[2], 3, function(args, sbt) { return CalcLib.query(args[0], args[1], args[2], sbt); }),
					Operator('=', 'Assign', ranks[1], 0, function(args, sbt) { return CalcLib.assign(args[0], args[1].calc(sbt), sbt); }),

					Operator(':', 'Colon', ranks[2], 0, null),
					Operator(',', 'Comma', ranks[0], 0, null),

					Operator('(', 'OpenFunction', ranks[0], -1, function(args, sbt) { return CalcLib.callFunction(args, sbt); }),
					Operator('[', 'OpenDerefArray', ranks[0], -1, function(args, sbt) { return CalcLib.derefArray(args, sbt); }),
					Operator(')', 'CloseBracket', ranks[0], 0, null),
					Operator(']', 'CloseArray', ranks[0], 0, null),
				];

			for (var i in soloOps)
			{
				var op = soloOps[i];
				setOperator[op.op] = op;
			}
			for (var i in duoOps)
			{
				var op = duoOps[i];
				setValue[op.op] = op;
			}
		}

		const opGaurdOp = Operator('#', '.GAURD', -1, 1, null);

		function setModifiers()
		{
			opGaurdOp.stackModifier = function (curOp, stackExpr, stackScope)
			{	// + - ~ ! #GAURD
				stackExpr.push(curOp)
				stackScope.curScope = scpOperator;
				return true;
			};

			function soloOpModifierSimple(curOp, stackExpr, stackScope)
			{	// + - ~ ! #GAURD
				var stkOp = stackExpr.cur();
				stkOp.push(curOp);
				stackExpr.push(curOp)
				stackScope.curScope = scpOperator;
				return true;
			}

			function duoOpModifierSimple(curOp, stackExpr, stackScope)
			{	// ** * / % \  + - & | ^  == != > >= > >=  && ||
				var stkOp = stackExpr.cur(), crank = curOp.op.rank;

				while (crank <= stkOp.op.rank)
				{
					stackExpr.pop();
					stkOp = stackExpr.cur();
				}

				stkOp.changeCurrent(curOp);
				stackExpr.push(curOp);
				stackScope.curScope = scpOperator;
				return true;
			}

			const SoloSimples = "+ - ~ !".split(" "), DuoSimples = "** * / % \\  + - & | ^  == != > >= > >=  && ||".split(" ");

			for (var i in SoloSimples)
			{
				var op = SoloSimples[i];
				if (op.length > 0)
					setOperator[op].stackModifier = soloOpModifierSimple;
			}

			for (var i in DuoSimples)
			{
				var op = DuoSimples[i];
				if (op.length > 0)
					setValue[op].stackModifier = duoOpModifierSimple;
			}

			// not supported yet: ? : = ( , ) [ $ ]
		}

		generateOps();
		setModifiers();

		self.parse = function() {
			var opGaurd = opGaurdOp.newExpr(), stackScope = Stack(), stackExpr = Stack(), scanner = this.scanner;
			opGaurd.modifyStacks(stackExpr, stackScope);

			var round = 0;

			while (scanner.next())
			{
				var curScope = stackScope.curScope, str = scanner.tokenString;

				switch (scanner.nextToken) {
					case tkWhiteSpace:
					case tkComment:
						continue;
					case tkOperator: 
						var op = curScope == scpOperator ? setOperator[str] : setValue[str];
						if (op == undefined)
							throw "Invalid Operator: " + str;

						if (!op.stackModifier)
							throw "Not supported operator: " + op;

						if (!op.newExpr().modifyStacks(stackExpr, stackScope))
						{
							// failed!
							return;
						}
						break;
					case tkIdentity:
					case tkNumber:
					case tkString:
						if (curScope != scpOperator)
							throw "Invalid Operator: " + scanner.nextToken;

						var ve = scanner.nextToken == tkIdentity ? VariantExpr(str) : ValueExpr(str), oe = stackExpr.cur();
						if (!oe.push(ve))
						{
							// failed!
							return;
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
						return scanner;
				}
				//console.log(""+opGaurd.parameters[0]);
			}

			if (stackScope.count == 0 && stackScope.curScope == scpValue)
				return opGaurd.parameters[0];
		}

	}

	if (!(this instanceof Parser))
        return new Parser(scanner);

	this.scanner = scanner;
}
