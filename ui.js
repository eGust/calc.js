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

var inputHistory = Deque(), parser = Parser(Scanner()), symbols = SymbolTable();

function clearInput()
{
	$("#calcInput").val("");
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

	var txt = $("<li>").append(expr).append("<br>");
	$("#calcResults").append(txt);

	var tm = Date.now();
	parser.scanner.reset(expr);
	try {
		var r = parser.parse().calc(symbols);
		txt.append( $("<span>").addClass('result').append("" + r).click(function () {
			$("#calcInput").val($(this).text()).focus().select();
		}) );
	}
	catch (e) {
		txt.append( $("<span>").addClass('exp').append(e) );
	}
	tm = Date.now() - tm;
	console.log(tm + "ms");

	$("#calcResultsWrapper").scrollTop($("#calcResultsWrapper")[0].scrollHeight);
}

$(function () {
	$('#calcInput').focus();

	$('#calcExprBtn').click(calc);

	$('#ReadMe').click(function() {
		$('.readme').toggle();
	});

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
});
