/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
export function getUser() {
  return Promise.reject()
}

// @ts-ignore
export async function graphQLQuery(query: string) {
  return Promise.reject()
}
export function logoutUser(): Promise<void> {
  return Promise.reject()
}


export async function shareFlipperData(
  // @ts-ignore
  trace: string
): Promise<
  {
      id: string,
      os: "string",
      deviceType: string,
      plugins: string[],
      fileUrl: string,
      flipperUrl: string
    }
> {
  new Notification("Feature not implemented")
  return Promise.reject()
}
// @ts-ignore
export async function writeKeychain(token: string) {
  return Promise.reject()
}
