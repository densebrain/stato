/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import { FlipperPluginComponent } from "../../plugin"
import {PluginModuleExport} from "../../PluginTypes"
class TestPluginComponent extends FlipperPluginComponent {
  static id = "Static ID"
}
export default {
  id: TestPluginComponent.id,
  title: TestPluginComponent.id,
  componentClazz: TestPluginComponent
} as PluginModuleExport<typeof TestPluginComponent>