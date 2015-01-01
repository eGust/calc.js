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
	ArrayExpr(Expression):
*/

function ExprType(name)
{
	if (ExprType.prototype.newId == undefined)
	{
		var etId = 0, self = ExprType.prototype;
		self.newId = function() {
			return etId++;
		}

		self.toString = function() {
			return 'ExprType{' + this.id + '}' +this.name;
		}
	}
	if (!(this instanceof ExprType))
        return new ExprType(name);

    this.name = name;
	this.id = this.newId();
}

const
	etValue = ExprType('Value'), etIdentity = ExprType('Identity'), etOperator = ExprType('Operator'), etArray = ExprType('Array');

function ValueExpr(str, isNumber) {
	if (ValueExpr.prototype.calc == undefined) {
		var self = ValueExpr.prototype;

		self.calc = function() {
			return this.value;
		};

		self.toString = function() {
			return "ValueExpr(" + this.value.toString() + ")";
		};

		self.type = etValue;
	}

	if (!(this instanceof ValueExpr))
        return new ValueExpr(str, isNumber);

    this.value = isNumber ? CalcLib.parseNumber(str) : CalcLib.parseString(str);
    this.paramCount = 0;
    this.parameters = null;
}

function IdentityExpr(str) {
	if (IdentityExpr.prototype.calc == undefined) {
		var self = IdentityExpr.prototype;

		self.calc = function(symbols) {
			var valObj = symbols.get(this.vname);
			if (valObj)
				return valObj;
			throw 'Can not find symbol: "' + this.vname + '"';
		};

		self.toString = function() {
			return "IdentityExpr(" + this.vname + ")";
		};

		self.type = etIdentity;
	}

	if (!(this instanceof IdentityExpr))
        return new IdentityExpr(str);

    this.vname = str;
    this.paramCount = 0;
    this.parameters = null;
}

function OperatorExpr(op) {
	if (OperatorExpr.prototype.calc == undefined) {
		var self = OperatorExpr.prototype;

		self.calc = function(symbols) {
			var fnCalc = this.op.calc;
			if (fnCalc)
				return fnCalc(this.parameters, symbols);
			
			throw "Not supported calculation of: " + this.op;
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

		self.type = etOperator;
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
