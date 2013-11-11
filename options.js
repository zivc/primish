/**
 * @module primish/options
 * @description setOptions mixin for primish
 **/
;(function(){
	'use strict';

	// common code to return under any env
	var wrap = function(prime){
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
				o = this.options =  prime.merge(this.options, options);

				// add the events as well, if class has events.
				if ((this.on && this.off))
					for(option in o){
						if (o.hasOwnProperty(option)){
							if (typeof o[option] !== sFunction || !(/^on[A-Z]/).test(option)) continue;
							this.on(removeOn(option), o[option]);
							delete o[option];
						}
					}
				return this;
			}
		});
	}; // wrap

	if (typeof define === 'function' && typeof define.amd === 'object' && define.amd){
		define(['./prime'], wrap);
	}
	else if (typeof module !== 'undefined' && module.exports){
		module.exports = wrap(require('./prime'));
	}
	else {
		this.options = wrap(this.prime);
	}
}.call(this));