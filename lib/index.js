'use strict';

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
module.exports = function DependencyResolver () {

    // This is a singleton
    const self = {};

    /** @private Cointainer **/
    let dependencies = {};


    /**
     * add - Adds dependencies to the container
     *
     * @param  {Dependency} dep     Object or Constructor
     * @param  {DependencyOptions} [options] Options for dependency if not attached to Constructor
     */
    self.add = function add (dep, options) {
        var newDep = options || dep;

        if (newDep.$name && !dependencies[newDep.$name]) {
            let tmp = {
                ctr: dep,
                $name: newDep.$name,
                $deps: newDep.$deps || [],
                $single: !!newDep.$single,
                $exports: newDep.$exports,
                $register: newDep.$register,
                $after: newDep.$after
            };

            if (typeof dep !== 'function') {
                tmp.$single = true;
            }

            dependencies[newDep.$name] = tmp;

            if (newDep.$exports && newDep.$exports.length) {
                newDep.$exports.forEach((exp) => {

                    if (exp.$dependency) {
                        return self.add(exp.$dependency, exp.$options);
                    }

                    self.add(exp);
                });
            }

            if (newDep.$register &&  typeof newDep.$register === 'function') {
                newDep.$register.call(dependencies[newDep.$name], self);
            }
        }
    };

    /**
     * resolver - Resolves a dependency from the container by the dependency name
     *
     * @param {string} key - the name of the dependency to resolve
     * @throws If key is not found
     * @return {Object|Instance<T>|Function} - Can return an object/function if $single = true
     * otherwise it creates a new Instance of the found dependency
     */
    self.resolver = function resolver (key) {
        if (!dependencies[key]) {
            throw new Error('Dependency was not found: ' + key);
        }

        let args = [];

        dependencies[key].$deps.forEach((subdep) => {
            args.push(self.resolver(subdep));
        });

        if (dependencies[key].$single) {
            return dependencies[key].ctr;
        }

        // This is a pass through constructor that allows us to call new on the provided constructor
        function F(pass) {
            return dependencies[key].ctr.apply(this, pass);
        }
        F.prototype = dependencies[key].ctr.prototype;

        return new F(args);
    };


    /**
     * finish - Should be called after your code has added all of the required dependencies
     * - It will call the after function with the dependencies that were defined in $deps
     * - It will overwrite the $after method to an empty function after completion to ensure it never runs again
     */
    self.finish = function finish () {

        // Iterate through all dependencies
        Object.keys(dependencies).forEach((key) => {
            // Do they have an after?
            if (dependencies[key].$after && typeof dependencies[key].$after === 'function') {

                let args = [];

                dependencies[key].$deps.forEach((subdep) => {
                    args.push(self.resolver(subdep));
                });

                dependencies[key].$after.apply(dependencies[key], args);
                dependencies[key].$after = () => {};
            }
        });
    };

    // Add this as a dependency
    dependencies.DependencyResolver = {
        ctr: self,
        $name: 'DependencyResolver',
        $deps: [],
        $single: true
    };

    return self;
};
