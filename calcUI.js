var parser = Parser(Scanner()), defaultSymbols = SymbolStack();

function clearInput()
{
	$("#calcInput").val("");
	$('#calcInput').focus();
}

function clearOutput()
{
	$('#calcResults').text('');
	inputHistory.clear();
	saveHistory(inputHistory);
	$('#calcInput').focus();
}

function saveHistory(dq)
{
	var d = {}, list = dq.recentItems(MAX_HISTORY_ITEMS, function(e) {
			var expr = e.expr;
			if (e.type == 'error' || expr in d)
				return true;
			d[expr] = e;
			return false;
		});
	saveHistoryList(list);
}

function changeIntegerScale(scale)
{
	if ((intScale && intScale.scale == scale) || !(scale in intOptions))
		return;

	intScale = intOptions[scale];
	if (intScale.use)
		$('#IntSep').addClass('down');
	else
		$('#IntSep').removeClass('down');
	$('#IntSeparator').val(intScale.char);
	$('#IntSepWidth').val(intScale.width);

	updateResultUI($('.result.int'));
}

function updateObject(dest, src)
{
	for (var k in src)
	{
		dest[k] = src[k];
	}
	return dest;
}

function doCalcExpr(expr, symbols)
{
	var result = { 'expr': expr, 'time': Date.now() };
	parser.scanner.reset(expr);
	try {
		var r = parser.parse();
		result.assign = r.assign;

		r = r.calc(symbols);
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

					return updateObject(result, {
							'type': 'int',
							'value': {
								'dec': r.toString(10),
								'hex': r.toString(16).toUpperCase(),
								'bin': r.toString(2),
								'neg': neg,
							},
						});
				}
				return updateObject(result, {
						'type': 'real',
						'value': r.toString(),
					});
			case vtString:
				return updateObject(result, {
						'type': 'str',
						'value': r.value,
					});
			case vtFunction:
				return updateObject(result, {
						'type': 'str',
						'value': "<funtion> "+r.value.dspt,
					});
			default:
				throw 'Not supported type: ' +r.type + ' = (' + r.value + ')';
		}
	}
	catch (e) {
		return updateObject(result, {
				'type': 'error',
				'value': e,
			});
	}
}

function getDOMFromResult(result)
{
	var t = result.type, val = result.value, e = $('<span>').text(result.expr),
		r = $("<li>").append("<br>").append( e ).attr('data-time', result.time),
		item = $("<pre>").addClass('result').addClass(t)
		.click(function () {
			var ci = $("#calcInput");
			ci[0].setRangeText( $(this).text().replace(/,/g, '_') );
			ci.focus();
	  	});

	$(e).click(function(e) {
		if (e.clientX <= 40) {
			// delete icon
			var li = $(this).parent(), time = li.attr('data-time');
			li.remove();

			inputHistory.icur = null;
			var cur = null;
			while (cur = inputHistory.curToPrev())
			{
				if (cur.time == time)
				{
					inputHistory.extractCurrent();
					saveHistory(inputHistory);
					$("#calcInput").focus();
					break;
				}
			}
		}
	});

	switch (t) {
		case 'int':
			for (var k in val)
			{
				item.attr('data-'+k, val[k]);
			}
			break;
		case 'real':
			item.attr('data-real', val);
			break;
		default:
			item.text(val);
	}
	r.append(item);
	return r;
}

function loadOptions()
{
	var scale = 'dec';
	try {
		var options = myStg.get(['intOpt', 'realOpt', 'intScale', 'MAX_HISTORY_ITEMS']);
		if (options.MAX_HISTORY_ITEMS)
			MAX_HISTORY_ITEMS = options.MAX_HISTORY_ITEMS;
		
		if (options.intOpt)
		{
			intOptions = options.intOpt;
		}

		if (options.realOpt)
		{
			if (options.realOpt.use)
				$('#RealSep').addClass('down');
			$('#RealSepWidth').val(options.realOpt.width);
			$('#RealSeparator').val(options.realOpt.char);
			changeRealSeparator();
		}

		if (options.intScale)
		{
			scale = options.intScale;
		}

		intScale = null;
		$('.button.grouped[data-group="styles"]').removeClass('down');
		$('.button.grouped[data-scale="'+scale+'"]').addClass('down');
	} catch (e) { }
	finally {
		changeIntegerScale( scale );
	}
}

function loadHistory()
{
	var tm = Date.now();
	$("#calcResults").html('');
	try {
		var his = myStg.get('history');
		if (!his)
			return;

		for (var i = 0; i < his.length; i++) {
			var r = his[i], rdom = getDOMFromResult(r);
			if (r.assign)
				doCalcExpr(r.expr, defaultSymbols);
			$("#calcResults").append(rdom);
			inputHistory.push(r);
		}
	} catch (e) { }
	finally {
		updateAllResultUI();
		inputHistory.icur = null;
		$("#calcResultsWrapper").scrollTop($("#calcResultsWrapper")[0].scrollHeight);
		console.log((Date.now() - tm) + " ms");
	}
}

function calc()
{
	var expr = $("#calcInput").val().trim();
	clearInput();
	if(!expr)
		return;

	var curHistory = inputHistory.cur();
	if (curHistory && expr == curHistory.expr)
		inputHistory.extractCurrent();

	var r = doCalcExpr(expr, defaultSymbols), rdom = getDOMFromResult(r);

	$("#calcResults").append(rdom);
	updateResultUI($('.result', rdom));
	inputHistory.push(r);
	inputHistory.icur = null;
	$("#calcResultsWrapper").scrollTop($("#calcResultsWrapper")[0].scrollHeight);

	saveHistory(inputHistory);
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

function doRefresh() {
	loadOptions();
	loadHistory();
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

	function groupedAction(e) {
		if (e.hasClass('down'))
			return false;
		
		var grp = e.attr('data-group');
		$('*[data-group="'+grp+'"]').removeClass('down');
		e.addClass('down');
		return true;
	}

	$('.button.grouped').click(function() {
		if ( !groupedAction($(this)) )
			return;
		changeIntegerScale( $(this).attr('data-scale') );
		saveIntScale();
	});

	$('#calcForm').submit(function (e) {
		e.preventDefault();
		calc();
	});

	$('#Clear').click(clearOutput)
		.offset( {
			top: 	$('#calcResultsWrapper').offset().top + 3, 
			left: 	$('#calcResultsWrapper').offset().left + $('#calcResults').outerWidth() - $('#Clear').outerWidth() - 1, 
		});

	$('#calcInput').keyup(function(e) {
		switch(e.keyCode)
		{
			case 27:
				clearInput();
				break;
			//case 33:  // page up
			case 38:  // up
				var curText = inputHistory.curToPrev();
				if (curText)
					$("#calcInput").val(curText.expr).select();
				break;
			//case 34:  // page down
			case 40:  // down
				var curText = inputHistory.curToNext();
				if (curText)
					$("#calcInput").val(curText.expr).select();
				break;
			default:
				//console.log(e.keyCode);
		}

	});

	$('#IntSep').click(function () {
		changeIntSeparator();
		saveIntOption();
	});

	$('#IntSeparator,#IntSepWidth').change(function () {
		$('#IntSep').addClass('down');
		changeIntSeparator();
		saveIntOption();
	});

	$('#RealSep').click(function () {
		changeRealSeparator();
		saveRealOption();
	});

	$('#RealSeparator,#RealSepWidth').change(function () {
		$('#RealSep').addClass('down');
		changeRealSeparator();
		saveRealOption();
	});

	$('.button.grouped[data-scale="dec"]').addClass('down');
	changeIntegerScale( 'dec' );

	doRefresh();
});
