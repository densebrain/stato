/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import * as React from "react"
import styled from "../styled/index"
import { Component } from "react"
const IFrame = styled("iframe")({
  height: "100%",
  width: "100%",
  border: "none",
  background: "transparent",
  position: "absolute",
  zIndex: -1,
  top: 0,
  left: 0
})
/**
 * Listener for resize events.
 */

export default class ResizeSensor extends Component<{
  onResizeAnimation: (time: number) => void
}> {
  iframe: HTMLIFrameElement | null | undefined
  setRef = (ref: HTMLIFrameElement | null | undefined) => {
    this.iframe = ref
  }

  render() {
    return <IFrame innerRef={this.setRef} />
  }

  componentDidMount() {
    const { iframe } = this

    if (iframe != null) {
      iframe.contentWindow.addEventListener("resize", this.handleResize)
    }
  }

  componentWillUnmount() {
    const { iframe } = this

    if (iframe != null) {
      iframe.contentWindow.removeEventListener("resize", this.handleResize)
    }
  }

  handleResize = () => {
    window.requestAnimationFrame(this.props.onResizeAnimation)
  }
}