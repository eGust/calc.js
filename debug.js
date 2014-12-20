//* debug

// lexer
s = new Scanner('0b_1100 + 0xABC**7.8//4e5');
function n()
{
	if (!s.next())
		return false;
	//console.log(c);
	return s.nextToken +": ["+ s.tokenString + ']';
}

function tl(str)
{
	var r = 0;
	s.reset(str);
	while (true) {
		var t = n();
		if (!t)
			break;
		console.log(t);
		r++;
	}
	return r;
}

// parser

function tp(str)
{
	var scn = Scanner(str), p = Parser(scn);
	return p.parse();
}

//*/
