%lex

E	([Ee][+-]?[0-9][0-9_]*)

%%

[\s\r\n]+					/* ignore whitespace */

"0"[Bb][01_]+				return 'NUMBER_BINARY';

"0"[Xx][0-9a-fA-F_]+		return 'NUMBER_HEX';

[0-9][0-9_]*"."[0-9_]*{E}?	return 'NUMBER_FLOAT';
[0-9][0-9_]*{E}?			return 'NUMBER_DECIMAL';

[a-zA-Z][a-zA-Z0-9_]*		return 'IDENTITY';

["](\\.|[^\\"])*["]		return 'DQ_STRING';
"'"(\\.|[^\\'])+"'"		return 'SQ_STRING';

"//"	return 'OP_IDIV';
"**"	return 'OP_POW';
"*/"	return 'OP_ROOT';

"=="	return 'OP_REQ';
"!="	return 'OP_RNEQ';
">="	return 'OP_RGE';
"<="	return 'OP_RLE';
">"		return 'OP_RGT';
"<"		return 'OP_RLT';

"&&"	return 'OP_LAND';
"||"	return 'OP_LOR';
"!"		return 'OP_LNOT';

"+"		return 'OP_ADD';
"-"		return 'OP_MIN';
"*"		return 'OP_MUL';
"/"		return 'OP_DIV';
"%"		return 'OP_MOD';

"~"		return 'OP_BNOT';
"&"		return 'OP_BAND';
"|"		return 'OP_BOR';
"^"		return 'OP_BXOR';

"?"		return 'OP_QU';
":"		return 'OP_SC';

"("		return 'OP_LP';
")"		return 'OP_RP';
","		return 'OP_COM';
"="		return 'OP_SET';

"["		return 'OP_LB';
"]"		return 'OP_RB';

<<EOF>>	return 'EOF';
.		return 'UNKNOWN';

%%

/lex

%start expression

%%

expression
	: exprConditional 'EOF'
		{
			return $1;
		}
	| "IDENTITY" "OP_SET" exprConditional 'EOF'
		{
			return {
				func: '$setVariable',
				args: [ $1, $3 ],
			};
		}
	;

exprConditional
	: exprLogical
	| exprLogical "OP_QU" exprConditional "OP_SC" exprConditional
		{
			$$ = {
				func: '$conditional',
				args: [ $1, $3, $5 ],
			};
		}
	;

exprLogical
	: exprRelational
	| exprLogical "OP_LAND" exprRelational
		{
			$$ = {
				func: '$logicAnd',
				args: [ $1, $3 ],
			};
		}
	| exprLogical "OP_LOR" exprRelational
		{
			$$ = {
				func: '$logicOr',
				args: [ $1, $3 ],
			};
		}
	;

exprRelational
	: exprBitwise
	| exprRelational "OP_REQ" exprBitwise
		{
			$$ = {
				func: '$relationEqual',
				args: [ $1, $3 ],
			};
		}
	| exprRelational "OP_RNEQ" exprBitwise
		{
			$$ = {
				func: '$relationNotEqual',
				args: [ $1, $3 ],
			};
		}
	| exprRelational "OP_RGE" exprBitwise
		{
			$$ = {
				func: '$relationGE',
				args: [ $1, $3 ],
			};
		}
	| exprRelational "OP_RLE" exprBitwise
		{
			$$ = {
				func: '$relationLE',
				args: [ $1, $3 ],
			};
		}
	| exprRelational "OP_RGT" exprBitwise
		{
			$$ = {
				func: '$relationGreater',
				args: [ $1, $3 ],
			};
		}
	| exprRelational "OP_RLT" exprBitwise
		{
			$$ = {
				func: '$relationLess',
				args: [ $1, $3 ],
			};
		}
	;

exprBitwise
	: exprAdditive
	| exprBitwise "OP_BAND" exprAdditive
		{
			$$ = {
				func: '$bitAnd',
				args: [ $1, $3 ],
			};
		}
	| exprBitwise "OP_BOR" exprAdditive
		{
			$$ = {
				func: '$bitOr',
				args: [ $1, $3 ],
			};
		}
	| exprBitwise "OP_BXOR" exprAdditive
		{
			$$ = {
				func: '$bitXor',
				args: [ $1, $3 ],
			};
		}
	;

exprAdditive
	: exprMultiplicative
	| exprAdditive "OP_ADD" exprMultiplicative
		{
			$$ = {
				func: '$add',
				args: [ $1, $3 ],
			};
		}
	| exprAdditive "OP_MIN" exprMultiplicative
		{
			$$ = {
				func: '$minus',
				args: [ $1, $3 ],
			};
		}
	;

exprMultiplicative
	: exprExponential
	| exprMultiplicative "OP_MUL" exprExponential
		{
			$$ = {
				func: '$multiply',
				args: [ $1, $3 ],
			};
		}
	| exprMultiplicative "OP_DIV" exprExponential
		{
			$$ = {
				func: '$divide',
				args: [ $1, $3 ],
			};
		}
	| exprMultiplicative "OP_IDIV" exprExponential
		{
			$$ = {
				func: '$intDivide',
				args: [ $1, $3 ],
			};
		}
	| exprMultiplicative "OP_MOD" exprExponential
		{
			$$ = {
				func: '$module',
				args: [ $1, $3 ],
			};
		}
	;

exprExponential
	: exprUnary
	| exprExponential "OP_POW" exprUnary
		{
			$$ = {
				func: '$power',
				args: [ $1, $3 ],
			};
		}
	| exprExponential "OP_ROOT" exprUnary
		{
			$$ = {
				func: '$root',
				args: [ $1, $3 ],
			};
		}
	;

exprUnary
	: exprNumber
	| "OP_LNOT" exprUnary
		{
			$$ = {
				func: '$logicNot',
				args: [ $2 ],
			};
		}
	| "OP_BNOT" exprUnary
		{
			$$ = {
				func: '$bitNot',
				args: [ $2 ],
			};
		}
	| "OP_ADD" exprUnary
		{
			$$ = $2;
		}
	| "OP_MIN" exprUnary
		{
			$$ = {
				func: '$negative',
				args: [ $2 ],
			};
		}
	;

exprNumber
	: exprFunctional
	| "NUMBER_BINARY"
		{
			$$ = {
				func: '$parseBinary',
				args: [ $1 ],
			};
		}
	| "NUMBER_HEX"
		{
			$$ = {
				func: '$parseNumber',
				args: [ $1 ],
			};
		}
	| "NUMBER_DECIMAL"
		{
			$$ = {
				func: '$parseNumber',
				args: [ $1 ],
			};
		}
	| "NUMBER_FLOAT"
		{
			$$ = {
				func: '$parseNumber',
				args: [ $1 ],
			};
		}
	| "SQ_STRING"
		{
			$$ = {
				func: '$parseSQString',
				args: [ $1 ],
			};
		}
	| "DQ_STRING"
		{
			$$ = {
				func: '$parseDQString',
				args: [ $1 ],
			};
		}
	| "IDENTITY"
		{
			$$ = {
				func: '$getVariable',
				args: [ $1 ],
			};
		}
	| "OP_LP" exprConditional "OP_RP"
		{
			$$ = $2;
		}
	;

exprFunctional
	: "IDENTITY" exprArguments
		{
			$$ = {
				func: $1,
				args: $2,
			};
		}
	;

exprArguments
	: "OP_LP" "OP_RP"
		{
			$$ = [];
		}
	| "OP_LP" exprArgumentList "OP_RP"
		{
			$$ = $2;
		}
	;

exprArgumentList
	: exprConditional
		{
			$$ = [ $1 ];
		}
	| exprArgumentList "OP_COM" exprConditional
		{
			$$ = $1.concat($3);
		}
	;

%%

