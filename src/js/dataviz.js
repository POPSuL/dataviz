function DataParser(name, parseFunc) {
	var t = this;
	var n = name;
	this.parse = function (data) {
		return parseFunc.call(t, data);
	}

	this.getName = function () {
		return n;
	}
}

var dataviz = new (function () {

	var parsers = {};

	this.registerParser = function (parser, mime) {
		if (parser instanceof DataParser) {
			parsers[mime] = parser;
		} else {
			throw "Parser must be instance of DataParser";
		}
	};

	this.lookupParser = function (mime) {
		if (typeof(parsers[mime]) !== 'undefined') {
			return parsers[mime];
		}
		return null;
	};

	this.putData = function (bin, prop) {
		var ev = new jQuery.Event("chunkReceived");
		ev.chunk = bin;
		ev.prop = prop;
		$("#binary-target").trigger(ev);
	};

	this._handleFile = function (file) {
		var parser = this.lookupParser(file.type);
		if (!parser) {
			throw "File type doesn't support :(";
		}

		var reader = new FileReader();

		reader.onload = (function(theFile) {
			return function(e) {
				try {
					var startTime = new Date().getTime();
					parser.parse(new Uint8Array(reader.result));
					$('#binary-target').attr('class', parser.getName());
					console.log("parsed in ", (new Date().getTime() - startTime) / 1000, "seconds");
				} catch (e) {
					alert(e);
				}
			};
		})(file);
		console.log(reader);
		reader.readAsArrayBuffer(file);
	}

	this.handleFile = function (file) {
		dataviz._handleFile.call(dataviz, file);
	}

	this.formatMessage = function (tpl, values) {
		for (var i in values) {
			if (values.hasOwnProperty(i)) {
				tpl = tpl.replace(new RegExp("%" + i + "%", "g"), values[i]);
			}
		}
		return tpl;
	}

});

$(["png"]).each(function (i, e) {
	$('<script/>').attr('src', "js/parsers/" + e + ".js").appendTo('head');
	$('<link rel="stylesheet" />').attr('href', "css/parsers/" + e + ".css").appendTo('head');
});

jQuery(function ($) {
	var dataCounter = 0;

	function getNextAddress() {
		var to = dataCounter.toString(16);
		return ("0000".substr(to.length)) + to;
	}

	var clickHandler = function () {
		console.log('click', $(this));
		$(this).parents("#binary-target").find('.selected').removeClass('selected');
		$(this).addClass('selected');
		if($(this).parent().is('#hex-target')) {
			$('#bin-target .part' + $(this).data('part')).addClass('selected');
		} else {
			$('#hex-target .part' + $(this).data('part')).addClass('selected');
		}
		var comment = $(this).data('comment');
		$('#description-target').html(comment);
	}

	$('#binary-target').bind('chunkReceived', function (e) {
		var chunk = e.chunk;
		var prop = e.prop;
		var hexContainer = $('<span/>').addClass(prop.class).addClass('part' + dataCounter)
			.data('comment', prop.comment).data('part', dataCounter).bind('click', clickHandler);
		var binContainer = hexContainer.clone()
			.data('comment', prop.comment).data('part', dataCounter).bind('click', clickHandler);

		var hexString = "";
		var binString = "";
		for (var i = 0; i < chunk.length; i++, dataCounter++) {
			if (dataCounter && (dataCounter % 16) == 0) {
				hexString += "\n";
				binString += "\n";
				$('#address').append("\n" + getNextAddress());
			}
			var byte = chunk[i];
			var hex = byte.toString(16);
			hex = "00".substr(hex.length) + hex;
			hexString += hex + " ";
			if (byte < 0x20) {
				var char = '•';
			} else {
				var char = String.fromCharCode(byte);
			}
			binString += char;
		}
		hexContainer.text(hexString);
		binContainer.text(binString);
		$("#hex-target").append(hexContainer);
		$("#bin-target").append(binContainer);
	});

	$('#select-file').change(function (e) {
		if (e.target.files.length) {
			try {
				dataviz.handleFile(e.target.files[0]);
			} catch (e) {
				alert(e);
			}
		}
	});
});