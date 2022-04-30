import {
    h
} from '/lib/mini-vue.esm.js'
export const Child = {
    setup() {
        return {}
    },
    render() {
        return h('div', {}, this.$props.msg)
    }
}