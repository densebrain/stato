/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */

import * as React from 'react';
import {FlexColumn, FlexRow} from './ui';
import {connect} from 'react-redux';
import WelcomeScreen from './chrome/WelcomeScreen.js';
import TitleBar from './chrome/TitleBar.js';
import MainSidebar from './chrome/MainSidebar.js';
import BugReporterDialog from './chrome/BugReporterDialog.js';
import ErrorBar from './chrome/ErrorBar.js';
import ShareSheet from './chrome/ShareSheet.js';
import SignInSheet from './chrome/SignInSheet.js';
import ShareSheetExportFile from './chrome/ShareSheetExportFile.js';
import PluginContainer from './PluginContainer.js';
import Sheet from './chrome/Sheet.js';
import {ipcRenderer, remote} from 'electron';
import PluginDebugger from './chrome/PluginDebugger.js';
import {
  ACTIVE_SHEET_BUG_REPORTER,
  ACTIVE_SHEET_PLUGIN_DEBUGGER,
  ACTIVE_SHEET_SHARE_DATA,
  ACTIVE_SHEET_SIGN_IN,
  ACTIVE_SHEET_SHARE_DATA_IN_FILE,
} from './reducers/application.js';

import type {Logger} from './fb-interfaces/Logger.js';
import type BugReporter from './fb-stubs/BugReporter.js';
import type BaseDevice from './devices/BaseDevice.js';
import type {ActiveSheet} from './reducers/application.js';
import {ThemeProvider} from '@material-ui/styles';
import {Themes} from './ui/themes';
import styled from './ui/styled';

const version = remote.app.getVersion();

type OwnProps = {|
  logger: Logger,
  bugReporter: BugReporter,
|};

type Props = {|
  ...OwnProps,
  leftSidebarVisible: boolean,
  selectedDevice: ?BaseDevice,
  theme: string,
  error: ?string,
  activeSheet: ActiveSheet,
  exportFile: ?string,
|};

const RootContainer = styled(FlexColumn)(({theme}) => ({
  backgroundColor: theme.colors.background
}));

export class App extends React.Component<Props> {
  componentDidMount() {
    // track time since launch
    const [s, ns] = process.hrtime();
    const launchEndTime = s * 1e3 + ns / 1e6;
    ipcRenderer.on('getLaunchTime', (event, launchStartTime) => {
      this.props.logger.track(
        'performance',
        'launchTime',
        launchEndTime - launchStartTime,
      );
    });
    ipcRenderer.send('getLaunchTime');
    ipcRenderer.send('componentDidMount');
  }
  
  getSheet = (onHide: () => mixed) => {
    if (this.props.activeSheet === ACTIVE_SHEET_BUG_REPORTER) {
      return (
        <BugReporterDialog
          bugReporter={this.props.bugReporter}
          onHide={onHide}
        />
      );
    } else if (this.props.activeSheet === ACTIVE_SHEET_PLUGIN_DEBUGGER) {
      return <PluginDebugger onHide={onHide}/>;
    } else if (this.props.activeSheet === ACTIVE_SHEET_SHARE_DATA) {
      return <ShareSheet onHide={onHide}/>;
    } else if (this.props.activeSheet === ACTIVE_SHEET_SIGN_IN) {
      return <SignInSheet onHide={onHide}/>;
    } else if (this.props.activeSheet === ACTIVE_SHEET_SHARE_DATA_IN_FILE) {
      const {exportFile} = this.props;
      if (!exportFile) {
        throw new Error('Tried to export data without passing the file path');
      }
      return <ShareSheetExportFile onHide={onHide} file={exportFile}/>;
    } else {
      // contents are added via React.Portal
      return null;
    }
  };
  
  render() {
    const {theme, leftSidebarVisible, logger, selectedDevice} = this.props;
    return (
      <ThemeProvider theme={Themes[theme]}>
        <RootContainer grow={true}>
          <TitleBar version={version}/>
          <Sheet>{this.getSheet}</Sheet>
          <FlexRow grow={true}>
            {leftSidebarVisible && <MainSidebar/>}
            {selectedDevice ? (
              <PluginContainer logger={logger}/>
            ) : (
              <WelcomeScreen/>
            )}
          </FlexRow>
          <ErrorBar text={this.props.error}/>
        </RootContainer>
      </ThemeProvider>
    );
  }
}

export default connect<Props, OwnProps, _, _, _, _>(
  ({
     application: {theme, leftSidebarVisible, activeSheet, exportFile},
     connections: {selectedDevice, error},
   }) => ({
    leftSidebarVisible,
    selectedDevice,
    activeSheet,
    theme,
    exportFile,
    error,
  }),
)(App);