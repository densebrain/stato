/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import { PureComponent } from "react"
import styled from "../styled/index"
import * as React from 'react'

type CheckboxProps = {
  checked: boolean,
  onChange: (checked: boolean) => void
}
const CheckboxContainer = styled("input")({
  display: "inline-block",
  marginRight: 5,
  verticalAlign: "middle"
})
/**
 * A checkbox to toggle UI state
 */

export default class Checkbox extends PureComponent<CheckboxProps> {
  onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    this.props.onChange(e.target.checked)
  }

  render() {
    return <CheckboxContainer
      type="checkbox"
      checked={this.props.checked}
      onChange={this.onChange} />
  }
}
