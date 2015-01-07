function Deque()
{
	if (Deque.prototype.push == undefined) {
		var self = Deque.prototype;

		self.push = function(data, toFirst) {
			var item = { 'data': data, 'prev': null, 'next': null, };
			this.count++;
			if (toFirst) {
				if (this.first == null)
				{
					this.first = this.last = item;
					return;
				}

				var first = this.first;
				item.next = first;
				this.first = first.prev = item;
			} else { // toLast
				if (this.last == null)
				{
					this.first = this.last = item;
					return;
				}

				var last = this.last;
				item.prev = last;
				this.last = last.next = item;
			}
		};

		self.pop = function(data, fromFirst) {
			if (this.count == 0)
				return undefined;

			var item = this.first;
			if (--this.count == 0)
			{
				this.clear();
				return item.data;
			}

			if (fromFirst) {
				var first = item.next;
				if (this.first = first)
					first.prev = null;

				if (this.icur == item)
					this.icur = first;
			} else { // fromLast
				item = this.last;
				var last = item.prev;
				if (this.last = last)
					last.next = null;

				if (this.icur == item)
					this.icur = last;
			}
			return item.data;
		};

		self.current = function() {
			return this.icur || this.moveToLast();
		};

		self.cur = function() {
			return this.icur ? this.icur.data : null;
		}

		self.extractCurrent = function(movePrev) {
			var item = this.icur;
			if (item == null)
				return undefined;

			if (--this.count == 0)
			{
				this.clear();
				return item.data;
			}

			var prev = item.prev, next = item.next;
			if (prev)	prev.next = next;
			if (next)	next.prev = prev;

			if (item == this.first)	this.first = next;
			if (item == this.last)	this.last = prev;
			this.icur = movePrev ? prev : next;

			return item.data;
		};

		self.curToPrev = function() {
			var cur = this.icur;
			if (cur == null)
			{
				cur = this.moveToLast();
				return cur ? cur.data : null;
			}

			return cur.prev ? (this.icur = cur.prev).data : null;
		};

		self.curToNext = function() {
			var cur = this.icur;
			if (cur == null)
			{
				cur = this.moveToFirst();
				return cur ? cur.data : null;
			}

			return cur.next ? (this.icur = cur.next).data : null;
		};

		self.moveToFirst = function() {
			return (this.icur = this.first);
		};

		self.moveToLast = function() {
			return (this.icur = this.last);
		};

		self.pop = function() {
			if (this.count == 0)
				return undefined;

			if (--count == 0)
				this.last = this.root;

			var item = this.root.next;
			this.root.next = item.next;
			return item.data;
		};

		self.clear = function() {
			this.first = this.last = this.icur = null;
			this.count = 0;
		};

		self.toString = function() {
			var s = "[ ", c = this.first;
			while (c)
			{
				s += c.data + ", ";
				c = c.next;
			}
			return s + "]";
		}
	};

	if (!(this instanceof Deque))
		return new Deque();

	this.clear();
}

var inputHistory = Deque(), parser = Parser(Scanner()), symbols = SymbolStack(), 
	sepOption = {
			'dec': { 'scale': 'dec', 'width': 3, 'char': ',', 'prefix': '', 'use': false, },
			'hex': { 'scale': 'hex', 'width': 4, 'char': '_', 'prefix': '0x', 'use': false, },
			//'oct': { 'scale': 'oct', 'width': 4, 'char': '_', 'use': false, },
			'bin': { 'scale': 'bin', 'width': 8, 'char': '_', 'prefix': '0b', 'use': true, },
		},
	realOpt = { 'scale': 'real', 'width': 3, 'char': ',', 'prefix': '', 'use': false, },
	intScale = null;

function clearInput()
{
	$("#calcInput").val("");
	$('#calcInput').focus();
}

function clearOutput()
{
	$('#calcResults').text('');
	inputHistory.clear();
	$('#calcInput').focus();
}

function changeIntegerScale(scale)
{
	if (intScale && intScale.scale == scale)
		return;

	intScale = sepOption[scale];
	if (intScale.use)
		$('#IntSep').addClass('down');
	else
		$('#IntSep').removeClass('down');
	$('#IntSeparator').val(intScale.char);
	$('#IntSepWidth').val(intScale.width);

	updateResultUI($('.result.int'));
}

function calc()
{
	var expr = $("#calcInput").val().trim();
	clearInput();
	if(!expr)
		return;

	var curText = inputHistory.cur();
	if (curText && expr == curText)
		inputHistory.extractCurrent();
	inputHistory.push(expr);
	inputHistory.icur = curText = null;

	var txt = $("<li>").append(expr);
	$("#calcResults").append(txt);

	//var tm = Date.now();
	parser.scanner.reset(expr);
	try {
		var r = parser.parse().calc(symbols),
			item = $("<pre>").addClass('result').click(function () {
				var ci = $("#calcInput");
				ci[0].setRangeText( $(this).text().replace(/,/g, '_') );
				ci.focus();
		  	});

		switch (r.type) {
			case vtNumber:
				r = r.value;
				if ( r.isInt() ) {
					var neg = '';
					if (r.isNeg())
					{
						r = r.neg();
						neg = '-';
					}
					item.attr('data-dec', r.toString(10))
						.attr('data-hex', r.toString(16).toUpperCase())
						.attr('data-bin', r.toString(2))
						.attr('data-neg', neg)
						//.attr('data-oct', r.toString(8))
						.addClass('int');
				} else {
					item.addClass('real').attr('data-real', r.toString());
				}
				break;
			case vtString:
				item.addClass('str').text(r.value);
				break;
			case vtFunction:
				item.addClass('str').text("<funtion> "+r.value.dspt);
				break;
			default:
				item.addClass('error').text( 'Not supported type: ' +r.type + ' = (' + r.value + ')' );
		}
		txt.append(item);
		updateResultUI(item);
	}
	catch (e) {
		txt.append( $("<pre>").addClass('result').addClass('error').append(e) );
	}
	//tm = Date.now() - tm;
	//console.log(tm + "ms");

	$("#calcResultsWrapper").scrollTop($("#calcResultsWrapper")[0].scrollHeight);
}

function updateAllResultUI()
{
	updateResultUI($('.result'));
}

function changeIntSeparator()
{
	intScale.use = $('#IntSep').hasClass('down');
	intScale.width = $('#IntSepWidth').val()|0;
	intScale.char = $('#IntSeparator').val();
	updateResultUI($('.result.int'));
}

function changeRealSeparator()
{
	realOpt.use = $('#RealSep').hasClass('down');
	realOpt.width = $('#RealSepWidth').val()|0;
	realOpt.char = $('#RealSeparator').val();
	updateResultUI($('.result.real'));
}

function updateResultUI(jqobj)
{
	var	
		realRef = realOpt.use ? new RegExp('([0-9a-fA-F])(?=([0-9a-fA-F]{' + realOpt.width + '})+\\b)', "g") : null,
		realtos = "$&"+realOpt.char,
		prefix = intScale.prefix, 
		tag = 'data-'+intScale.scale, 
		ref = intScale.use ? new RegExp('([0-9a-fA-F])(?=([0-9a-fA-F]{' + intScale.width + '})+\\b)', "g") : null,
		tos = "$&"+intScale.char;

	prefix = (prefix != '' && intScale.use && intScale.char == '_') ? prefix + '_' : prefix;
	jqobj.each(function() {
		var item = $(this), s = '';

		if (item.hasClass('int')) {
			s = $(this).attr(tag);
			s = $(this).attr('data-neg') + prefix + (ref ? s.replace(ref, tos) : s);
		} else if (item.hasClass('real')) {
			s = $(this).attr('data-real');
			if (realOpt.use)
			{
				var parts = s.split('.');
				parts[0] = parts[0].replace(realRef, realtos);
				parts[1] = parts[1].replace(/(\d{3})/g, realtos);
				s = parts[0] + '.' + parts[1];
			}
		} else
			return;
		item.text(s);
	});
	$('#calcInput').focus();
}

$(function () {
	$('.button[data-button-style="Downable"]').click(function() {
		var btn = $(this);
		if (btn.hasClass('down'))
		{
			btn.removeClass('down');
		} else {
			btn.addClass('down');
		}
	});

	$('#Clear').offset( {
		top: 	$('#calcResultsWrapper').offset().top + 3, 
		left: 	$('#calcResultsWrapper').offset().left + $('#calcResults').outerWidth() - $('#Clear').outerWidth() - 1, 
	});

	$('.button.grouped').click(function() {
		var e = $(this);
		if (e.hasClass('down'))
			return;

		var grp = e.attr('data-group');
		$('*[data-group="'+grp+'"]').removeClass('down');
		e.addClass('down');
		changeIntegerScale(e.attr('data-scale'));
	});

	$('#calcExprBtn').click(calc);

	$('#Clear').click(clearOutput);

	$('#calcInput').keyup(function(e) {
		switch(e.keyCode)
		{
			case 13:
				calc();
				break;
			case 27:
				clearInput();
				break;
			//case 33:  // page up
			case 38:  // up
				var curText = inputHistory.curToPrev();
				if (curText)
					$("#calcInput").val(curText).select();
				break;
			//case 34:  // page down
			case 40:  // down
				var curText = inputHistory.curToNext();
				if (curText)
					$("#calcInput").val(curText).select();
				break;
			default:
				//console.log(e.keyCode);
		}

	});

	$('#IntSep').click(changeIntSeparator);

	$('#IntSeparator,#IntSepWidth').change(function () {
		$('#IntSep').addClass('down');
		changeIntSeparator();
	});

	$('#RealSep').click(changeRealSeparator);

	$('#RealSeparator,#RealSepWidth').change(function () {
		$('#RealSep').addClass('down');
		changeRealSeparator();
	});

	$('#Dec').click();
	$('#calcInput').focus();
});
