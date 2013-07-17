/*
 * JavaScript for Edfu data display.
 *
 * 2013 Sven-S. Porst, SUB Göttingen <porst@sub.uni-goettingen.de>
 */
var edfu = (function () {
	var onSlide = function (event, ui) {
		var filterStrings = [];
		jQuery('.ui-slider').each( function () {
			var value = jQuery(this).slider('value');
			filterStrings.push(this.id.split('-')[1] + '(' + value + '%)');
		});
		var filterString = filterStrings.join(' ');

		var jFotorama = jQuery('.fotorama__stage__shaft, .powerzoomer .inner');
		jFotorama.css({'filter': filterString, '-webkit-filter': filterString});
	};


	jQuery.fn.fotoramaListAdapter = function () {
		this.each(function () {
			var html = '';

			jQuery('> li', this).each(function () {
				html += jQuery(this).html();
			});

			jQuery(this).html(html);
		});

		return this;
	};


	var zoomTimeout;

	var setupZoom = function (event) {
		jImage = jQuery('.fotorama__stage__frame.fotorama__active img');

		if (jImage.length > 0) {
			jImage.addpowerzoom({
				defaultpower: 2,
				powerrange: [1.5, 7],
				largeimage: null,
				magnifiersize: [200,200]
			});
		}
		else {
			if (!zoomTimeout) {
				console.log('setting timeout');
				zoomTimeout = setTimeout(setupZoom, 500);
			}
			else {
				zoomTimeout = undefined;
			}
		}


	};


	jQuery(function () {
		// Initialise fotorama slideshow.
        var jFotorama = jQuery('ul.fotorama');
        jFotorama.on('fotorama:didShow', function (event) {
      			setupZoom(event);
        })

		jFotorama.fotoramaListAdapter().fotorama();

		// Initialise slider for image settings.
		jQuery('.slider').slider({
			min: 0,
			max: 200,
			value: 100,
			slide: onSlide
		});
	});

	return {
	};

})();