//* debug

// lexer
function Tester() {
	scanner = Scanner();
	function calc(expr) {
		scanner.reset(expr);
		console.log('expr: "'+ expr + '"');
		var r = parse(scanner);
		console.log(r);
		console.log(r.calc()+'');
	};

	this.runTest = function (idx) {
		if (!idx) {
			for (var i in Tester.testExprs) {
				doTest(i);
			}
		} else
			doTest(idx);
	};

	function doTest(idx) {
		var test = Tester.testExprs[idx], expr = test.expr, comment = test.comment, tm = Date.now();
		console.log('[test '+idx+']\t', comment, tm);
		calc(expr);
	}
}

Tester.testExprs = [
	{ expr: '9+8-2*3', comment: 'basic 11', },
	{ expr: '64/2**(10 // 3)', comment: 'power intDiv', },
	{ expr: '~0b_0101_0101', comment: 'bitWise not', },
	{ expr: '0b_0101_0101 & 0b_1010_1010 ^ 0b_1100_0011 | 0b_0001_1000', comment: 'bitWise and/or/xor', },
	{ expr: '2>=1 && 1==3', comment: 'logical compare', },
	{ expr: '1 >= 2 ? 10 : 20', comment: 'quest compare', },
	{ expr: '1 ? 2 ? 3 : 4 : 5 ? 6 : 7', comment: 'quest 2', },
	{ expr: '1 ? 2 ? 3 : 4 : 5 ? 6 : 7', comment: 'quest 2', },
];

var test = new Tester();

//*/
