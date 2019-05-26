/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import * as React from "react"
import {
  ElementID,
  Element,
  ElementSearchResultSet,
  PluginClient,
  PluginType,
  Plugin,
  PluginModuleExport, FlipperPluginProps, Store
} from "@flipper/core"
import { FlexColumn, FlexRow, FlipperPluginComponent, Toolbar, Sidebar, Link, Glyph, DetailSidebar, styled } from "@flipper/core"
import Inspector from "./Inspector"
import ToolbarIcon from "./ToolbarIcon"
import InspectorSidebar from "./InspectorSidebar"
import Search from "./Search"
import ProxyArchiveClient from "./ProxyArchiveClient"
type State = {
  init: boolean,
  inTargetMode: boolean,
  inAXMode: boolean,
  inAlignmentMode: boolean,
  selectedElement: ElementID | null | undefined,
  selectedAXElement: ElementID | null | undefined,
  searchResults: ElementSearchResultSet | null | undefined
}
export type ElementMap = {
  [key in ElementID]: Element
}
export interface PersistedState {
  rootElement: ElementID | null | undefined
  rootAXElement: ElementID | null | undefined
  elements: ElementMap
  AXelements: ElementMap
}
const BetaBar = styled(Toolbar)({
  display: "block",
  overflow: "hidden",
  lineHeight: "15px",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis"
})

type Props = FlipperPluginProps<PersistedState>
class LayoutPlugin extends FlipperPluginComponent<Props, State, {}, PersistedState> {
  
  static id = "@flipper/plugin-inspector"
  static type = PluginType.Normal
  static exportPersistedState = (
    callClient: (a: string, b?: Plugin | null ) => Promise<PersistedState>,
    persistedState: PersistedState | null ,
    store: Store | null
  ): Promise<PersistedState | null> => {
    const defaultPromise = Promise.resolve(persistedState)

    if (!store) {
      return defaultPromise
    }

    return callClient("getAllNodes").then(({ allNodes }: any) => allNodes)
  }
  static defaultPersistedState = {
    rootElement: null,
    rootAXElement: null,
    elements: {},
    AXelements: {}
  } as PersistedState
  
  constructor(props: Props) {
    super(props)
    this.state = {
      init: false,
      inTargetMode: false,
      inAXMode: false,
      inAlignmentMode: false,
      selectedElement: null,
      selectedAXElement: null,
      searchResults: null
    }
  }
  
  

  init() {
    super.init()
    
    if (!this.props.persistedState) {
      // If the selected plugin from the previous session was layout, then while importing the flipper trace, the redux store doesn't get updated in the first render, due to which the plugin crashes, as it has no persisted state
      this.props.setPersistedState(LayoutPlugin.defaultPersistedState)
    } // persist searchActive state when moving between plugins to prevent multiple
    // TouchOverlayViews since we can't edit the view heirarchy in onDisconnect

    this.client.call("isSearchActive").then(({ isSearchActive }) => {
      this.setState({
        inTargetMode: isSearchActive
      })
    }) // disable target mode after

    this.client.subscribe("select", () => {
      if (this.state.inTargetMode) {
        this.onToggleTargetMode()
      }
    })
    this.setState({
      init: true
    })
  }

  onToggleTargetMode = () => {
    const inTargetMode = !this.state.inTargetMode
    this.setState({
      inTargetMode
    })
    this.client.send("setSearchActive", {
      active: inTargetMode
    })
  }
  onToggleAXMode = () => {
    this.setState({
      inAXMode: !this.state.inAXMode
    })
  }

  getClient(): PluginClient {
    return this.props.isArchivedDevice ? new ProxyArchiveClient(this.props.persistedState) : this.client
  }

  onToggleAlignmentMode = () => {
    if (this.state.selectedElement) {
      this.client.send("setHighlighted", {
        id: this.state.selectedElement,
        inAlignmentMode: !this.state.inAlignmentMode
      })
    }

    this.setState({
      inAlignmentMode: !this.state.inAlignmentMode
    })
  }
  onDataValueChanged = (path: Array<string>, value: any) => {
    const id = this.state.inAXMode ? this.state.selectedAXElement : this.state.selectedElement
    this.client.call("setData", {
      id,
      path,
      value,
      ax: this.state.inAXMode
    })
  }

  render() {
    const inspectorProps = {
      client: this.getClient(),
      inAlignmentMode: this.state.inAlignmentMode,
      selectedElement: this.state.selectedElement,
      selectedAXElement: this.state.selectedAXElement,
      setPersistedState: this.props.setPersistedState,
      persistedState: this.props.persistedState,
      onDataValueChanged: this.onDataValueChanged,
      searchResults: this.state.searchResults
    }
    let element

    if (this.state.inAXMode && this.state.selectedAXElement) {
      element = this.props.persistedState.AXelements[this.state.selectedAXElement]
    } else if (this.state.selectedElement) {
      element = this.props.persistedState.elements[this.state.selectedElement]
    }

    const inspector = (
      <Inspector
        {...inspectorProps}
        onSelect={selectedElement =>
          this.setState({
            selectedElement
          })
        }
        showsSidebar={!this.state.inAXMode}
      />
    )
    return (
      <FlexColumn grow={true}>
        {this.state.init && (
          <>
            <Toolbar>
              {!this.props.isArchivedDevice && (
                <ToolbarIcon
                  onClick={this.onToggleTargetMode}
                  title="Toggle target mode"
                  icon="target"
                  active={this.state.inTargetMode}
                />
              )}
              {this.realClient.query.os === "Android" && (
                <ToolbarIcon
                  onClick={this.onToggleAXMode}
                  title="Toggle to see the accessibility hierarchy"
                  icon="accessibility"
                  active={this.state.inAXMode}
                />
              )}
              {!this.props.isArchivedDevice && (
                <ToolbarIcon
                  onClick={this.onToggleAlignmentMode}
                  title="Toggle AlignmentMode to show alignment lines"
                  icon="borders"
                  active={this.state.inAlignmentMode}
                />
              )}

              <Search
                client={this.getClient()}
                setPersistedState={this.props.setPersistedState}
                persistedState={this.props.persistedState}
                onSearchResults={searchResults =>
                  this.setState({
                    searchResults
                  })
                }
                inAXMode={this.state.inAXMode}
              />
            </Toolbar>

            <FlexRow grow={true}>
              {this.state.inAXMode ? (
                <>
                  <Sidebar position="left" maxWidth={Infinity}>
                    {inspector}
                  </Sidebar>
                  <Inspector
                    {...inspectorProps}
                    onSelect={selectedAXElement =>
                      this.setState({
                        selectedAXElement
                      })
                    }
                    showsSidebar={true}
                    ax
                  />
                </>
              ) : (
                inspector
              )}
            </FlexRow>
            <DetailSidebar>
              <InspectorSidebar
                client={this.getClient()}
                realClient={this.realClient}
                element={element}
                onValueChanged={this.onDataValueChanged}
                logger={this.props.logger}
              />
            </DetailSidebar>
          </>
        )}
        {/* TODO: Remove this when rolling out publicly */}
        <BetaBar position="bottom" compact>
          <Glyph name="beta" color="#8157C7" />
          &nbsp;
          <strong>Version 2.0:</strong>&nbsp; Provide feedback about this plugin in our&nbsp;
          <Link href="https://fb.workplace.com/groups/246035322947653/">feedback group</Link>.
        </BetaBar>
      </FlexColumn>
    )
  }
}

export default {
  id: LayoutPlugin.id,
  type: LayoutPlugin.type,
  componentClazz: LayoutPlugin
} as PluginModuleExport<typeof LayoutPlugin>