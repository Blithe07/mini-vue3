import {
    h, ref
} from '/lib/mini-vue.esm.js'
export const App = {
    render() {
        return h('div', { ...this.props }, [
            h('div', {}, 'count:' + this.count),
            h('button', { onClick: this.onClick }, 'click'),
            h('button', { onClick: this.changePropsDemo1 }, 'changePropsDemo1'),
            h('button', { onClick: this.changePropsDemo2 }, 'changePropsDemo2'),
            h('button', { onClick: this.changePropsDemo3 }, 'changePropsDemo3'),
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