import {
    h, ref, getCurrentInstance, nextTick
} from '/lib/mini-vue.esm.js'
export const App = {
    render() {
        return h('div', {}, [
            h('div', {}, 'count:' + this.count),
            h('button', { onClick: this.onClick }, 'click')
        ])
    },
    setup() {
        const count = ref(0)
        const instance = getCurrentInstance()
        const onClick = () => {
            for (let i = 0; i < 100; i++) {
                count.value++
            }
            debugger
            console.log(instance);
            nextTick(() => {
                console.log(instance)
            })
        }
        return {
            count,
            onClick,
        }
    }
}