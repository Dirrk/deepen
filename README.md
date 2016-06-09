DepenPen
=====

Another dependency injection module? why not

Example:

```
const lodash = require('lodash'),
      bluebird = require('bluebird'),
      dp = require('depenpen')();

let barModel = {
  text: 'hello world!'
};
barModel.$name = 'BarModel';
barModel.$single = true;
barModel.$deps = ['_'];
barModel.$register = (dp) => {
  let _ = dp.resolver('_');
  barModel.text = _.startCase(barModel.text);
};
barModel.$after = (_) => {
  console.log('before: ' + barModel.text + ' after: ' + _.camelCase(barModel.text));
};

let fooModule = function Foo (promise) {
  this.bar = (text) => {
      return promise.resolve(text.toUpperCase());
  };
};
fooModule.$name = 'Foo';
fooModule.$deps = ['Promise'];
fooModule.$exports = [barModel];


dp.add(bluebird, { $name: 'Promise', $deps: [], $single: true});
dp.add(lodash, { $name: '_', $deps: [], $single: true});
dp.add(fooModule);

dp.finish();

let foo = dp.resolver('Foo');
foo.bar('hi')
  .then((text) => {
      console.log(text);
  });
```

Outputs:
```
before: Hello World after: helloWorld
HI
```

Documentation (Look in code or I can copy pasta below)
```
/**
 * DependencyExportRequest - Object containing dependency / options
 * @typedef {Object} DependencyExportRequest
 * @property {Dependency} $dependency - Dependency
 * @property {DependencyOptions} [$options] - Dependency Options
 */

/**
 * DependencyOptions - Options for a dependency if not provided the required options
 * must be properties on the dependency itself.
 * @typedef {Object} DependencyOptions
 * @property {string} $name - Name / Unique Key
 * @property {Array<string>} [$deps] - Array of dependencies required using their name
 * @property {boolean} [$single] - If the dependency is a singleton defaults to false
 * @property {Array<Dependency|DependencyExportRequest>} [$exports] - Defines other dependencies that this dependency wants to register with the DependencyResolver
 * @property {function} [$register] - Function called when added to the DependencyResolver but after all exports are added.  The dependency resolver is passed in as the only argument
 * @property {function} [$after] - Function called after DependencyResolver.finish() is called
 */

/**
 * Dependency - Singleton Object or Function that should extend DependencyOptions
 * if none will be passed to DependencyResolver.add()
 * - If no options are provided to the add function, they must be set as properties on this object
 * - Unless single is set to true, Function will be called with New operator
 * @typedef {Object|Function} Dependency
 * @see {DependencyOptions}
 */

/**
 * DependencyResolver - Stores / Resolves Dependencies
 * @method add - Adds dependencies to the container
 * @method resolver - Resolves a dependency by name
 * @method finish - Calls after on all dependencies that have an after
 * @return {DependencyResolver}  DependencyResolver
 */

     /**
      * add - Adds dependencies to the container
      *
      * @param  {Dependency} dep     Object or Constructor
      * @param  {DependencyOptions} [options] Options for dependency if not attached to Constructor
      */

      /**
       * resolver - Resolves a dependency from the container by the dependency name
       *
       * @param {string} key - the name of the dependency to resolve
       * @throws If key is not found
       * @return {Object|Instance<T>|Function} - Can return an object/function if $single = true
       * otherwise it creates a new Instance of the found dependency
       */

       /**
        * finish - Should be called after your code has added all of the required dependencies
        * - It will call the after function with the dependencies that were defined in $deps
        * - It will overwrite the $after method to an empty function after completion to ensure it never runs again
        */
 ```
