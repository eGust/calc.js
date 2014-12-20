function SymbolTable()
{
	if (SymbolTable.prototype.newSymbol = undefined)
	{
		function Symbol(name, type, table) {
			if (Symbol.prototype.getValue = undefined)
			{
				var self = Symbol.prototype;
				self.getValue = function() { };
			}

			if (!(this instanceof Symbol))
		        return new Symbol(name, type, table);

		    this.name = name;
		    this.type = type;
		    this.table = table;
		}

		var self = SymbolTable.prototype;

		self.newSymbol = function(name, type) {
			if (name in this.table)
				return null;
			return this.table[name] = Symbol(name, type, this);
		};

		self.get = function(name) {
			return this.table[name];
		}

		self.remove = function(name) {
			return delete this.table[name];
		}
	}

	if (!(this instanceof SymbolTable))
        return new SymbolTable();

    this.table = {};
}
