function Token(name)
{
	if (Token.prototype.newTokenId === undefined)
	{
		var tokenId = 0, self = Token.prototype;
		self.newTokenId = function() {
			return tokenId++;
		}

		self.toString = function() {
			return 'Token{' + this.id + '}' +this.name;
		}
	}
	if (!(this instanceof Token))
        return new Token(name);

    this.name = name;
	this.id = this.newTokenId();
}

const
	tkWhiteSpace = Token('*BLANK'), tkComment = Token('*COMMENT'), tkScope = Token('Scope'),
	tkOperator = Token('Operator'), tkKeyword = Token('Keyword'), tkIdentity = Token('Identity'), tkNumber = Token('Number'), tkString = Token('String'),
	tkInvalidInput = Token('InvalidInput'), tkInvalidString = Token('InvalidString'), tkInvalidNumber = Token('InvalidNumber'),
	tkInvalidHex = Token('InvalidHex'), tkInvalidOctal = Token('InvalidOctal'), tkInvalidBin = Token('InvalidBin');

function Scanner(str) {
	if (this.reset === undefined) {
		self = Scanner.prototype;
		const keywords = {};

		self.reset = function(str) {
			str = str || this.text || "";
			this.lastToken = null;
			this.nextToken = null;
			this.tokenString = null;
			this.text = str;
			this.index = 0;
			this.from = 0;
			this.count = str.length;
		};

		var scanners = {};
		self.next = function() {
			var context = this;
			if (context.index >= context.count)
				return false;

			context.lastToken = context.nextToken;
			var c = context.text[context.from = context.index];
			if (c in scanners)
				scanners[c](context);
			else
				scanInvalid(context);

			var ts = (context.nextToken !== tkComment && context.nextToken !== tkWhiteSpace) ?
				 context.text.substring(context.from, context.index) : null;
			context.tokenString = ts;
			if ( context.nextToken === tkIdentity && ts in keywords )
				context.nextToken = keywords[ts];
			return true;
		}

		function scanInvalid(context)
		{
			while (++context.index < context.count && !(context.text[context.index] in scanners))
				/* escape */;
			context.nextToken = tkInvalidInput;
		}

		const WhiteSpaces = { ' ': ' ', '\t': '\t', '\n': '\n', '\r': '\r', };
		function scanWhiteSpace(context)	// ' ', '\r', '\t', '\n'
		{
			while (++context.index < context.count && context.text[context.index] in WhiteSpaces)
				/* escape */;
			context.nextToken = tkWhiteSpace;
		}

		function scanComment(context) // # #{
		{
			if (context.index < context.count && context.text[context.index+1] === '{') {
				++context.index;
				while (++context.index < context.count) {
					var c = context.text[context.index];
					if (c === ':') {
						context.nextToken = tkScope;
						++context.index;
						return;
					}
					if (!( (c>='a' && c<='z') || (c>='A' && c<='Z') || (c>='0' && c<='9') || c === '_' ))
						break;
				}
			}

			context.nextToken = tkComment;
			while (++context.index < context.count && context.text[context.index] !== '\n')
				/* escape */;
		}

		function scanOnlyOp(context) // + - % ( ) [ ] { } ~ ^ ? : , @
		{
			context.index++;
			context.nextToken = tkOperator;
		}

		function scanDupOp(context)	// * **, / //, | ||, & &&, > >=, = ==, ! !=, < <=
		{
			var c1 = context.text[context.index];
			context.nextToken = tkOperator;
			if (++context.index >= context.count)
				return;

			var c2 = context.text[context.index];
			switch (c1) {
				case '*':
					if (c2 === c1 || c2 === '/')
						++context.index;
					break;
				case '/':
				case '|':
				case '&':
					if (c2 === c1)
						++context.index;
					break;
				case '>':
					if (c2 === '=' || c2 === '>')
						++context.index;
					break;
				case '<':
					if (c2 === '=' || c2 === '<')
						++context.index;
					break;
				case '=':
				case '!':
					if (c2 === '=')
						++context.index;
					break;
			}
		}

		function doScanIdentityChars(context)
		{
			while (++context.index < context.count)
			{
				var c = context.text[context.index];
				if ((c>='a' && c<='z') || (c>='A' && c<='Z') || (c>='0' && c<='9') || c === '_')
					continue;
				break;
			}
		}

		function scanIdentity(context) // a-z, A-Z, _
		{
			doScanIdentityChars(context);
			context.nextToken = tkIdentity;
		}

		function scanString(context) // ' "
		{
			var quote = context.text[context.index];
			while (++context.index < context.count)
			{
				var c = context.text[context.index];
				if (c === '\\')
				{
					if (++context.index > context.count)
					{
						context.nextToken = tkInvalid;
						return;
					}
				} else if (c === quote)
				{
					++context.index;
					context.nextToken = tkString;
					return;
				}
			}
			context.nextToken = tkInvalidString;
		}

		function doScanNumberSubset(context, valid, r, checker)
		{
			while (++context.index < context.count)
			{
				var c = context.text[context.index];
				if ( !((c>='a' && c<='z') || (c>='A' && c<='Z') || (c>='0' && c<='9') || c === '_') )
					break;

				if ( c === '_' )
					continue;

				if (!(c in valid))
				{ // invalid
					if (checker)
					{
						r = checker(context);
						if (r)
							return true;
					}
					doScanIdentityChars(context);
					return false;
				}
				r = true;
			}
			return r;
		}

		const
			ValidBinChars = { '0': 0, '1': 1, },
			//ValidOctChars = { '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, },
			ValidDecChars = { '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, },
			ValidHexChars = {
				'0': 0x00, '1': 0x01, '2': 0x02, '3': 0x03, '4': 0x04, '5': 0x05, '6': 0x06, '7': 0x07, '8': 0x08, '9': 0x09,
				'a': 0x0a, 'b': 0x0b, 'c': 0x0c, 'd': 0x0d, 'e': 0x0e, 'f': 0x0f,
				'A': 0x0A, 'B': 0x0B, 'C': 0x0C, 'D': 0x0D, 'E': 0x0E, 'F': 0x0F,
			};

		function checkEPart(context)
		{
			var c = context.text[context.index];
			return (c === 'e' || c === 'E');
		}


		function doScanNumberExpPart(context)
		{
			context.nextToken = tkInvalidNumber;
			if (context.index+1 >= context.count)
				return;

			switch (context.text[context.index+1]) {
				case '+':
				case '-':
					if (++context.index + 1 >= context.count)
						return;
					break;
			}

			context.nextToken = doScanNumberSubset(context, ValidDecChars, false) ? tkNumber : tkInvalidNumber;
		}

		function doScanNumberFloatPart(context, r)
		{
			if (!doScanNumberSubset(context, ValidDecChars, r, checkEPart))
			{
				context.nextToken = tkInvalidNumber;
				return;
			}

			context.nextToken = tkNumber;
			if (context.index >= context.count)
				return;

			switch (context.text[context.index]) {
				case 'e':
				case 'E':
					doScanNumberExpPart(context);
					break;
			}
		}

		function scanDot(context)	// .
		{
			context.nextToken = tkOperator;
			if ( ++context.index >= context.count || !(context.text[context.index] in ValidDecChars) )
				return;

			context.index--;
			doScanNumberFloatPart(context, false);
		}

		function scanDigit_0(context) // 0
		{
			if (++context.index >= context.count)
			{
				context.nextToken = tkNumber;
				return;
			}

			var r, e, c = context.text[context.index];
			switch (c) {
				case '.':
					doScanNumberFloatPart(context, true);
					return;
				case 'E':
				case 'e':
					doScanNumberExpPart(context);
					return;
				case 'b':
				case 'B':
					r = doScanNumberSubset(context, ValidBinChars, false);
					e = tkInvalidBin;
					break;
				case 'x':
				case 'X':
					r = doScanNumberSubset(context, ValidHexChars, false);
					e = tkInvalidHex;
					break;
				default:
					context.index--;
					r = doScanNumberSubset(context, ValidDecChars, true);
					e = tkInvalidNumber;
			}
			context.nextToken = r ? tkNumber : e;
		}

		function scanDigit_1to9(context) // 1-9
		{
			context.nextToken = tkNumber;
			if (!doScanNumberSubset(context, ValidDecChars, true, checkEPart))
			{
				context.nextToken = tkInvalidNumber;
				return;
			}

			if (context.index >= context.count)
				return;

			switch (context.text[context.index]) {
				case 'e':
				case 'E':
					doScanNumberExpPart(context);
					break;
				case '.':
					doScanNumberFloatPart(context, true);
					break;
			}
		}

		function assignConst()
		{
			const
				ValidChars = "\n\r\t (+-*/%)[|&^~!]<=>{?:,.@}#\'\"0123456789_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
			var vcs = {};
			for (var i = 0; i < ValidChars.length; i++)
			{
				var c = ValidChars[i];
				vcs[c] = c;
			}

			function assignSetScanners(set, fn)
			{
				for (var i in set)
					scanners[set[i]] = fn;
			}

			function assignRangeScanners(rf, rt, fn)
			{
				var f = rf.charCodeAt(0), t = rt.charCodeAt(0);
				for (var c = f; c <= t; c++)
					scanners[String.fromCharCode(c)] = fn;
			}
			// assign scanners
			assignSetScanners(WhiteSpaces, scanWhiteSpace);
			assignSetScanners('+-%()[]{}~^?:,@', scanOnlyOp);
			assignSetScanners('*/|&>=!<', scanDupOp);

			assignRangeScanners('a', 'z', scanIdentity);
			assignRangeScanners('A', 'Z', scanIdentity);
			assignRangeScanners('1', '9', scanDigit_1to9);

			scanners['_'] = scanIdentity;
			scanners['#'] = scanComment;
			scanners['"'] = scanString;
			scanners["'"] = scanString;
			scanners['.'] = scanDot;
			scanners['0'] = scanDigit_0;

			self.HexDigits = ValidHexChars;
		}

		assignConst();
	}

	if (!(this instanceof Scanner))
        return new Scanner(str);

	this.text = str;
	this.reset();
}
