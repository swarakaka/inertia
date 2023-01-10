import { createHeadManager, Page, router } from '@swarakaka/core'
import {
  DefineComponent,
  defineComponent,
  h,
  markRaw,
  Plugin,
  PropType,
  ref,
  nextTick,
} from 'vue'
import remember from './remember'
import { VuePageHandlerArgs } from './types'
import useForm from './useForm'
import {DialogPayload} from "@swarakaka/core";
import cloneDeep from 'lodash.clonedeep'

export interface InertiaAppProps {
  initialPage: Page
  initialComponent?: object
  resolveComponent?: (name: string) => DefineComponent | Promise<DefineComponent>
  titleCallback?: (title: string) => string
  onHeadUpdate?: (elements: string[]) => void
}

export type InertiaApp = DefineComponent<InertiaAppProps>

const page = ref<Partial<Page>>({})
const pageKey = ref(null)
const pageComponent = ref(null)

const dialog = ref<Partial<DialogPayload>>({})
const dialogKey = ref(null)
const dialogComponent = ref(null)
let headManager = null

const App: InertiaApp = defineComponent({
  name: 'Inertia',
  props: {
    initialPage: {
      type: Object as PropType<Page>,
      required: true,
    },
    initialComponent: {
      type: Object,
      required: false,
    },
    resolveComponent: {
      type: Function as PropType<(name: string) => DefineComponent | Promise<DefineComponent>>,
      required: false,
    },
    titleCallback: {
      type: Function as PropType<(title: string) => string>,
      required: false,
      default: (title) => title,
    },
    onHeadUpdate: {
      type: Function as PropType<(elements: string[]) => void>,
      required: false,
      default: () => () => {},
    },
  },
  setup({ initialPage, initialComponent, resolveComponent, titleCallback, onHeadUpdate }) {
    pageComponent.value = initialComponent ? markRaw(initialComponent) : null
    pageKey.value = null
    page.value = initialPage

    const isServer = typeof window === 'undefined'
    headManager = createHeadManager(isServer, titleCallback, onHeadUpdate)

    if (!isServer) {
      router.init({
        initialPage,
        resolveComponent,
        swapComponent: async (args: VuePageHandlerArgs) => {
          const { dialog: _dialog, ..._page } = args.page

          page.value = _page
          pageKey.value = (args.preserveState || args.dialogComponent) ? pageKey.value : Date.now()
          pageComponent.value = markRaw(args.component)

          if (args.dialogComponent) {
            nextTick(() => {
              function shouldAppear() {
                const {dialogKey: newKey} = args.dialogComponent
                const currentKey = [dialogComponent.value || {}, ...Object.values(dialogComponent.value?.components || {})].find(component => component.dialogKey)?.dialogKey

                return !_dialog.eager &&
                    !(dialog.value.open &&
                        (_dialog.component === dialog.value.component || (newKey && currentKey && newKey === currentKey))
                    )
              }

              dialog.value = { ...cloneDeep(_dialog), open: true, appear: shouldAppear() }
              dialogKey.value = (args.preserveState && args.dialogComponent) ? dialogKey.value : Date.now()
              dialogComponent.value = markRaw(args.dialogComponent)
            })
          } else if (dialog.value.open === true) {
            dialog.value.open = false
          }
        },
      })

      router.on('navigate', () => headManager.forceUpdate())
    }


      function renderPage() {
        pageComponent.value.inheritAttrs = !!pageComponent.value.inheritAttrs

        return h(pageComponent.value, {
          ...page.value.props,
          dialog: false,
          key: pageKey.value,
        })
      }

    function renderLayout(child) {
      if (typeof pageComponent.value.layout === 'function') {
        return pageComponent.value.layout(h, child)
      } else if (Array.isArray(pageComponent.value.layout)) {
        return pageComponent.value.layout
            .concat(child)
            .reverse()
            .reduce((child, layout) => {
              layout.inheritAttrs = !!layout.inheritAttrs
              return h(layout, { ...page.value.props }, () => child)
            })
      }
      return [
        h(pageComponent.value.layout, { ...page.value.props }, () => child),
        renderDialog(),
      ]
    }

      function renderDialog() {
        return dialogComponent.value ? h(dialogComponent.value, {
          ...dialog.value.props,
          key: dialogKey.value,
        }) : null
      }

      return () => {
        if (pageComponent.value) {
          const page = renderPage()

          if (pageComponent.value.layout) {
            return renderLayout(page)
        }

        return [page, renderDialog()]
      }
    }
  },
})
export default App

export const plugin: Plugin = {
  install(app) {
    router.form = useForm

    Object.defineProperty(app.config.globalProperties, '$inertia', { get: () => router })
    Object.defineProperty(app.config.globalProperties, '$page', { get: () => page.value })
    Object.defineProperty(app.config.globalProperties, '$dialog', { get: () => dialog.value })
    Object.defineProperty(app.config.globalProperties, '$headManager', { get: () => headManager })

    app.mixin(remember)
  },
}

export function usePage() {
  return page.value
}
