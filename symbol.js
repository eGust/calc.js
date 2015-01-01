function ValueType(name, isNumber)
{
	if (ValueType.prototype.newId == undefined)
	{
		var vtId = 0, self = ValueType.prototype;
		self.newId = function() {
			return vtId++;
		};

		self.toString = function() {
			return 'ValueType{' + this.id + '}' +this.name;
		};
	}
	if (!(this instanceof ValueType))
        return new ValueType(name, isNumber);

    this.name = name;
	this.id = this.newId();
	this.isNumber = isNumber || false;
}

var
	vtNumber = ValueType('Number', true), vtString = ValueType('String'), vtArray = ValueType('Array'), vtFunction = ValueType('Function'), vtUnit = ValueType('Unit');

function ValueObject(v, t)
{
	if (ValueObject.prototype.isNumber == undefined)
	{
		var self = ValueObject.prototype;

		self.isNumber = function() {
			return this.type == vtNumber;
		};

		self.isString = function() {
			return this.type == vtString;
		};

		self.isArray = function() {
			return this.type == vtArray;
		};

		self.isFunction = function() {
			return this.type == vtFunction;
		};

		self.isUnit = function() {
			return this.type == vtUnit;
		};

		self.toLogic = function() {
			switch (this.type) {
				case vtNumber: 	return !(this.value.isZero() || this.value.isNaN());
				case vtString: 	return (this.value.length > 0);
				case vtArray: 	return (this.value.length > 0);
				default:
					return true;
			}
		};

		self.toString = function() {
			return this.type.name + '{' + this.value + '}';
		};
	}
	if (!(this instanceof ValueObject))
        return new ValueObject(v, t);

    this.value = v;
    this.type = t;
}

function FunctionSymbol(name, fnBody, args, dspt)
{
	var fnVal = {};

	if (typeof(args) == "string")
	{
		var params = args.strip().replace(/,\s+/g, ",").replace(/\s+/g, " ").split(","), types = [];
		for (var i in params)
		{
			var t = params.strip(" ");
			if (t.length)
			{
				params[i] = t[1];
				types[i] = t[0];
			}
		}
	} else
		this.prepare = args;

	fnVal.exec = fnBody;
	fnVal.dspt = dspt || '';
	this.name = name;
	this.value = ValueObject(fnVal, vtFunction);
}

function ValueSymbol(name, value)
{
	this.name = name;
	this.value = value;
}

function SymbolTable()
{
	if (SymbolTable.prototype.get == undefined)
	{
		var self = SymbolTable.prototype;

		self.get = function(name) {
			return (name in this.table ? this.table[name] : null);
		};

		self.put = function(name, obj) {
			this.table[name] = obj;
		};

		self.remove = function(name) {
			if (name in this.table)
			{
				delete this.table[name];
				return true;
			}
			return false;
		};

		SymbolTable.globals = new SymbolTable();
	}

	if (!(this instanceof SymbolTable))
        return new SymbolTable();

    this.table = {};
}

function SymbolStack()
{
	if (SymbolStack.prototype.get == undefined)
	{
		var self = SymbolStack.prototype;

		if (SymbolTable.globals == undefined)
			new SymbolTable();

		self.globals = SymbolTable.globals;

		self.pushTable = function(table) {
			this.tables[this.count++] = this.current = table;
		};

		self.popTable = function() {
			if (this.count)
				return this.current = this.tables[--this.count];
			return null;
		};

		self.get = function(name) {
			var r = this.globals.get(name);
			if (r)
				return r;

			for (var i = this.count-1; i >= 0; i--)
			{
				r = this.tables[i].get(name);
				if (r)
					return r;
			}
			return null;
		};

		self.put = function(name, obj) {
			if (this.globals.get(name))
				return false;
			this.current.put(name, obj);
			return true;
		};

		self.remove = function(name) {
			for (var i = this.count-1; i >= 0; i--)
			{
				if (this.tables[i].remove(name))
					return true;
			}
			return false;
		};
	}

	if (!(this instanceof SymbolStack))
        return new SymbolStack();

    this.tables = [];
    this.count = 0;
    this.pushTable(new SymbolTable());
}

