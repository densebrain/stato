/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import { Store } from "../reducers/index"
import { Logger } from "../fb-interfaces/Logger"
// import { login } from "../reducers/user"
// import { getUser, logoutUser } from "../fb-stubs/user"
export default async function(_store: Store, _logger: Logger) {
  // getUser()
  //   .then(user => {
  //     store.dispatch(login(user))
  //   })
  //   .catch(console.debug)
  // let prevUserName = store.getState().user.name
  // store.subscribe(() => {
  //   if (prevUserName && !store.getState().user.name) {
  //     logoutUser()
  //   }
  //
  //   prevUserName = store.getState().user.name
  // })
}
