/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import FlexBox from "./FlexBox"
import styled from "../styled/index"
import { makeRootView } from "./RootView"
/**
 * A container displaying its children in a row
 */

export default makeRootView(
  theme => ({
    flexDirection: "row"
  }),
  FlexBox
)
