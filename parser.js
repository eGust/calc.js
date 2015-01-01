/*
[dependency]
	decimal.js
	
	lexer.js
	exprs.js
	symbol.js
	calclib.js

[classes]
	Stack

	Scope

	Operator
*/

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
	scpQuery = Scope('Query'), scpBracket = Scope('Bracket'), scpArray = Scope('Array');

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

		self.cur = function() {
			if (this.count == 0)
				return undefined;
			return this.items[this.count-1];
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

		function generateOps() {
			const
				soloOps = [
					Operator('+', 'Positive', 45, 1, function(args, sbt) { return args[0].calc(sbt); }),
					Operator('-', 'Negative', 45, 1, function(args, sbt) { return CalcLib.negate(args[0].calc(sbt)); }),
					Operator('~', 'BitNot', 43, 1, function(args, sbt) { return CalcLib.bitNot(args[0].calc(sbt)); }),
					Operator('!', 'LogicNot', 41, 1, function(args, sbt) { return CalcLib.logicNot(args[0].calc(sbt)); }),

					Operator('(', 'OpenBracket', 1, 1, function(args, sbt) { return args[0].calc(sbt); }),
					Operator('[', 'OpenArray', 1, -1, function(args, sbt) { return CalcLib.arrayValue(args, sbt); }),
				],
				duoOps = [
					Operator('(', 'OpenFunction', 81, -1, null /* not real op holder */ ),
					Operator('[', 'OpenDerefArray', 81, -1, null /* not real op holder */ ),
					Operator('.', 'Property', 81, 2, function(args, sbt) { return CalcLib.property(args[0], args[1], sbt); }),

					Operator('**', 'Power', 47, 2, function(args, sbt) { return CalcLib.power(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('*', 'Times', 46, 2, function(args, sbt) { return CalcLib.multiply(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('/', 'Divide', 46, 2, function(args, sbt) { return CalcLib.divide(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('%', 'Modulo', 46, 2, function(args, sbt) { return CalcLib.modulo(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('//', 'IntDivide', 46, 2, function(args, sbt) { return CalcLib.intDivide(args[0].calc(sbt), args[1].calc(sbt)); }),

					Operator('+', 'Plus', 45, 2, function(args, sbt) { return CalcLib.add(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('-', 'Minus', 45, 2, function(args, sbt) { return CalcLib.sub(args[0].calc(sbt), args[1].calc(sbt)); }),
					//Operator('<<', 'ShiftLeft', 44, 2, function(args, sbt) { return CalcLib.shl(args[0].calc(sbt), args[1].calc(sbt)); }),
					//Operator('>>', 'ShiftRight', 44, 2, function(args, sbt) { return CalcLib.shr(args[0].calc(sbt), args[1].calc(sbt)); }),
					//Operator('>>>', 'ZeroShiftRight', 44, 2, function(args, sbt) { return CalcLib.sar(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('&', 'BitAnd', 43, 2, function(args, sbt) { return CalcLib.bitAnd(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('|', 'BitOr', 43, 2, function(args, sbt) { return CalcLib.bitOr(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('^', 'BitXor', 43, 2, function(args, sbt) { return CalcLib.bitXor(args[0].calc(sbt), args[1].calc(sbt)); }),

					Operator('==', 'CompareEqual', 42, 2, function(args, sbt) { return CalcLib.isEqual(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('!=', 'CompareNotEqual', 42, 2, function(args, sbt) { return CalcLib.notEqual(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('>', 'CompareGreater', 42, 2, function(args, sbt) { return CalcLib.isGreater(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('>=', 'CompareGreaterEqual', 42, 2, function(args, sbt) { return CalcLib.isGreaterEqual(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('<', 'CompareLess', 42, 2, function(args, sbt) { return CalcLib.isLess(args[0].calc(sbt), args[1].calc(sbt)); }),
					Operator('<=', 'CompareLessEqual', 42, 2, function(args, sbt) { return CalcLib.isLessEqual(args[0].calc(sbt), args[1].calc(sbt)); }),

					Operator('&&', 'LogicAnd', 41, 2, function(args, sbt) { return CalcLib.logicAnd(args[0], args[1], sbt); }),
					Operator('||', 'LogicOr', 41, 2, function(args, sbt) { return CalcLib.logicOr(args[0], args[1], sbt); }),

					Operator('?', 'Query', 30, 3, null /* not real op holder */),
					Operator(':', 'Colon', 30, 0, null),

					Operator('@', 'Unit', 20, 2, function(args, sbt) { return CalcLib.setUnit(args[0], args[1], sbt); }),
					Operator('=', 'Assign', 10, 2, function(args, sbt) { return CalcLib.assign(args[0], args[1].calc(sbt), sbt); }),

					Operator(')', 'CloseBracket', 1, 0, null),
					Operator(']', 'CloseArray', 1, 0, null),
					Operator(',', 'Comma', 1, 0, null),
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

		const	opGaurdOp = Operator('#', '.GAURD', -1, 1, null),
				opQuest = Operator('?:', 'Quest', 30, 3, function(args, sbt) { return CalcLib.quest(args[0].calc(sbt), args[1], args[2], sbt); }),
				opFunction = Operator('(', 'OpenFunction', 1, -1, CalcLib.callFunction ),
				opDerefArray = Operator('[', 'OpenDerefArray', 1, -1, CalcLib.derefArray );

		function setModifiers()
		{
			opGaurdOp.stackModifier = function (curOp, stackExpr, stackScope)
			{	// #GAURD
				stackExpr.push(curOp)
				stackScope.curScope = scpOperator;
				return true;
			};

			function soloOpModifierSimple(curOp, stackExpr, stackScope)
			{	// + - ~ !
				var stkOp = stackExpr.cur();
				stkOp.push(curOp);
				stackExpr.push(curOp);
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

				stkOp.changeCurrentParameter(curOp);
				stackExpr.push(curOp);
				stackScope.curScope = scpOperator;
				return true;
			}

			const SoloSimples = "+ - ~ !".split(" "), DuoSimples = "** * / % //  + - & | ^  == != > >= > >=  && ||".split(" ");

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

			function getOpenerAsValueStackModifier(scp)
			{
				return function (curOp, stackExpr, stackScope)
				{	// ( [	Bracket Array
					var stkOp = stackExpr.cur();
					stkOp.push(curOp);
					stackExpr.push(curOp);
					stackScope.push(scp);
					stackScope.curScope = scpOperator;
					return true;
				};
			};

			setOperator['('].stackModifier = getOpenerAsValueStackModifier(scpBracket);
			setOperator['['].stackModifier = getOpenerAsValueStackModifier(scpArray);

			function getOpenerAsOperatorStackModifier(scp, realOp)
			{
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
			};

			setValue['('].stackModifier = getOpenerAsOperatorStackModifier(scpBracket, opFunction);
			setValue['['].stackModifier = getOpenerAsOperatorStackModifier(scpArray, opDerefArray);

			function getCloserStackModifier(scp, opstr)
			{
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
			};

			setValue[')'].stackModifier = getCloserStackModifier(scpBracket, '(');
			setValue[']'].stackModifier = getCloserStackModifier(scpArray, '[');

			setValue[','].stackModifier = function (curOp, stackExpr, stackScope) {	// ,
				var scp = stackScope.cur();
				if (scp != scpArray && scp != scpBracket)
					throw 'Comma "," not in any opened bracket range.';

				var stkOp = stackExpr.cur(), crank = curOp.op.rank;
				while (stkOp.op.rank != crank )
				{
					stackExpr.pop();
					stkOp = stackExpr.cur();
				}

				var curOp = stkOp.op;
				if ( curOp.op != '[' && curOp != opFunction )
					throw 'Invalid position of ",".';

				stackScope.curScope = scpOperator;
				return true;
			};

			setValue['?'].stackModifier = function (curOp, stackExpr, stackScope) {	// ?
				var stkOp = stackExpr.cur(), crank = curOp.op.rank;

				while (crank < stkOp.op.rank)
				{
					stackExpr.pop();
					stkOp = stackExpr.cur();
				}

				stkOp.changeCurrentParameter(curOp);
				stackExpr.push(curOp);
				stackScope.push(scpQuery);
				stackScope.curScope = scpOperator;
				return true;
			}

			setValue[':'].stackModifier = function (curOp, stackExpr, stackScope) {	// :
				var scp = stackScope.cur();
				if (scp != scpQuery)
					throw 'Colon ":" not in a question "?" expression.';

				var stkOp = stackExpr.cur();

				while (stkOp.op.op != '?')
				{
					stackExpr.pop();
					stkOp = stackExpr.cur();
				}

				stkOp.op = opQuest;
				stackScope.pop();
				stackScope.curScope = scpOperator;
				return true;
			}

			setValue['='].stackModifier = function (curOp, stackExpr, stackScope)
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
				return true;
			}

			/*
			todo:
				@
			*/
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

						var ve = scanner.nextToken == tkIdentity ? IdentityExpr(str) : ValueExpr(str, scanner.nextToken == tkNumber), oe = stackExpr.cur();
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

			if (stackScope.count > 0)
			{
				/*
				if (stackScope.cur() == scpQuery)
				{
					stackScope.pop();
				} else
				*/
					throw stackScope.count + ' of open operatorer(s) like "?", "(", "[" not be closed!';
			}

			if (stackScope.curScope != scpValue)
				throw 'The expression is not completed!';

			return opGaurd.parameters[0];
		}

	}

	if (!(this instanceof Parser))
        return new Parser(scanner);

	this.scanner = scanner;
}
