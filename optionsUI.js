var historyList = [];

function updateSettingsUI()
{
	// int scale
	$('.button.grouped').removeClass('down');
	$('.button.grouped[data-scale="'+intScale.scale+'"]').addClass('down');
	$('.button.grouped[data-notation="'+notation+'"]').addClass('down');

	function updateSep(opt)
	{
		var root = $('#'+opt.scale);

		if (opt.use)
			$('.button.use', root).addClass('down');
		else
			$('.button.use', root).removeClass('down');

		$('select[data-type="width"]', root).val(opt.width);
		$('select[data-type="char"]', root).val(opt.char);
	}
	updateSep(intOptions['dec']);
	updateSep(intOptions['hex']);
	updateSep(intOptions['bin']);
	updateSep(realOpt);

	$('#MaxCount').val(MAX_HISTORY_ITEMS);
}

function changeIntScale(scale)
{
	intScale = intOptions[scale];
	$('.button.grouped').removeClass('down');
	$('.button.grouped[data-scale="'+intScale.scale+'"]').addClass('down');
	saveIntScale();
}

function changeNotation(notation)
{
	myStg.set({ notation: notation });
}

function changeSeparator(root)
{
	var s = root.attr('id'), isReal = s == 'real', scale = isReal ? realOpt : intOptions[s];
	scale.use = $('.button.use', root).hasClass('down');
	scale.width = $('select[data-type="width"]', root).val();
	scale.char = $('select[data-type="char"]', root).val();

	if (isReal)
		saveRealOption();
	else
		saveIntOption();
}

function resetToDefault()
{
	const
		dftIntOptions = {
			'dec': { 'scale': 'dec', 'width': 3, 'char': ',', 'prefix': '', 'use': false, },
			'hex': { 'scale': 'hex', 'width': 4, 'char': '_', 'prefix': '0x', 'use': false, },
			'bin': { 'scale': 'bin', 'width': 8, 'char': '_', 'prefix': '0b', 'use': true, },
		},
		dftRealOpt = { 'scale': 'real', 'width': 3, 'char': ',', 'prefix': '', 'use': false, },
		dftIntScale = null, 
		dftHistoryCount = 99;

	intOptions = dftIntOptions;
	realOpt = dftRealOpt;
	intScale = intOptions['dec'];
	MAX_HISTORY_ITEMS = dftHistoryCount;
}

function saveAllOptions()
{
	saveIntScale();
	saveIntOption();
	saveRealOption();
}

function saveHistory()
{
	saveHistoryList(historyList);
}

function updateHistoryUI()
{
	var hd = $('.history');
	hd.html('');
	for (var i = 0; i < historyList.length; i++)
	{
		var h = historyList[i], v = h.type == 'int' ? h.value.dec : h.value;
		hd.append( 
			$('<div>').attr('data-time', h.time).addClass('historyWrapper')
				.append( $('<span>').addClass('remover') )
				.append( $('<span>').addClass('historyExpr').text(h.expr) )
				.append( $('<span>').addClass('historyType').text(h.type) )
				.append( $('<span>').addClass('historyValue').text(v) )
			);
	}

	$('span.remover').click(function () {
		var p = $(this).parent(), t = p.attr('data-time');
		for (var i = 0; i < historyList.length; i++)
		{
			var h = historyList[i];
			if (h.time == t)
			{
				historyList.splice(i, 1);
				p.remove();
				break;
			}
		}
		saveHistory();
	});
}

function loadSettings()
{
	try {
		resetToDefault();
		var data = myStg.getAll();

		if (data.history)
			historyList = data.history;

		if (data.intOpt)
			intOptions = data.intOpt;

		if (data.intScale)
			intScale = intOptions[data.intScale];

		if (data.realOpt)
			realOpt = data.realOpt;

		if (data.MAX_HISTORY_ITEMS)
			MAX_HISTORY_ITEMS = data.MAX_HISTORY_ITEMS;

		if (data.notation)
			notation = data.notation;

		console.log('intOpt', data.intOpt);
		console.log('realOpt', data.realOpt);
		console.log('intScale', data.intScale);
		console.log('MAX_HISTORY_ITEMS', data.MAX_HISTORY_ITEMS);
	} catch (e) { }
	finally {
		updateSettingsUI();
		updateHistoryUI();
	}
}

$(function () {
	$('.button[data-button-style="Downable"]').click(function() {
		$(this).toggleClass('down');
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

		var grp = $(this).attr('data-group');
		switch (grp) {
			case 'scale':
				changeIntScale($(this).attr('data-scale'));
				break;
			case 'notation':
				changeNotation($(this).attr('data-notation'));
				break;
		}
		//changeIntScale($(this).attr('data-scale'));
	});

	$('.sep>select').change(function () {
		changeSeparator($(this).parent());
	});

	$('.button.use').click(function () {
		changeSeparator($(this).parent());
	});

	$('#reset').click(function () {
		resetToDefault();
		saveAllOptions();
		updateSettingsUI();
	});

	$('#clear').click(function () {
		try {
			historyList = [];
			saveHistory();
			$('.history').html('');
		} catch (e) { }
	});

	var sel = $('#MaxCount');
	for (var i = 1; i <= 200; i++)
		sel.append($('<option>').text(i));

	sel.change(function () {
		MAX_HISTORY_ITEMS = $(this).val() | 0;
		saveMaxCount();
	});

	loadSettings();
});
