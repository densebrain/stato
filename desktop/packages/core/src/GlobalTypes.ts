import "@flipper/common"
import {Store} from "./reducers"

declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__:any
    electronRequire: NodeRequire
    flipperStore: Store
  }
  
  namespace NodeJS {
    interface Global {
      electronRequire: NodeRequire
      flipperStore: Store
      __VERSION__:string
      __REVISION__:string | undefined
    }
  }
  
  const nodeRequire: NodeRequire
  
  namespace PQueue {
    interface DefaultAddOptions {
      priority?: number
      [key: string]: unknown
    }
  }
}

Object.assign(global, {
  nodeRequire: __non_webpack_require__
})

export {

}
