$(function () {
	$.get('changes.log', function(data) {
		$('#changeLog').append( $('<pre>').text(data) );
		$('div.changeLog').removeAttr('style');
		$('#btnChangeLog').click(function () {
			$('#changeLog').toggle();
		});
	});

	$('.button[data-button-style="Downable"]').click(function() {
		$(this).toggleClass('down');
	});
});
