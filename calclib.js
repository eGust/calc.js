Decimal.ZERO = new Decimal(0);

function getCalculatorLibrary() {
	var r = {};

	r.stringToValue = function (str) {
		var buffer = "", base = 10, start = 0;

		if (str[0] == '0' && str.length > 1)
		{
			switch (str[1]) {
				case 'b':
				case 'B':
					start = 2;
					base = 2;
					break;
				case 'x':
				case 'X':
					start = 2;
					base = 16;
					break;
				case '.':
				case 'E':
				case 'e':
					break;
				default:
					start = 1;
					base = 8;
			}
		}

		for (var i = start; i < str.length; i++)
		{
			var c = str[i];
			if (c == '_')
				continue;

			if (c >= 'a' && c <='z')
				c = c.toUpperCase();
			buffer = buffer + c;
		}

		return new Decimal(buffer, base);
	};

	r.negate = function(v1) { return v1.neg(); };	// -
	//r.bitNot = function(v1) { return v1; };	// ~
	r.logicNot = function(v1) { return v1.eq(Decimal.ZERO) || v1.isNaN ? Decimal.ONE : Decimal.ZERO ; };	// !

	r.power = function(v1, v2) { return v1.pow(v2); };	// **
	r.multiply = function(v1, v2) { return v1.times(v2); };	// *
	r.divide = function(v1, v2) { return v1.div(v2); };	// /
	r.modulo = function(v1, v2) { return v1.modulo(v2); };	// %
	r.intDivide = function(v1, v2) { return v1.divToInt(v2); };	// //
	r.add = function(v1, v2) { return v1.plus(v2); };	// +
	r.sub = function(v1, v2) { return v1.minus(v2); };	// -

	//r.bitAnd = function(v1, v2) { return v1.pow(v2); };	// &
	//r.bitOr = function(v1, v2) { return v1.pow(v2); };	// |
	//r.bitXor = function(v1, v2) { return v1.pow(v2); };	// ^

	r.isEqual = function(v1, v2) { return v1.eq(v2) ? Decimal.ONE : Decimal.ZERO; };	// ==
	r.notEqual = function(v1, v2) { return v1.eq(v2) ? Decimal.ZERO : Decimal.ONE; };	// !=
	r.isGreater = function(v1, v2) { return v1.gt(v2) ? Decimal.ONE : Decimal.ZERO; };	// >
	r.isGreaterEqual = function(v1, v2) { return v1.gte(v2) ? Decimal.ONE : Decimal.ZERO; };	// >=
	r.isLess = function(v1, v2) { return v1.lt(v2) ? Decimal.ONE : Decimal.ZERO; };	// <
	r.isLessEqual = function(v1, v2) { return v1.lte(v2) ? Decimal.ONE : Decimal.ZERO; };	// <=

	r.logicAnd	= function(a1, a2, sbt) { var v1 = a1.calc(sbt); return v1.eq(Decimal.ZERO) || v1.isNaN ? Decimal.ZERO	: a2.calc(sbt);	};	// &&
	r.logicOr	= function(a1, a2, sbt) { var v1 = a1.calc(sbt); return v1.eq(Decimal.ZERO) || v1.isNaN ? a2.calc(sbt)	: Decimal.ONE;	};	// ||

	return r;
}

const CalcLib = getCalculatorLibrary();
