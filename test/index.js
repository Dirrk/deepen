'use strict';

/* globals describe, it, beforeEach, afterEach */

// retrieve shouldjs
require('should');

let sinon = require('sinon'),
    bluebird = require('bluebird'),
    lodash = require('lodash');

describe('depenpen', function () {

    this.timeout(500);
    const sandbox = sinon.sandbox.create();

    let dp;

    beforeEach((done) => {
        dp = require('../lib')();
        done();
    });

    afterEach((done) => {
        sandbox.restore();
        done();
    });

    it('should return an object with methods add/resolver/finish', (done) => {

        dp.should.have.properties(['add', 'resolver', 'finish']);
        done();
    });

    it('should resolve a dependency by name', (done) => {

        let dep = dp.resolver('DependencyResolver');
        dep.should.have.properties(['add', 'resolver', 'finish']);
        done();
    });

    it('should add an object dependency and resolve it', (done) => {

        let dep = {
            test: true,
            $name: 'testTrue'
        };
        dp.add(dep);
        dp.resolver('testTrue').test.should.be.true();
        done();
    });

    it('should add a singleton function dependency and resolve it', (done) => {

        let dep = sandbox.spy();
        let depOptions = {
            $name: 'testTrue',
            $single: true
        };

        dp.add(dep, depOptions);
        dp.resolver('testTrue').should.equal(dep);
        dep.called.should.be.false();
        done();
    });

    it('should add a constructor dependency and resolve a new instance', (done) => {

        let dep = sandbox.spy();
        let depOptions = {
            $name: 'testTrue'
        };

        dp.add(dep, depOptions);
        dp.resolver('testTrue').should.not.equal(dep);
        dep.called.should.be.true();
        dep.calledWithNew().should.be.true();
        done();
    });

    it('should add a constructor dependency with the correct dependencies', (done) => {

        let dep = sandbox.spy();
        let depOptions = {
            $name: 'testTrue',
            $deps: ['_']
        };

        dp.add(lodash, { $name: '_', $deps: [], $single: true});
        dp.add(dep, depOptions);
        dp.resolver('testTrue').should.not.equal(dep);
        dep.calledWithNew().should.be.true();
        dep.calledOnce.should.be.true();
        dep.firstCall.args[0].should.equal(lodash);
        done();
    });

    it('should add exports', (done) => {

        let dep = sandbox.spy();
        let depOptions = {
            $name: 'testTrue',
            $deps: ['_'],
            $exports: [
                { $dependency: bluebird, $options: { $name: 'Promise', $single: true }},
                { $dependency: { $name: 'withoutOptions', test: true }},
                { $name: 'withoutDependency', $single: true, test2: true }
            ]
        };

        dp.add(lodash, { $name: '_', $deps: [], $single: true});
        dp.add(dep, depOptions);
        dp.resolver('Promise').should.equal(bluebird);
        dp.resolver('withoutOptions').test.should.be.true();
        dp.resolver('withoutDependency').test2.should.be.true();
        done();
    });

    it('should call register function with the DependencyResolver', (done) => {

        let dep = { text: 'it-worked' },
            depOptions,
            camelStub;

        depOptions = {
            $name: 'testTrue',
            $deps: ['Promise', '_'],
            $register: (dp) => {
                let _ = dp.resolver('_');
                dep.text2 = _.camelCase(dep.text);
            }
        };

        camelStub = sandbox.stub(lodash, 'camelCase').returns('itWorked');

        dp.add(lodash, { $name: '_', $deps: [], $single: true});
        dp.add(bluebird, { $name: 'Promise', $deps: [], $single: true});
        dp.add(dep, depOptions);

        camelStub.calledOnce.should.be.true();
        dep.text2.should.equal('itWorked');
        dp.resolver('testTrue').text2.should.equal('itWorked');

        done();
    });

    it('should call after function with dependencies when finish is called', (done) => {

        let dep = { text: 'it-worked' },
            depOptions,
            camelStub;

        depOptions = {
            $name: 'testTrue',
            $deps: ['Promise', '_'],
            $after: (prom, _) => {
                dep.text2 = _.camelCase(dep.text);
            }
        };

        camelStub = sandbox.stub(lodash, 'camelCase').returns('itWorked');

        dp.add(lodash, { $name: '_', $deps: [], $single: true});
        dp.add(bluebird, { $name: 'Promise', $deps: [], $single: true});
        dp.add(dep, depOptions);
        dp.finish();

        camelStub.calledOnce.should.be.true();
        dep.text2.should.equal('itWorked');
        dp.resolver('testTrue').text2.should.equal('itWorked');
        done();
    });

    it('should only call after function once when finish is called twice', (done) => {

        let dep = { text: 'it-worked' },
            depOptions,
            camelStub;

        depOptions = {
            $name: 'testTrue',
            $deps: ['Promise', '_'],
            $after: (prom, _) => {
                dep.text2 = _.camelCase(dep.text);
            }
        };

        camelStub = sandbox.stub(lodash, 'camelCase').returns('itWorked');

        dp.add(lodash, { $name: '_', $deps: [], $single: true});
        dp.add(bluebird, { $name: 'Promise', $deps: [], $single: true});
        dp.add(dep, depOptions);
        dp.finish();
        dp.finish();

        camelStub.calledOnce.should.be.true();
        dep.text2.should.equal('itWorked');
        dp.resolver('testTrue').text2.should.equal('itWorked');
        done();
    });

    it('should throw error when not able to be resolved', (done) => {
        (() => { dp.resolver('testTrue2'); }).should.throw();
        done();
    });

    it('should work for the example test in readme', (done) => {

        let logStub = sandbox.stub(console, 'log');
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
        return foo.bar('hi')
            .then((text) => {
                text.should.equal('HI');
                logStub.calledOnce.should.be.true();
                logStub.restore();
                done();
            });
    });
});
