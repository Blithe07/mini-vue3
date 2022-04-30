import {
    h, ref
} from '/lib/mini-vue.esm.js'
import { Child } from './Child.js'
export const App = {
    render() {
        return h('div', {}, [
            h('div', {}, 'count:' + this.count),
            h('button', { onClick: this.onClick }, 'change count'),
            h(Child, { msg: this.msg }),
            h('button', { onClick: this.changeChildProps }, 'change props'),
        ])
    },
    setup() {
        const count = ref(0)
        const onClick = () => {
            count.value++
        }
        const msg = ref('123')
        const changeChildProps = () => {
            msg.value = '456'
        }
        return {
            count,
            onClick,
            msg,
            changeChildProps
        }
    }
}