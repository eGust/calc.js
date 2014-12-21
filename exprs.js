/*
[classes]
	Expression:
		int paramCount
		Expression[] parameters
		Value calc(VariantDictionary symbols)

	ValueExpr(Expression):
		Value	value
		func calc(symbols) => value

	OperatorExpr(Expression):
		Operator	op
		func calc(symbols) => args = map(param.calc(symbols)), return op.calc(args)
	
  todo:
	FunctionExpr(Expression):
	ArrayExpr(Expression):
	UnitExpr(Expression):
*/

function ValueExpr(str) {
	if (ValueExpr.prototype.calc == undefined) {
		var self = ValueExpr.prototype;

		self.calc = function() {
			return this.value;
		};

		self.toString = function() {
			return "ValueExpr(" + this.value.toString() + ")";
		};
	}

	if (!(this instanceof ValueExpr))
        return new ValueExpr(str);

    this.value = CalcLib.stringToValue(str);
    this.paramCount = 0;
    this.parameters = null;
}

function VariantExpr(str) {
	if (VariantExpr.prototype.calc == undefined) {
		var self = VariantExpr.prototype;

		self.calc = function(symbols) {
			var symbol = symbols[this.vname];
			if (symbol == undefined)
				throw 'Can not find symbol: "' + this.vname + '"';
			return symbol.getValue();
		};

		self.toString = function() {
			return "VariantExpr(" + this.vname + ")";
		};
	}

	if (!(this instanceof VariantExpr))
        return new VariantExpr(str);

    this.vname = str;
    this.paramCount = 0;
    this.parameters = null;
}

function OperatorExpr(op) {
	if (OperatorExpr.prototype.calc == undefined) {
		var self = OperatorExpr.prototype;

		self.calc = function(symbols) {
			/*
			var args = new Array(this.paramCount);
			for (var i = 0; i < args.length; i++)
				args[i] = this.parameters[i].calc(true);

			//return this.op.calc(args, symbols);
			var r = this.op.calc(this.parameters, symbols);

			if (!symbols)
			{
				console.log(this+"")
				for (var i = 0; i < args.length; i++)
					console.log("  " + args[i]);
				console.log(" = " + r);
			}

			return r;
			/*/
			var fnCalc = this.op.calc;
			if (fnCalc)
				return fnCalc(this.parameters, symbols);
			
			throw "Not supported calculation of: " + this.op;
			// */
		};

		self.push = function(ve) {
			var pcnt = this.paramCount;
			if (pcnt >= 0 && this.index >= pcnt)
				return false;

			this.parameters[this.index++] = ve;
			return this.index;
		};

		self.changeCurrentParameter = function(oe) {
			if (this.index == 0)
				return false;
			var i = this.index-1, ve = this.parameters[i];
			if (!oe.push(ve))
				return false;
			this.parameters[i] = oe;
			return ve;
		}

		self.modifyStacks = function(stackExpr, stackScope) {
			return this.op.stackModifier(this, stackExpr, stackScope);
		};

		self.toString = function() {
			var r = "OperatorExpr: " + this.op;
			for (var i in this.parameters)
			{
				var lines = ("" + this.parameters[i]).split("\n");
				for (var j in lines)
					r += "\n\t" + lines[j];
				//
			}
			return r;
		};
	}

	if (!(this instanceof OperatorExpr))
        return new OperatorExpr(op);

    this.op = op;
    this.paramCount = op.operand;
    if (this.paramCount == 0)
    	this.parameters = null;
    else if (this.paramCount > 0)
    	this.parameters = new Array(this.paramCount);
    else
    	this.parameters = [];
    this.index = 0;
}
