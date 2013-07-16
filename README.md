primish
=======

A prime derivative that went beyond repair. Initially a fork of [MooTools prime](https://github.com/mootools/prime/), now with a lot of sugar. 

You are still advised to use Prime but in case you care, here is what you get with primish:

## Changes from upstream

### prime changes

- `.parent()`
- `.implement()` and `implement` mutator:
- `prime.merge()` shallow Object merging

### emitter changes

- support for event stacking like `.on('foo bar baz', function(){});`
- support for event pseudos like `.on('foo:once', function(){});`
- `emitter.definePseudo()` to allow custom pseudo events

### options

- `.setOptions()` - shallow merging of object with `this.options`
- support for emitter events via `onEventname` -> `this.on('eventname')` like in MooTools 1.x

### browser support

The main driving force behind primish is to change prime to work in a browser out of the box as well as under nodejs.
This fork changes the code to work w/o any dependencies and support AMD (eg. RequireJS) as well as simple browser exports to gloabls. If you don't have
an AMD loader and not under NodeJS / browserify, it will export `window.prime`, `window.emitter` and `window.options`,
so be careful. Another goal has been to bring as much MooTools 1.x sugar into classes as possible.

Use at your own risk, examples in `./examples/` and also look at the `spec` folder (jasmine-node test runner).
Most examples in the docs are runnable, just edit the code and press `run this`, then look at your console.

## Creating a Class

To create a new Class, you simply need to do:

```ace
require(['prime/prime'], function(prime){

	var Human = prime({
		setName: function(name){
			this.name = name;
		},
		getName: function(){
			return this.name;
		}
	});

	var Bob = new Human();
	Bob.setName('Bob');
	console.log(Bob.getName()); // 'Bob'

});
```

You can also add a constructor method on your config object to run automatically:

```ace
require(['prime/prime'], function(prime){

	var Human = prime({
		constructor: function(name){
			name && this.setName(name);
		},
		setName: function(name){
			this.name = name;
		},
		getName: function(){
			return this.name;
		}
	});

	var Bob = new Human('Bob');
	console.log(Bob.getName()); // 'Bob'

});
```

Here is an example that will make the name property `readonly` and  example private variables

```ace
require(['prime/prime'], function(prime){

    var Human = (function(){
        var storage = {},
            hid = 0;

        var Human = prime({
            constructor: function(name){
                this.$hid = hid++;
                storage[this.$hid] = {};
                // disallow changes to human id
                prime.define(this, '$hid', {
                    writable: false,
                    enumerable: false
                });

                prime.define(this, 'name', {
                    configurable: false,
                    get: function(){
                        return this.getName();
                    }
                });

                name && this.setName(name);
            },
            setName: function(name){
                storage[this.$hid].name = name;
            },
            getName: function(){
                return storage[this.$hid].name;
            }
        });

        return Human;
    }());

    var Bob = new Human('Bob'),
        Greg = new Human('Greg');

    console.log(Bob);
    console.log(Bob.getName()); // 'Bob'
    console.log(Bob.name); // 'Bob'
    Bob.name = 'Robert'; // nope, should not change.
    console.log(Bob.name); // 'Bob'
    Bob.$uid = Greg.$uid; // try to puncture Greg's storage
    console.log(Bob.name); // 'Bob'

});
```

What happens behind the scenes? `prime` accepts a single argument as a config object. The object is a simple JavaScript
Object - with special keys (also referred to `mutator keys`).

A `mutator key` is a key:value pair that has a special meaning and is used differently by the Class constructor. The
following keys in your config object are considered `mutator`:

### constructor

The `constructor` method in your config object is what becomes the prime constructor. It runs automatically when you
instantiate and can accept any number of arguments, named or otherwise.

```ace
require(['prime/prime'], function(prime){
	// have an element
	var div = document.createElement('div');
	div.setAttribute('id', 'myWidget');
	document.body.appendChild(div);

	var Widget = prime({
		options: {
			title: 'My Widget'
		},
		constructor: function(el, options){
			this.element = document.getElementById(el);
			if (options && Object(options) === options){
				this.options = options;
			}
			this.element.innerHTML = this.options.title;
		}
	});

	var instance = new Widget('myWidget', {
		title: 'Cool Widget',
		height: 300
	});

	console.log(instance.options.title); // 'Cool Widget'
	console.log(instance.element.innerHTML); // 'Cool Widget'
});
```

### extend

The special key `extend` defines what SuperClass your new Class will inherit from. It only accepts a single argument,
pointing to another Class. The resulting new Class definition will have its prototype set to the SuperClass and inherit
any of its static properties and methods via the scope chain.

This allows you to abstract differences between Classes without having to repeat a lot of code.

```ace
require(['prime/prime'], function(prime){
	var Rectangle = prime({

		constructor: function(width, height){
			return this.setwidth(width).setHeight(height);
		},

		setWidth: function(width){
			this.width = width;
			return this; // allow chaining
		},

		setHeight: function(height){
			this.height = height;
			return this;
		},

		squareRoot: function(){
			return this.height * this.width;
		}

	});

	var Square = prime({

		// subclass of Rectangle
		extend: Rectangle,

		constructor: function(side){
			return this.setSide(side);
		},

		setSide: function(side){
			// both sides are the same
			this.width = this.height = side;
			return this;
		},

		setWidth: function(width){
			return this.setSide(width);
		},

		setHeight: function(height){
			return this.setSide(height);
		}

	});

	var square = new Square(30);
	square.setWidth(5); // local
	console.log(square.height); // 5
	console.log(square.squareRoot()); // from parent proto of Rectangle, 25
});
```
Changes to the parent Class are also reflected in the child Class by inheritance (unless the child has a local
implementation). This differs from when you use the [mixin](#mixin) directives, which copies instead.

```javascript
// continued from above
Rectangle.prototype.shrink = function(){
	this.width--;
	this.height--;
	return this;
};

// square can also now call .shrink:
square.setSide(5).shrink();
square.width; // 4;
square.height; // 4
```

### parent

When [extending a Class](#extend), you can access methods from the super via the `.parent()` method. It expects at least
1 argument - the method name as `String`. This is synthactic sugar for saying:

 `this.constructor.prototype.methodname.apply(this, [arguments])`, where methodname is the method passed as string.

Here is a more comprehensive example:

```ace
require(['prime/prime'], function(prime){
	// this example won't work w/o jQuery and ECMA5
	// assume this.$element is a jquery wrapped el.

	var Widget = prime({

		attachEvents: function(){
			this.$element.on('click', this.handleclick.bind(this));
		},
		handleClick: function(){

		},
		setTitle: function(title){
			this.$element.find('.title').text(title);
		}

	});

	var WeatherWidget = prime({

		extend: Widget,

		attachEvents: function(){
			this.parent('attachEvents'); // call it on super Widget
			// do more.
			this.$element.find('input').on('blur', this.validateInput.bind(this));
		},
		validateInput: function(event){

		}

	});

	// example with shifting arguments
	var NewsWidget = prime({

		extend: Widget,

		setTitle: function(text){
			this.$element.find('.sub-heading').addClass('active');
			this.parent('setTitle', text); // passes original arg to parent.
		}

	});
});
```

### mixins

The special key `implement` is used to tell prime which other Objects' properties are to be `copied` into your own Class
definition. Mixins do not work via inheritance, they create a local instance of the properties.

When used as a property, `implement` accepts either a single Class or an array of Classes to implement.

```ace
require(['prime/prime'], function(prime){
	// example using a small event emitter as a mixin
	var EID = 0;

	var Emitter = prime({

		on: function(event, fn){
			var listeners = this._listeners || (this._listeners = {}),
				events = listeners[event] || (listeners[event] = {});

				for (var k in events) if (events[k] === fn) return this;

				events[(EID++).toString(36)] = fn;
			return this;
		},

		trigger: function(event){
			var listeners = this._listeners, events, k, args;
			if (listeners && (events = listeners[event])){
				args = (arguments.length > 1) ? slice.call(arguments, 1) : [];
				for (k in events) events[k].apply(this, args);
			}
			return this;
		}

	});

	var myClass = prime({

		// implement the emitter:
		implement: [Emitter],

		doSomethingImportant: function(){
			this.trigger('important');
		}

	});

	var instance = new myClass();

	// bind some event, .on is available
	instance.on('important', function(){
		console.log('important is done');
	});

	// call the method that will fire the event.
	instance.doSomethingImportant();
});
```

There is an alternative syntax to allow `late implementation` via the `.mixin` method:

```javascript
myClass.implement(new OtherClass());
// or chaining on an instance
instanceofMyClass.implement(new OtherClass2()).mixin(new OtherClass3());

// late binding at proto definition also works
var myClass = prime({}).mimplement(new OtherClass);
```

<div class="alert">Note: When a mixin is implemented, the mixin Class is instantiated (via `new`) and the methods are copied from
the instance, not the prototype. Changing the mixin prototype afterwards will not automatically make the changes available
in your Class instances (unlike when using [extend](#extend))

## Define

Define is a micro polyfill to `Object.defineProperty` - see [MDN](https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Global_Objects/Object/defineProperty). It works in conjunction with `Object.getOwnPropertyDescriptor`, which is also shimmed for older browsers.

This allows you to have read-only properties of objects, or private getters/setters. Example use

```ace
require(['prime/prime'], function(prime){
    var Human = prime({

        constructor: function(name){
            this.name = name;

            // make name readonly
            prime.define(this, 'name', {
                writable: false,
                enumerable: true
            });
        },

        setName: function(name){
            this.name = name; // won't work in modern browsers
        }

    });

    var Bob = new Human('Bob');

    Bob.setName('Robert');

    Bob.name = 'Rob';

    // should be fine.
    console.info(Bob.name);
    console.assert(Bob.name === 'Bob');

});
```

## Plugins

### emitter

The Emitter class can work either as a [mixin](#mixins) or as a standalone Class instance. It provides any Class that uses it with 3 methods it can call:

- `.on(event, callback)` - subscribes to `String(event)` and runs `callback` when fired.
- `.off(event, callback)` - removes specific subscription to `String(event)` by exact reference to `callback`. Removing events requires you to be able to pass on the original bound callback.
- `.trigger(event, [Optional arguments])` - fires `String(event)` and optionally passes arguments to the callback

By default, the scope of `this` in any event callback function will be the object that fired it, not the subscriber. If you want to keep scope bound to your local instance, you need to use `Function.prototype.bind` (if ES5Shim is being used) or `_.bind` (lodash or underscore), which is probably safer.

#### Using events

```ace
require(['prime/prime', 'prime/emitter'], function(prime, emitter){
	// this example won't run w/o ECMA5 Function.prototype.bind

	var someController = new (prime({
		implement: [emitter]
	}))();

	var Human = prime({
		implement: [Emitter],
		constructor: function(){
			this.attachEvents();
		},
		eat: function(energy){
			this.energy += energy;
			// fire an event, passing how much and new energy level
			this.trigger('eat', [energy, this.energy]);
		},
		attachEvents: function(){
			// subscribe to another instance's init event
			someController.on('init', this.initialize.bind(this));

			// example of an event that gets removed after a single run
			this.boundFetch = this.dataFetched.bind(this);
			someController.on('fetch', this.boundFetch);
		},
		initialize: function(){
			// this will only run after the controller fires init, this = self.
			console.log('ready to do stuff');
		},
		dataFetched: function(){
			// should only run once and unsubscribe
			// do stuff
			console.log('we have data');

			// remove the event by passing reference to the saved bound function
			this.off('fetch', this.boundFetch);
			delete this.boundFetch;
		}
	});

	var Bob = new Human();
	someController.trigger('init');
	setTimeout(function(){
		someController.trigger('fetch');
	}, 1000);
});
```

You can also use **named anonymous functions** to remove your own event in a hurry:

```ace
require(['prime/prime', 'prime/emitter'], function(prime, emitter){
	var Human = prime({
		implement: [emitter],
		constructor: function(){
			this.on('hi', function hiEvent(){
				console.log('running callback');
				this.off('hi', hiEvent);
			});
		}
	});

	var h = new Human();
	h.trigger('hi').trigger('hi'); // should only console.log once

	// or simply use the :once pseudo
	h.on('bye:once', function(){
		console.log('bye');
	});

	h.trigger('bye');
	h.trigger('bye'); // won't do anything
});

```

There is also syntactic sugar available for adding more than one event to the same callback:

```javascript
var cb = function(){
};

model.on('change fetch create', cb); // any of change, fetch or create events fire the same handler
```

#### definePseudo

Emitter supports `pseudo events`, similar in style to CSS pseudos. For instance: `load:once` is a `load` event with a `once` pseudo.

By default, emitter ships with `once` pre-defined - which will run an event callback once only, then unbind itself.

It exposes an API to define custom pseudos on the emitter object.

```ace
require(['prime/prime', 'prime/emitter'], function(prime, emitter){

    var user = {
        role: 'tester'
    };

    // definePseudo takes 2 arguments - base event name and fn callback
    emitter.definePseudo('admin', function(eventName, fn){
        // need to return a function
        return function(){
            // eg, check if user.role is admin
            if (user.role === 'admin'){
                fn.apply(this, arguments);
            }
        };
    });

    var e = new emitter();

    e.on('load:once', function(){
        console.log('loaded, should see this once');
    });

    e.on('test:admin', function(){
        console.log('this should only run when user.role === "admin"');
    });

    // once
    e.trigger('load');
    e.trigger('load');

    // at the moment, role is wrong, so this won't fire
    e.trigger('test');

    user.role = 'admin';
    e.trigger('test'); // test:admin cb will now run
});
```

### options

A small utility mixin from Arian's prime-util that allows easy object merge of an Object into `this.object` from right to left. If emitter is also mixed-in, it will automatically add events prefixed by `on` and camelcased, eg, `onReady: function(){}`.

```ace
require(['prime/prime', 'prime/emitter', 'prime/options'], function(prime, emitter, options){
	var Human = prime({
		options: {
			name: 'unknown'
		},
		implement: [options, emitter],
		constructor: function(options){
			this.setOptions(options);
			this.trigger('ready');
		}
	});

	var bob = new Human({
		name: 'Bob',
		surname: 'Roberts',
		onReady: function(){
			console.log(this.options.name, this.options.surname);
			// this.options.onReady won't be added.
		}
	});
});
```

## Setup

```sh
# pull the deps
$ npm install

# run the tests
$ npm test

# generate docs
$ npm install -g grunt-cli
$ grunt
$ cd dist
$ python -m SimpleHTTPServer
# go to http://localhost:8000
```

## npm usage

You can install it via npm by simply doing:

```
npm install primish --save
```

Then to access it in a nodejs script:

```javascript
var prime = require('primish'),
	emitter = require('primish/emitter');

var foo = prime({

	implement: emitter

}); // etc.

```