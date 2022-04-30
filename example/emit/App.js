import {
    h
} from '/lib/mini-vue.esm.js'
import {
    Foo
} from './Foo.js'
export const App = {
    render() {
        console.log(Foo)
        return h('div', {}, [h('div', {}, 'App'), h(Foo, { onAdd: (a, b) => { console.log('parent add', a, b); }, onAddFoo: () => { console.log('parent1 add') } })])
    },
    setup() {
        return {
            msg: 'hello world'
        }
    }
}