(function (dv) {
	var messages = {
		signature: "PNG signature"
	};

	var colorTypes = {
		"0": "(0) Each pixel is a grayscale sample.",
		"2": "(2) Each pixel is an R,G,B triple.",
		"3": "(3) Each pixel is a palette index; a PLTE chunk must appear.",
		"4": "(4) Each pixel is a grayscale sample, followed by an alpha sample.",
		"6": "(5) Each pixel is an R,G,B triple, followed by an alpha sample."
	}

	function getIHDRMessage(c) {
		var props = {
			width: ((c[0] & 0xff) << 24) | ((c[1] & 0xff) << 16) | ((c[2] & 0xff) << 8) | (c[3] & 0xff),
			height: ((c[4] & 0xff) << 24) | ((c[5] & 0xff) << 16) | ((c[6] & 0xff) << 8) | (c[7] & 0xff),
			depth: c[8] & 0xff,
			colorType: colorTypes[c[9] & 0xff] || "Unknown",
			compression: c[10] & 0xff,
			filter: c[11] & 0xff,
			interlace: c[12] & 0xff
		};
		return dv.formatMessage("<h5>Image Header Chunk (IHDR)</h5>" +
			"<p>This chunk contains a general image properties</p>" +
			"<strong>Width</strong> %width%<br />" +
			"<strong>Height</strong> %height%<br />" +
			"<strong>Bit depth</strong> %depth%<br />" +
			"<strong>Color type</strong> %colorType%<br />" +
			"<strong>Compression method</strong> %compression%<br />" +
			"<strong>Filter method</strong> %filter%<br />" +
			"<strong>Interlace method</strong> %interlace%<br />", props);
	}

	function gettEXtMessage(c) {
		var o = [];
		for (var i = 0; i < c.length; i++) {
			if (c[i] == 0x00) {
				o.push(": ");
				continue;
			}
			o.push(String.fromCharCode(c[i]));
		}
		var text = o.join('');
		return dv.formatMessage("<h5>Text chunk</h5>" +
			"<p>This chunk contains a text information from encoder</p>" +
			"<strong>Content:</strong> %text%", {
			text: text
		});
	}

	function toChunkName(c) {
		return String.fromCharCode(c[0]) + String.fromCharCode(c[1])
					+ String.fromCharCode(c[2]) + String.fromCharCode(c[3]);
	}

	dv.registerParser(new DataParser('png', function (d) {
		dv.putData(d.subarray(0, 8), {
			class: 'signature',
			comment: messages.signature
		});
		var offset = 8;
		do {
			var cl = d.subarray(offset, offset + 4);
			var chunkLen = ((cl[0] & 0xff) << 24) | ((cl[1] & 0xff) << 16) | ((cl[2] & 0xff) << 8) | (cl[3] & 0xff);
			var name = d.subarray(offset + 4, offset + 8);
			var body = d.subarray(offset + 8, offset + chunkLen + 8); //chunk name + data + chunk length
			var message = "PNG Chunk (" + toChunkName(name) + ")";
			var color = "chunk";
			if (toChunkName(name) == "IHDR") { //IHDR
				message = getIHDRMessage(body);
				color = "ihdr-chunk";
			} else if (toChunkName(name) == "IDAT") {
				message = "<h5>Image Data Chunk (IDAT)</h5>" +
					"<p>This chunk contains a compressed image data</p>";
				color = "image-data";
			} else if (toChunkName(name) == "tEXt") {
				message = gettEXtMessage(body);
				color = "text-chunk";
			} else if (toChunkName(name) == "IEND") {
				message = "<h5>Image End Chunk (IEND)</h5>" +
					"<p>The IEND chunk must appear LAST. It marks the end of the PNG datastream. " +
					"The chunk’s data ﬁeld is empty.</p>";
				color = "iend-chunk";
			}
			dv.putData(d.subarray(offset, offset + 12 + chunkLen), {
				class: color,
				comment: message
			});
			offset += (chunkLen + 12);
		} while (offset < d.byteLength);
		return true;
	}), "image/png");
})(dataviz);