var lastInput = '', parser = Parser(Scanner()), symbols = SymbolTable();

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

	var txt = $("<li>").append(lastInput = expr).append("<br>");
	$("#calcResults").append(txt);

	var tm = Date.now();
	parser.scanner.reset(expr);
	try {
		var r = parser.parse().calc(symbols);
		txt.append( $("<span>").addClass('result').append("" + r).click(function () {
			$("#calcInput").val($(this).text()).focus();
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
			case 38:
				$("#calcInput").val(lastInput);
				break;
		}

	});
});
