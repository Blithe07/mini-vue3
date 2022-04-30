import {
    h, createTextVnode
} from '/lib/mini-vue.esm.js'
import { Foo } from './Foo.js'
export const App = {
    render() {
        const app = h('div', {}, 'App')
        const foo = h(Foo, {}, {
            header: ({ age }) => [h('div', {}, 'header' + age), createTextVnode('hello')],
            footer: () => h('div', {}, 'footer')
        })
        return h('div', {}, [app, foo])
    },
    setup() {
        return {
            msg: 'hello world'
        }
    }
}