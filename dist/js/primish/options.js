/**
 * @module primish/options
 * @description setOptions mixin for primish
 **/
;(function(root, factory){
	'use strict';

	if (typeof define === 'function' && define.amd){
		define(['./prime'], factory);
	} else if (typeof exports === 'object'){
		module.exports = factory(require('./prime'));
	} else {
		root.options = factory(root.prime);
	}
})(this, function(prime){
	'use strict';

	var sFunction = 'function',
		removeOn = function(string){
			// removes <on>Event prefix and returns a normalised event name
			return string.replace(/^on([A-Z])/, function(full, first){
				return first.toLowerCase();
			});
		};

	return prime({
		// a mixin class that allows for this.setOptions
		setOptions: function(options){
			var option,
				o;

			this.options || (this.options = {});
			o = this.options = prime.merge(this.options, options);

			// add the events as well, if class has events.
			if ((this.on && this.off))
				for (option in o){
					if (o.hasOwnProperty(option)){
						if (typeof o[option] !== sFunction || !(/^on[A-Z]/).test(option)) continue;
						this.on(removeOn(option), o[option]);
						delete o[option];
					}
				}
			return this;
		}
	});
});