import { h, provide, inject } from '../../lib/mini-vue.esm.js'

const Provider = {
    name: 'Provider',
    setup() {
        provide('foo', 'fooVal')
        provide('bar', 'barVal')
    },
    render() {
        return h('div', {}, [h('p', {}, 'Provider'), h(ProviderTwo)])
    }
}

const ProviderTwo = {
    name: 'ProviderTwo',
    setup() {
        provide('foo', 'fooValTwo')
        const foo = inject('foo')
        // provide('bar', 'barVal')
        return { foo }
    },
    render() {
        return h('div', {}, [h('p', {}, 'ProviderTwo' + this.foo), h(Consumer)])
    }
}

const Consumer = {
    name: 'Consumer',
    setup() {
        const foo = inject('foo')
        const bar = inject('bar')
        const baz = inject('baz', 'bazDefault')
        const baf = inject('baz', () => 'bafDefault')
        return {
            foo,
            bar,
            baz,
            baf
        }
    },
    render() {
        return h('div', {}, `Consumer-${this.foo}-${this.bar}-${this.baz}-${this.baf}`)
    }
}

export const App = {
    name: 'App',
    setup() { },
    render() {
        return h('div', {}, [h(Provider)])
    }
}