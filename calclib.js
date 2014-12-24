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

	function bitOps()
	{
		const Hex = '0123456789abcdef';
		var r = { 'NOT': {}, 'AND': null, 'OR': null, 'XOR': null, }, set;
		
		set = r.NOT;
		for (var i in Hex)
		{
			var c = Hex[i], u = c.toUpperCase(), v = 0x0F & ~i;
			set[c] = Hex[v];
			if (u != c)
				set[u] = set[c];
		}
		
		function make(fn)
		{
			var set = {};
			for (var i in Hex)
			{
				var fc = Hex[i], fu = fc.toUpperCase(), d = {};
				for (var j in Hex)
				{
					var c = Hex[j], u = c.toUpperCase(), v = fn(i, j);
					d[c] = Hex[v];
					if (u != c)
						d[u] = d[c];
				}
				set[fc] = d;
				if (fu != fc)
					set[fu] = d;
			}
			return set;
		}

		r.AND	= make(function(a, b) { return a & b; });
		r.OR	= make(function(a, b) { return a | b; });
		r.XOR	= make(function(a, b) { return a ^ b; });

		return r;
	}

	const
		hexBitOps = bitOps(), 
		//Zeros = '0000000000000000',  // '0'*16 64-bit
		Zeros = '00000000000000000000000000000000',  // '0'*32 128-bit
		//Zeros = '0000000000000000000000000000000000000000000000000000000000000000',  // '0'*64 256-bit
		MAX_LEN = Zeros.length;

	function getHolders()
	{
		var len = 2, r = { pos: [], neg: [], hcount: [] };
		while (len <= MAX_LEN)
		{
			r.neg.push(new Decimal('-1' + Zeros.substr(0, len-1), 16));
			r.pos.push(new Decimal('1' + Zeros.substr(0, len), 16).minus(Decimal.ONE));
			r.hcount.push(len);
			len *= 2;
		}
		return r;
	}

	const bitHolders = getHolders();

	function getHexCountIndex(v)
	{
		if (!v.isInt())
			throw "Not an Integer: " + v;

		if (v.isNeg())
		{
			for (var i in bitHolders.neg)
			{
				if (v.gte(bitHolders.neg[i]))
					return i;
			}
			throw "Out of range: " + v;
		}
		// pos
		for (var i in bitHolders.pos)
		{
			if (v.lt(bitHolders.pos[i]))
				return i;
		}
		throw "Out of range: " + v;
	}

	function extandHex(v, idx)
	{
		var hs = v.isNeg() ? v.plus(bitHolders.pos[idx]).toString(16) : v.toString(16);
		return Zeros.substr(0, bitHolders.hcount[idx] - hs.length) + hs;
	}

	r.negate = function(v1) { return v1.neg(); };	// -
	r.bitNot = function(v1) { // ~
		var h1 = extandHex(v1, getHexCountIndex(v1)), hr = '';
		for (var i in h1)
			hr = hr + hexBitOps.NOT[h1[i]];
		return new Decimal(hr, 16); 
	};
	r.logicNot = function(v1) { return v1.isZero() || v1.isNaN() ? Decimal.ONE : Decimal.ZERO ; };	// !

	function checkZero(v)
	{
		if (v.isZero())
			throw "Can not divide by 0.";
	}

	r.power = function(v1, v2) { return v1.pow(v2); };	// **
	r.multiply = function(v1, v2) { return v1.times(v2); };	// *
	r.divide = function(v1, v2) { checkZero(v2); return v1.div(v2); };	// /
	r.modulo = function(v1, v2) { checkZero(v2); return v1.modulo(v2); };	// %
	r.intDivide = function(v1, v2) { checkZero(v2); return v1.divToInt(v2); };	// //
	r.add = function(v1, v2) { return v1.plus(v2); };	// +
	r.sub = function(v1, v2) { return v1.minus(v2); };	// -

	function bitCalc(v1, v2, map)
	{
		var idx = Math.max(getHexCountIndex(v1), getHexCountIndex(v2)), 
			h1 = extandHex(v1, idx), h2 = extandHex(v2, idx), hr = '';

		for (var i in h1)
			hr = hr + map[h1[i]][h2[i]];
		return new Decimal(hr, 16); 
	}

	r.bitAnd	= function(v1, v2) { return bitCalc(v1, v2, hexBitOps.AND); }; // &
	r.bitOr		= function(v1, v2) { return bitCalc(v1, v2, hexBitOps.OR);  }; // |
	r.bitXor	= function(v1, v2) { return bitCalc(v1, v2, hexBitOps.XOR); }; // ^

	r.isEqual = function(v1, v2) { return v1.eq(v2) ? Decimal.ONE : Decimal.ZERO; };	// ==
	r.notEqual = function(v1, v2) { return v1.eq(v2) ? Decimal.ZERO : Decimal.ONE; };	// !=
	r.isGreater = function(v1, v2) { return v1.gt(v2) ? Decimal.ONE : Decimal.ZERO; };	// >
	r.isGreaterEqual = function(v1, v2) { return v1.gte(v2) ? Decimal.ONE : Decimal.ZERO; };	// >=
	r.isLess = function(v1, v2) { return v1.lt(v2) ? Decimal.ONE : Decimal.ZERO; };	// <
	r.isLessEqual = function(v1, v2) { return v1.lte(v2) ? Decimal.ONE : Decimal.ZERO; };	// <=

	r.logicAnd	= function(a1, a2, sbt) { var v1 = a1.calc(sbt); return v1.isZero() || v1.isNaN() ? Decimal.ZERO	: a2.calc(sbt);	};	// &&
	r.logicOr	= function(a1, a2, sbt) { var v1 = a1.calc(sbt); return v1.isZero() || v1.isNaN() ? a2.calc(sbt)	: Decimal.ONE;	};	// ||

	return r;
}

const CalcLib = getCalculatorLibrary();
