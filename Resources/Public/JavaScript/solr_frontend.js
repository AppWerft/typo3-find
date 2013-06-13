jQuery(document).ready(function() {
	// autocomplete
	jQuery('.tx_solr_frontend .fieldContainer input[autocompleteURL!=""]').autocomplete(
		{
			source: function(request, returnSuggestions) {
				var autocompleteURL = this.element.attr('autocompleteURL');
				if (autocompleteURL) {
					autocompleteURL = autocompleteURL.replace('%25%25%25%25', request.term);
					jQuery.getJSON(autocompleteURL, function (data) {
						returnSuggestions(data);
					});
				}
			}
		}
	);
});

// add parameters correctly to an url
var updateQueryStringParameter = function(uri, key, value) {
	var re = new RegExp("([?|&])" + key + "=.*?(&|$)", "i");
	var separator = uri.indexOf('?') !== -1 ? "&" : "?";
	if (uri.match(re)) {
		return uri.replace(re, '$1' + key + "=" + value + '$2');
	}
	else {
		return uri + separator + key + "=" + value;
	}
};

var localise = function (term) {
	return term;
};

var currentUrl = function() {
	return window.location.href;
};

var createHistogramForTermsInContainer = function (terms, container, config) {
	var jGraphDiv = jQuery(container);
	var graphWidth = jGraphDiv.parents('.facets').width();
	var canvasHeight = 150;
	jGraphDiv.css({'width': graphWidth + 'px', 'height': canvasHeight + 'px', 'position': 'relative'});

	var startSearchWithNewFacet = function (range) {
		var facetQueryString = '[' + range.from + '%20TO%20' + range.to + ']';
		var facetLink = config.linkTemplate.replace('%22%25%25%25%25%22', facetQueryString);
		window.location.href = document.baseURI + facetLink;
	};

	var graphData = [];
	for (var yearName in terms) {
		var year = parseInt(yearName, 10);
		if (year) {
			graphData.push([year, terms[yearName]]);
		}
	}

	/*	Set up xaxis with two labelled ticks, one at each end.
		Dodgy: Use whitespace to approximately position the labels in a way that they don’t
		extend beyond the end of the graph (by default they are centered at the point of
		their axis, thus extending beyond the width of the graph on one site.
	*/
	var xaxisTicks = function (axis) {
		return [[axis.datamin, '      ' + axis.datamin], [axis.datamax, axis.datamax + '      ']];
	};

	// Use the colour of term list titles for the histogram.
	var graphColour = jQuery('.tx_solr_frontend .facetAdd').css('color');
	var selectionColour = jQuery('.tx_solr_frontend .facet h1').css('color');

	var graphOptions = {
		'series': {
			'bars': {
				'show': true,
				'fill': true,
				'lineWidth': 0,
				'barWidth': config.barWidth,
				'fillColor': graphColour
			}
		},
		'xaxis':  {
			'tickDecimals': 0,
			'ticks': xaxisTicks,
			'autoscaleMargin': null
		},
		'yaxis': {
			'position': 'right',
			'tickDecimals': 0,
			'tickFormatter': function(val, axis) {return (val != 0) ? (val) : ('');},
			'labelWidth': 30
		},
		'grid': {
			'borderWidth': 0,
			'hoverable': true
		},
		'selection': {
			'mode': 'x',
			'color': selectionColour,
			'minSize': 0
		}
	};

	var plot = jQuery.plot(jGraphDiv , [{'data': graphData, 'color': graphColour}], graphOptions);

	for (var activeFacetIndex in config.activeFacets) {
		var activeFacet = config.activeFacets[activeFacetIndex];
		var range = activeFacet.replace(/[\[\]]/g, '').split(' TO ');
		if (range.length === 2) {
			var selection = {};
			selection.from = parseInt(range[0]);
			selection.to = parseInt(range[1]);
			plot.setSelection({'xaxis': selection});
		}
	}

	var removeTooltip = function () {
		jQuery("#solr_frontend-histogram-tooltip").remove();
	};

	var selectRanges = function (ranges) {
		var from = Math.floor(ranges.xaxis.from);
		ranges.xaxis.from = from - (from % config.barWidth);
		var to = Math.ceil(ranges.xaxis.to);
		ranges.xaxis.to = to - (to % config.barWidth);
		plot.setSelection(ranges, true);
		removeTooltip();
		startSearchWithNewFacet(ranges.xaxis);
	};

	jGraphDiv.bind('plotclick', function (event, pos, item) {
		return true;
	});

	jGraphDiv.bind('plotunselected', function() {
		return false;
	});

	jGraphDiv.bind('plotselected', function(event, ranges) {
		selectRanges(ranges);
	});

	jGraphDiv.bind('plothover', function(event, ranges, item) {
		var showTooltip = function(x, y, contents) {
			var tooltipDiv = document.createElement('div');
			tooltipDiv.setAttribute('id', 'solr_frontend-histogram-tooltip');
			tooltipDiv.appendChild(document.createTextNode(contents));
			jQuery(tooltipDiv).css( {
				'position': 'absolute',
				'display': 'none',
				'top': y - 20,
				'left': x + 5,
				'background': '#fff'
			}).appendTo('body').show();
		};

		removeTooltip();
		var year = Math.floor(ranges.x);
		year = year - (year % config.barWidth);
		if (terms[year]) {
			var hitCount = terms[year];
			var displayString = year + ': ' + hitCount + ' ' + localise('Treffer');
			var tooltipY = jGraphDiv.offset().top + canvasHeight - 20;
			showTooltip(ranges.pageX, tooltipY, displayString);
		}
	});

	jGraphDiv.mouseout(removeTooltip);

};

var detailViewWithPaging = function (element, position) {
	var inputsWithPrefixForObject = function (prefix, object) {
		var inputs = [];
		for (var key in object) {
			var prefixWithKey = prefix + '[' + key + ']';
			var value = object[key];
			if (typeof(value) === 'object') {
				inputs = inputs.concat(inputsWithPrefixForObject(prefixWithKey, value));
			}
			else {
				inputs.push(inputWithNameAndValue(prefixWithKey, value));
			}
		}
		return inputs;
	};


	var inputWithNameAndValue = function (name, value) {
		var input = document.createElement('input');
		input.name = name;
		input.value = value;
		input.type = 'hidden';
		return input;
	};

	if (underlyingQuery) {
		// Try to determine position if it is not set explicitly.
		var jLI = jQuery(element).parents('li');
		var jOL = jLI.parents('ol');
		if (position) {
			underlyingQuery.position = position;
		}
		else if (jOL) {
			underlyingQuery.position = parseInt(jOL.attr('start')) + parseInt(jLI.index());
		}

		var form = document.createElement('form');
		var linkURL = element.getAttribute('href');
		form.action = linkURL;
		form.method = 'POST';
		form.style = 'display:none;';
		document.body.appendChild(form);

		var inputs = inputsWithPrefixForObject('tx_solrfrontend_solrfrontend[underlyingQuery]', underlyingQuery);
		for (var inputIndex in inputs) {
			form.appendChild(inputs[inputIndex]);
		};

		result = form.submit();
		return false;
	}

	return true;
};
