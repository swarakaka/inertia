import { createHeadManager, Page, PageHandler, router } from '@swarakaka/core'
import { ComponentPublicInstance } from 'vue'
import useForm from './useForm'

export interface DialogComponentInterface extends Promise<ComponentPublicInstance>{
    dialogKey?: String | unknown
}

export type VuePageHandlerArgs = Parameters<PageHandler>[0] & {
    component: ComponentPublicInstance | Promise<ComponentPublicInstance>
    page: Page
    dialogComponent: DialogComponentInterface
}

declare module '@swarakaka/core' {
    export interface Router {
        form: typeof useForm
    }
}

declare module '@vue/runtime-core' {
    export interface ComponentCustomProperties {
        $inertia: typeof router
        $page: Page
        $headManager: ReturnType<typeof createHeadManager>
    }

    export interface ComponentCustomOptions {
        remember?:
            | string
            | string[]
            | {
            data: string | string[]
            key?: string | (() => string)
        }
    }
}
