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
		};

		self.recentItems = function(cnt, fnIgnore) {
			var r = [], cur = this.last;
			while (cur && r.length < cnt) {
				var e = cur.data;
				if ( !(fnIgnore && fnIgnore(e)) )
					r.push(e);
				cur = cur.prev;
			}
			return r.reverse();
		};
	};

	if (!(this instanceof Deque))
		return new Deque();

	this.clear();
}

function MyStorage(prefix) {
	if (MyStorage.prototype.get == undefined) {
		var self = MyStorage.prototype;

		function getItem(p, k) {
			var r = localStorage.getItem(p.str+k);
			return r ? JSON.parse(r) : null;
		}

		function setItem(p, k, v) {
			localStorage.setItem(p.str+k, JSON.stringify(v));
		}

		function removeItem(p, k) {
			localStorage.removeItem(p.str+k);
		}

		function getKeys(p, index) {
			function hasPrefix(s) {
				return s.slice(0, p.len) == p.str;
			}

			if (index == undefined)
			{
				var count = localStorage.length, r = [];
				for (var i = 0, idx = 0; i < count; i++)
				{
					var k = localStorage.key(i);
					if (hasPrefix(k))
					{
						r[idx++] = k.slice(p.len);
					}
				}
				return r;
			}

			var count = localStorage.length;
			for (var i = 0, idx = 0; i < count; i++)
			{
				var k = localStorage.key(i);
				if (hasPrefix(k) && idx++ == index)
				{
					return k.slice(p.len);
				}
			}
			return null;
		}

		self.get = function (keys, singleAsDict) {
			var r = {};
			if ( typeof(keys) == "string" ) {
				var v = getItem(this.prefix, keys);
				if (!singleAsDict)
					return v;
				r[keys] = v;
			} else if ( keys instanceof Array || keys instanceof Object) {
				for (var i in keys)
				{
					var k = keys[i];
					r[k] = getItem(this.prefix, k);
				}
			}
			return r;
		};

		self.set = function (keys, values) {
			if ( typeof(keys) == "string" ) {
				r[keys] = setItem(this.prefix, keys, values);
			} else if ( keys instanceof Array && values instanceof Array && keys.length == values.length) {
				for (var i in keys)
				{
					setItem(this.prefix, keys[i], values[i]);
				}
			} else if (keys instanceof Object && values == undefined) {
				for (var k in keys)
				{
					setItem(this.prefix, k, keys[k]);
				}
			}
		};

		self.clear = function() {
			this.remove(this.keys());
		};

		self.remove = function (keys) {
			if ( typeof(keys) == "string" ) {
				removeItem(this.prefix, keys);
			} else if ( keys instanceof Array || keys instanceof Object) {
				for (var i in keys)
				{
					removeItem(this.prefix, keys[i]);
				}
			}
		};

		self.keys = function(index) {
			return getKeys(this.prefix, index);
		};

		self.length = function() {
			return this.keys().length;
		};

		self.getAll = function() {
			return this.get(this.keys());
		}
	}

	if (!(this instanceof MyStorage))
		return new MyStorage(prefix);

	this.prefix = { 'str': prefix, 'len': prefix.length};
}

var inputHistory = Deque(), myStg = MyStorage('prfx:ecalculator@eGust.stg/'),
	intOptions = {
			'dec': { 'scale': 'dec', 'width': 3, 'char': ',', 'prefix': '', 'use': false, },
			'hex': { 'scale': 'hex', 'width': 4, 'char': '_', 'prefix': '0x', 'use': false, },
			//'oct': { 'scale': 'oct', 'width': 4, 'char': '_', 'use': false, },
			'bin': { 'scale': 'bin', 'width': 8, 'char': '_', 'prefix': '0b', 'use': true, },
		},
	realOpt = { 'scale': 'real', 'width': 3, 'char': ',', 'prefix': '', 'use': false, },
	intScale = null, 
	MAX_HISTORY_ITEMS = 99,
	notation = 'infix'
	;

function saveIntScale()
{
	try {
		myStg.set({
			'intScale': intScale.scale,
		});
	} catch (e) {}
}

function saveIntOption()
{
	try {
		myStg.set({
			'intOpt': intOptions,
		});
	} catch (e) {}
}

function saveRealOption()
{
	try {
		myStg.set({
			'realOpt': realOpt,
		});
	} catch (e) {}
}

function saveMaxCount()
{
	try {
		myStg.set({
			'MAX_HISTORY_ITEMS': MAX_HISTORY_ITEMS,
		});
	} catch (e) {}
}

function saveHistoryList(historyList)
{
	try {
		myStg.set({
			'history': historyList,
		});
	} catch (e) {}
}
