var scanner = Scanner(), defaultSymbols = SymbolStack();

function setInputingText(text)
{
	if (!text)
		text = '';
	if ($("#calcInput").val() == text )
		return;
	$("#calcInput").val(text).select().change();
}

function clearInput()
{
	setInputingText('');
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
	scanner.reset(expr);
	try {
		var r = parse(scanner);
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
	var t = result.type, val = result.value, div = $('<div class="result-item">'), e = $('<span>').appendTo(div).text(result.expr),
		r = $("<li>").append( div ).attr('data-time', result.time),
		item = $("<pre>").addClass('result').addClass(t).appendTo(div);
		/*
		item
		.click(function () {
			var sel = getSelection();
			if (sel.toString())
				return;
			var range = document.createRange();
			range.selectNode(this);
			sel.addRange(range);
		})
		.dblclick(function () {
			var ci = $("#calcInput");
			ci[0].setRangeText( $(this).text().replace(/,/g, '_') );
			ci.change().focus();
	  	});
	*/

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
	return r;
}

function loadOptions()
{
	var scale = 'dec';
	try {
		var options = myStg.getAll();
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

		if (options.notation) {
			notation = options.notation;
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

function loadInputing()
{
	try {
		var text  = myStg.get('inputting');
		if (!text)
			return;
		$('#calcInput').val(text).select();
	} catch (e) { }
	finally {
		//
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
		realRef0 = realOpt.use ? new RegExp('([0-9a-fA-F])(?=([0-9a-fA-F]{' + realOpt.width + '})+\\b)', "g") : null,
		realRef1 = realOpt.use ? new RegExp('(\\d{' + realOpt.width + '})(?=\\d)', "g") : null,
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
				parts[0] = parts[0].replace(realRef0, realtos);
				parts[1] = parts[1].replace(realRef1, realtos);
				s = parts[0] + '.' + parts[1];
			}
		} else
			return;
		item.text(s);
	});
	$('#calcInput').focus();
}

function updateUI() {
	setTimeout(function () {
		loadInputing();
		loadOptions();
		loadHistory();
		var ci = $('#calcInput'), attrs = NotationDOMAttrs[notation];
		for (var key in attrs) {
			ci.attr(key, attrs[key]);
		}
		ci.focus();
	}, 10);
}

var
	INSERT_NOTATIONS = {
		'infix':	{ org: '#{IN:...}' },
		'postfix':	{ org: '#{RPN:...}' },
	};

function insertNotation(k) {
	var ins = INSERT_NOTATIONS[k], calcInput = $('#calcInput'), ci = calcInput[0], offset = ci.selectionStart + ins.cursor;
	if (!ci.setRangeText) {
		alert('Insert notation does not support IE');
		return;
	}
	ci.setRangeText(ins.text);
	calcInput.focus();
	ci.setSelectionRange(offset, offset);
}

function setupEvents() {
	for (var k in INSERT_NOTATIONS) {
		var v = INSERT_NOTATIONS[k], orgs = v.org.split('...');
		v.text = orgs.join('');
		v.size = v.text.length;
		v.cursor = orgs[0].length;
	}

	$(document)
		.on('click.downable.button', '.downable.button', function() {
			$(this).toggleClass('down');
		})
		.on('click.IntSeparator', '#IntSep', function() {
			changeIntSeparator();
			saveIntOption();
		})
		.on('click.RealSeparator', '#RealSep', function() {
			changeRealSeparator();
			saveRealOption();
		})
		.on('click.menu', '', function() {
			$('#btnInsert').removeClass('open');
			$('#menuInsert').hide();
		})
		.on('click.menu', '#btnInsert', function(e) {
			$('#btnInsert').toggleClass('open');
			$('#menuInsert').toggle();
			e.stopImmediatePropagation();
		})
		.on('click.menu.item', '.ins-menu-item', function(e) {
			//console.log($(this).attr('data-insert'));
			insertNotation($(this).attr('data-insert'));
		})
		.on('click', '.result-item>*', function () {
			var sel = getSelection();
			if (sel.toString())
				return;
			var range = document.createRange();
			range.selectNodeContents(this);
			sel.addRange(range);
		})
		.on('dblclick', '.result-item>*', function () {
			var je = $(this);
			if (je.hasClass('error'))
				return;

			var ci = $("#calcInput"), str = je.text();
			if (je.hasClass('str')) {
				str = JSON.stringify(str);
			} else if (je.hasClass('real') || je.hasClass('int')) {
				str = str.replace(/,/g, '_');
			}
			ci[0].setRangeText( str );
			ci.change().focus();
	  	})
	  	.on('mouseenter.side-buttons', '#calcResults>li', function () {
	  		$('#sideButtons').appendTo($(this));
	  	})
	  	;
}

$(function () {
	setupEvents();

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

	$('#calcResultsWrapper').mouseleave(function () {
		$('#sideButtons').appendTo($('#fireUpdateUI'));
	});

	$('#Clear').click(clearOutput);

	$('#btnRemove').click(function () {
		var li = $(this).parents('li'), time = li.attr('data-time');
		$('#sideButtons').appendTo($('#fireUpdateUI'));
		li.remove();

		inputHistory.icur = null;
		var cur = null;
		while (cur = inputHistory.curToPrev()) {
			if (cur.time == time)
			{
				inputHistory.extractCurrent();
				saveHistory(inputHistory);
				$("#calcInput").focus();
				break;
			}
		}
	});

	$('#btnSelect').click(function () {
		var li = $(this).parents('li'), sel = getSelection(), range;
		sel.removeAllRanges();

		range = document.createRange();
		range.selectNodeContents(li.find('.result-item')[0]);
		sel.addRange(range);
	});

	$('#calcInput').keydown(function(e) {
		var handled = true;
		if (e.ctrlKey || e.metaKey) {
			switch (e.keyCode) {
				case 73: // I
					insertNotation('infix');
					break;
				case 82: // R
					insertNotation('postfix');
					break;
				default:
					handled = false;
			}
		} else
		switch(e.keyCode) {
			case 27:
				clearInput();
				break;
			//case 33:  // page up
			case 38:  // up
				var curText = inputHistory.curToPrev();
				if (curText)
					setInputingText(curText.expr);
				break;
			//case 34:  // page down
			case 40:  // down
				var curText = inputHistory.curToNext();
				if (curText)
					setInputingText(curText.expr);
				break;
			default:
				//console.log(e.keyCode);
				handled = false;
		}

		if (handled) {
			e.preventDefault();
			e.stopImmediatePropagation();
		}
	});

	$('#calcInput').change(function () {
		myStg.set({ 'inputting': $('#calcInput').val(), });
	})

	$('#IntSeparator,#IntSepWidth').change(function () {
		$('#IntSep').addClass('down');
		changeIntSeparator();
		saveIntOption();
	});

	$('#RealSeparator,#RealSepWidth').change(function () {
		$('#RealSep').addClass('down');
		changeRealSeparator();
		saveRealOption();
	});

	$('.button.grouped[data-scale="dec"]').addClass('down');
	changeIntegerScale( 'dec' );

	updateUI();

	try {
		document.getElementById("fireUpdateUI").onclick = updateUI;
	} catch (e) {}
});
