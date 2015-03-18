function initDecimal()
{
	Decimal.config({
		precision: 45,
		toExpNeg: -12,
		toExpPos: 40,
	});
	Decimal.ZERO = new Decimal("0");
	Decimal.TWO = new Decimal("2");
	//Decimal.prototype.isString = function() { return false; };
	Decimal.ValueOne = ValueObject(Decimal.ONE, vtNumber);
	Decimal.ValueZero = ValueObject(Decimal.ZERO, vtNumber);
	Decimal.PI = new Decimal("3.14159265358979323846264338327950288419716939937510");
	Decimal.PI_2 = Decimal.PI.times(Decimal.TWO);
	Decimal.E = new Decimal( "2.71828182845904523536028747135266249775724709369996");
						  //2.71828182845904523536028 7471352662497757247093699 9595749669676277240766303 5354759457138217852516642 742746
}

initDecimal();

function getCalculatorLibrary() {
	var r = {};

	r.parseNumber = function (str) {
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

		return ValueObject(new Decimal(buffer, base), vtNumber);
	};

	r.parseString = function (str) {
		var s = "", len = str.length-1;
		for (var i = 1; i < len; i++) {
			var c = str[i];
			if (c === '\\')
			{
				var c1 = str[++i];
				switch (c1) {
					case "'":
						c = "'"; break;
					default:
						c += c1;
				}
			} else if (c === '"') {
				c = '\\"';
			}
			s += c;
		}

		return ValueObject(JSON.parse('"' + s + '"'), vtString);
	};

	/*	= JSON.stringify
	r.encodeEscapeString = function (str) {
		var s = "'";
		for (var i in str) {
			var c = str[i];
			switch (c) {
				case '\b':	c = '\\b'; break;
				case '\t':	c = '\\t'; break;
				case '\n':	c = '\\n'; break;
				case '\r':	c = '\\r'; break;
				case '\f':	c = '\\f'; break;
				case "'":	c = "\\'"; break;
				case '\\':	c = '\\\\'; break;
			}
			s += c;
		}
		return s+"'";
	};
	*/

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

	function extendHex(v, idx)
	{
		var hs = v.isNeg() ? v.plus(bitHolders.pos[idx]).plus(Decimal.ONE).toString(16) : v.toString(16);
		return Zeros.substr(0, bitHolders.hcount[idx] - hs.length) + hs;
	}

	function checkArgsDecimal()
	{
		for (var i = 0; i < arguments.length; i++)
		{
			if (!arguments[i].isNumber())
				throw "Not a number: " + arguments[i];
		}
	}

	function checkArgsString()
	{
		for (var i = 0; i < arguments.length; i++)
		{
			if (!arguments[i].isString())
				throw "Not a string: " + arguments[i];
		}
	}

	r.negate = function(v1) { checkArgsDecimal(v1); return ValueObject(v1.value.neg(), vtNumber); };	// -
	r.bitNot = function(v1) { // ~
		checkArgsDecimal(v1);
		var h1 = extendHex(v1.value, getHexCountIndex(v1.value)), hr = '';
		for (var i in h1)
			hr = hr + hexBitOps.NOT[h1[i]];
		return ValueObject(new Decimal(hr, 16), vtNumber); 
	};
	r.logicNot = function(v1) { checkArgsDecimal(v1); return v1.toLogic() ? Decimal.ValueZero : Decimal.ValueOne; };	// !

	function checkZero(v)
	{
		if (v.value.isZero())
			throw "Can not divide by 0.";
	}

	r.power = function(v1, v2) { checkArgsDecimal(v1, v2); return ValueObject(v1.value.pow(v2.value), vtNumber); };	// **
	r.multiply = function(v1, v2) { checkArgsDecimal(v1, v2); return ValueObject(v1.value.times(v2.value), vtNumber); };	// *
	r.divide = function(v1, v2) { checkArgsDecimal(v1, v2); checkZero(v2); return ValueObject(v1.value.div(v2.value), vtNumber); };	// /
	r.modulo = function(v1, v2) { checkArgsDecimal(v1, v2); checkZero(v2); return ValueObject(v1.value.modulo(v2.value), vtNumber); };	// %
	r.intDivide = function(v1, v2) { checkArgsDecimal(v1, v2); checkZero(v2); return ValueObject(v1.value.divToInt(v2.value), vtNumber); };	// //
	r.sub = function(v1, v2) { checkArgsDecimal(v1, v2); return ValueObject(v1.value.minus(v2.value), vtNumber); };	// -
	r.add = function(v1, v2) {	// +
			if (v1.isNumber() )
			{
				if ( v2.isNumber() )
					return ValueObject(v1.value.plus(v2.value), vtNumber);
				if ( v2.isString() )
					return ValueObject(v1.value + v2.value, vtString);
			}
			if ( v1.isString() && (v2.isString() || v2.isNumber()) )
				return ValueObject(v1.value + v2.value, vtString);
			throw "Invalid + operation: " + v1 + " and " + v2;
		};

	function bitCalc(v1, v2, map)
	{
		checkArgsDecimal(v1, v2); 
		var idx = Math.max(getHexCountIndex(v1.value), getHexCountIndex(v2.value)), 
			h1 = extendHex(v1.value, idx), h2 = extendHex(v2.value, idx), hr = '';

		for (var i in h1)
			hr = hr + map[h1[i]][h2[i]];
		return ValueObject(new Decimal(hr, 16), vtNumber); 
	};

	r.bitAnd	= function(v1, v2) { checkArgsDecimal(v1, v2); return bitCalc(v1, v2, hexBitOps.AND); }; // &
	r.bitOr		= function(v1, v2) { checkArgsDecimal(v1, v2); return bitCalc(v1, v2, hexBitOps.OR);  }; // |
	r.bitXor	= function(v1, v2) { checkArgsDecimal(v1, v2); return bitCalc(v1, v2, hexBitOps.XOR); }; // ^

	r.isEqual = function(v1, v2) { checkArgsDecimal(v1, v2); return v1.value.eq(v2.value) ? Decimal.ValueOne : Decimal.ValueZero; };	// ==
	r.notEqual = function(v1, v2) { checkArgsDecimal(v1, v2); return v1.value.eq(v2.value) ? Decimal.ValueZero : Decimal.ValueOne; };	// !=
	r.isGreater = function(v1, v2) { checkArgsDecimal(v1, v2); return v1.value.gt(v2.value) ? Decimal.ValueOne : Decimal.ValueZero; };	// >
	r.isGreaterEqual = function(v1, v2) { checkArgsDecimal(v1, v2); return v1.value.gte(v2.value) ? Decimal.ValueOne : Decimal.ValueZero; };	// >=
	r.isLess = function(v1, v2) { checkArgsDecimal(v1, v2); return v1.value.lt(v2.value) ? Decimal.ValueOne : Decimal.ValueZero; };	// <
	r.isLessEqual = function(v1, v2) { checkArgsDecimal(v1, v2); return v1.value.lte(v2.value) ? Decimal.ValueOne : Decimal.ValueZero; };	// <=

	r.logicAnd	= function(a1, a2, sbt) { var v1 = a1.calc(sbt); return v1.toLogic() ? a2.calc(sbt) : Decimal.ValueZero;	};	// &&
	r.logicOr	= function(a1, a2, sbt) { var v1 = a1.calc(sbt); return v1.toLogic() ? v1 : a2.calc(sbt);	};	// ||

	r.quest = function(v1, a1, a2, sbt) { return v1.toLogic() ? a1.calc(sbt) : a2.calc(sbt); };
	r.assign = function(a1, v2, sbt) {
		if (a1.type != etIdentity)
			throw a1 + " is not an Identity.";
		if ( !sbt.put(a1.vname, v2) )
			throw a1 + " is not a valid identity.";
		return v2;
	};

	r.callFunction = function(params, sbt) {
		if (params.length == 0)
			throw "No function found!";

		var fn = params[0].calc(sbt);
		if ( !fn.isFunction() )
			throw Fn + " is not a function!";

		fn = fn.value;
		var args = new Array(params.length - 1), pcnt = fn.paramCount;
		for (var i = 0; i < args.length; i++)
			args[i] = params[i+1].calc(sbt);

		if (pcnt >= 0 && args.length != fn.paramCount)
			throw "Not matched arguments: " + fn.paramCount + "excepted, but given " + args.length;

		return fn.exec.apply(fn, args);
	};

	// functions
	r.abs = function(v1) { checkArgsDecimal(v1); return ValueObject(v1.value.abs(), vtNumber); };

	r.ln = function(v1) { checkArgsDecimal(v1); return ValueObject(Decimal.ln(v1.value), vtNumber); };
	r.log10 = function(v1) { checkArgsDecimal(v1); return ValueObject(Decimal.log(v1.value), vtNumber); };
	r.log2 = function(v1) { checkArgsDecimal(v1); return ValueObject(Decimal.log(v1.value, Decimal.TWO), vtNumber); };
	r.log = function(v1, v2) { checkArgsDecimal(v1, v2); return ValueObject(Decimal.log(v1.value, v2.value), vtNumber); };

	r.len = function(v1) {
		if (v1.isString())
			return ValueObject(new Decimal(v1.value.length), vtNumber); 
		if (v1.isNumber())
			return ValueObject(new Decimal(v1.value.toString(10).length), vtNumber); 
	};

	const PI_2 = Math.PI / 2;

	r.sin = function(v1) {
		checkArgsDecimal(v1);
		var v = Math.sin(v1.value.mod(Decimal.PI_2).toNumber());
		if (Math.abs(v) < 1e-15)
			v = 0;
		return ValueObject(new Decimal(v+""), vtNumber);
	};

	r.cos = function(v1) {
		checkArgsDecimal(v1);
		var v = Math.cos(v1.value.mod(Decimal.PI_2).toNumber());
		return ValueObject(new Decimal(v+""), vtNumber);
	};

	r.tan = function(v1) {
		checkArgsDecimal(v1);
		var v = Math.tan(v1.value.mod(Decimal.PI).toNumber());
		return ValueObject(new Decimal(v+""), vtNumber);
	};

	r.ctan = function(v1) {
		checkArgsDecimal(v1);
		var v = Math.tan(v1.value.mod(Decimal.PI).toNumber());
		return ValueObject(new Decimal(1/v+""), vtNumber);
	};

	r.ord = function(v1) {
		checkArgsString(v1);
		if (v1.length == 0)
			throw "Can not use ord function on an empty string.";
		return ValueObject(new Decimal(v1.value.charCodeAt(0)), vtNumber);
	};

	r.ord = function(v1) {
		checkArgsString(v1);
		if (v1.length == 0)
			throw "Can not use ord function on an empty string.";
		return ValueObject(new Decimal(v1.value.charCodeAt(0)), vtNumber);
	};

	r.chr = function(v1) {
		checkArgsDecimal(v1);
		var v = v1.value;
		if ((!v.isInt()) || v.lte(Decimal.ZERO))
			throw v + " is not in valid char code range.";
		return ValueObject(String.fromCharCode(v.toNumber()), vtString);
	};

	r.signed = function(v1) {
		checkArgsDecimal(v1);
		if (v1.value.isNeg())
			return v1;
		var h1 = extendHex(v1.value, getHexCountIndex(v1.value.minus(Decimal.ONE))), hr = '';
		switch (h1[0]) {
			case '8': case '9': 
			case 'A': case 'B': case 'C': 
			case 'D': case 'E': case 'F':
			case 'a': case 'b': case 'c': 
			case 'd': case 'e': case 'f':
				for (var i in h1)
					hr = hr + hexBitOps.NOT[h1[i]];
				return ValueObject((new Decimal(hr, 16)).plus(Decimal.ONE).neg(), vtNumber); 
			default:
				return v1; 
		}
	};

	r.unsigned = function(v1) {
		checkArgsDecimal(v1);
		if (v1.value.isNeg()) {
			var h1 = extendHex(v1.value, getHexCountIndex(v1.value));
			return ValueObject((new Decimal(h1, 16)), vtNumber); 
		}
		return v1;
	};

	return r;
}

const CalcLib = getCalculatorLibrary();

function registerGlobalSymbols()
{
	if (SymbolTable.globals == undefined)
		new SymbolTable();
	const gs = SymbolTable.globals,
		log10 = ValueObject({
				exec: CalcLib.log10,
				paramCount: 1,
				dspt: 'Log function based on 10',
			}, vtFunction),
		log2 = ValueObject({
				exec: CalcLib.log2,
				paramCount: 1,
				dspt: 'Log function based on 2',
			}, vtFunction),
		log = ValueObject({
				exec: CalcLib.log,
				paramCount: 2,
				dspt: 'log(number, base): Log function based on <base>',
			}, vtFunction),
		tg = ValueObject({
				exec: CalcLib.tan,
				paramCount: 1,
				dspt: 'Tangent',
			}, vtFunction),
		ctg = ValueObject({
				exec: CalcLib.ctg,
				paramCount: 1,
				dspt: 'Co-Tangent',
			}, vtFunction);

	gs.put("PI", ValueObject(Decimal.PI, vtNumber));
	gs.put("E",  ValueObject(Decimal.E, vtNumber));
	
	gs.put('abs', ValueObject({
			exec: CalcLib.abs,
			paramCount: 1,
			dspt: 'Absolute value.',
		}, vtFunction));

	gs.put('ln', ValueObject({
			exec: CalcLib.ln,
			paramCount: 1,
			dspt: 'Log function based on E',
		}, vtFunction));

	gs.put('lg', log10);
	gs.put('lg10', log10);
	gs.put('log10', log10);
	gs.put('lg2', log2);
	gs.put('log2', log2);
	gs.put('log', log);

	gs.put('len', ValueObject({
				exec: CalcLib.len,
				paramCount: 1,
				dspt: 'Length of string or number (converted to string)',
			}, vtFunction));
	gs.put('sin', ValueObject({
				exec: CalcLib.sin,
				paramCount: 1,
				dspt: 'Sin(x)',
			}, vtFunction));
	gs.put('cos', ValueObject({
				exec: CalcLib.cos,
				paramCount: 1,
				dspt: 'Cos(x)',
			}, vtFunction));
	gs.put('tan', tg);
	gs.put('tg', tg);
	gs.put('ctan', ctg);
	gs.put('ctg', ctg);

	gs.put('ord', ValueObject({
				exec: CalcLib.ord,
				paramCount: 1,
				dspt: 'ord(string), get the code of first char of the input string',
			}, vtFunction));
	gs.put('chr', ValueObject({
				exec: CalcLib.chr,
				paramCount: 1,
				dspt: 'chr(int), code to char',
			}, vtFunction));

	gs.put('signed', ValueObject({
				exec: CalcLib.signed,
				paramCount: 1,
				dspt: 'signed(int), convert to signed',
			}, vtFunction));
	gs.put('unsigned', ValueObject({
				exec: CalcLib.unsigned,
				paramCount: 1,
				dspt: 'unsigned(int), convert to unsigned',
			}, vtFunction));
}

registerGlobalSymbols();
