/*! https://mths.be/q v1.0.0 by @mathias | MIT license */

// https://tools.ietf.org/html/rfc2047#section-4.2
var stringFromCharCode = String.fromCharCode;
export function decode (input) {
	return input
		// Decode `_` into a space. This is character-encoding-independent;
		// see https://tools.ietf.org/html/rfc2047#section-4.2, item 2.
		.replace(/_/g, ' ')
		// Decode escape sequences of the form `=XX` where `XX` is any
		// combination of two hexidecimal digits. For optimal compatibility,
		// lowercase hexadecimal digits are supported as well. See
		// https://tools.ietf.org/html/rfc2045#section-6.7, note 1.
		.replace(/=([a-fA-F0-9]{2})/g, function ($0, $1) {
			var codePoint = parseInt($1, 16);
			return stringFromCharCode(codePoint);
		});
};

var regexUnsafeSymbols = /[\0-\x1F"-\),\.:-@\[-\^`\{-\uFFFF]/g;
export function encode (string) {
	// Note: this assumes the input is already encoded into octets (e.g. using
	// UTF-8), and that the resulting octets are within the extended ASCII
	// range.
	return string
		// Encode symbols that are definitely unsafe (i.e. unsafe in any context).
		.replace(regexUnsafeSymbols, function (symbol) {
			if (symbol > '\xFF') {
				throw RangeError(
					'`q.encode()` expects extended ASCII input only. Don\u2019t ' +
					'forget to encode the input first using a character encoding ' +
					'like UTF-8.'
				);
			}
			var codePoint = symbol.charCodeAt(0);
			var hexadecimal = codePoint.toString(16).toUpperCase();
			return '=' + ('0' + hexadecimal).slice(-2);
		})
		// Encode spaces as `_`, as it’s shorter than `=20`.
		.replace(/\x20/g, '_');
};
