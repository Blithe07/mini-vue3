import {
    h
} from '/lib/mini-vue.esm.js'
import {Foo} from './Foo.js'
export const App = {
    render() {
        return h('div', {
            id: 'root',
            class: ['red', 'hard'],
            onClick: () => {
                console.log('click')
            }
        }, [h('p', {
            id: 'p1',
            class: 'red'
        }, 'mini'), h('p', {
            class: 'blue'
        }, '-vue'), h('p', {}, this.msg), h(Foo, {
            count: 1
        })])
    },
    setup() {
        return {
            msg: 'hello world'
        }
    }
}