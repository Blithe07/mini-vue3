import {
    h, ref
} from '/lib/mini-vue.esm.js'
import ArrayToText from './ArrayToText.js'
import TextToText from './TextToText.js'
import ArrayToArray from './ArrayToArray.js'
export const App = {
    render() {
        return h('div', {}, [
            h('p', {}, '主页'),
            // h(ArrayToText),
            // h(TextToText),
            h(ArrayToArray)
        ])
    },
    setup() {
        const count = ref(0)
        const onClick = () => {
            count.value++
        }
        const props = ref({
            foo: 'foo',
            bar: 'bar'
        })
        const changePropsDemo1 = () => {
            props.value.foo = 'new-foo'
        }
        const changePropsDemo2 = () => {
            props.value.foo = undefined
        }
        const changePropsDemo3 = () => {
            props.value = {
                newFoo: 'foo'
            }
        }
        return {
            count,
            onClick,
            props,
            changePropsDemo1,
            changePropsDemo2,
            changePropsDemo3
        }
    }
}