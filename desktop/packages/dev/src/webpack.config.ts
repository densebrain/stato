import {getLogger} from "@flipper/common"
import * as Path from "path"
import * as Fs from "fs"
import {coreDir, packageDir, appDir, rootDir} from "./dirs"
import webpack, { ExternalsElement } from "webpack"
import ForkTsCheckerPlugin from "fork-ts-checker-webpack-plugin"

import HtmlWebpackPlugin from "html-webpack-plugin"
import {
  makeCommonExternals,
  ReactExternals,
  WebpackHotWhitelist
} from "./webpack.config.externals"

import moduleConfig from "./webpack.config.module"
import IgnoreNotFoundExportPlugin from "./webpack.plugin.ignore-export"

//const LabeledModulesPlugin = require("webpack/lib/NamedModulesPlugin")

type Mode = "development" | "production"

type PluginConfig = {
  name: string
  dir: string
}

const
  log = getLogger(__filename)
  

let mode: Mode = "development"
let port = 3000

const devTools: { [mode in Mode]: webpack.Options.Devtool } = {
  development: "inline-source-map",
  production: "#source-map"
}

const nodeConfig = {
  global: true,
  process: true,
  //console: true,
  __filename: true
  //setImmediate: true
}

const resolveConfig = {
  extensions: [".ts", ".tsx", ".js", ".jsx"],
  alias: {
    "@flipper/common": Path.resolve(packageDir, "common","src","index.ts"),
    //"@flipper/core": Path.resolve(packageDir, "core","src","index.ts"),
    "react-dom": "@hot-loader/react-dom",
    jss: Path.resolve(rootDir, "node_modules", "jss"),
    assets: Path.resolve(coreDir, "assets")
  }
}

const plugins = Fs.readdirSync(packageDir)
  .filter(name => name.startsWith("plugin-"))
  .reduce(
    (acc, name) => {
      const dir = Path.resolve(packageDir, name)
      acc[name] = {
        name,
        dir
      }
      return acc
    },
    {} as { [key: string]: PluginConfig }
  )

async function generatePluginConfigs() {
  return Promise.all(Object.values(plugins).map(plugin => createPluginConfig(plugin)))
}

function makeDefaultConfig(
  name: string,
  context: string,
  entry: string[],
  target: "node" | "electron-renderer",
  externals: ExternalsElement | ExternalsElement[],
  plugins: webpack.Plugin[]
) {
  return applyMode(name, {
    name,
    mode,
    cache: true,
    context,
    entry,
    target,
    module: moduleConfig,
    resolve: resolveConfig,
    output: {
      libraryTarget: "commonjs2",
      path: Path.resolve(context, "dist"),
      publicPath: "",
      filename: "bundle.js"
    },
    devtool: devTools[mode],
    externals,
    optimization: {
      namedModules: true,
      noEmitOnErrors: true
    },
    node: nodeConfig,

    plugins: [
      new webpack.DefinePlugin({
        "process.env.PluginModuleWhitelist": JSON.stringify(getWhitelistIds()),
        isDev: JSON.stringify(mode === "development")
      }),
      new IgnoreNotFoundExportPlugin(),
      new ForkTsCheckerPlugin(),
      ...plugins
    ]
  })
}

function createAppConfig(): webpack.Configuration {
  const name = "app"
  return makeDefaultConfig(
    name,
    appDir,
    ["./src/index"],
    "node",
    [
      // /^\@flipper/,
      ...ReactExternals,
      /electron/,
      /source-map-support/,
      ...makeCommonExternals(appDir, [...WebpackHotWhitelist, /flipper/])
    ],
    []
  )
}

function getWhitelistIds() {
  return ['react',
    'react-dom',
    'react-hot-loader',
    '@hot-loader/react-dom',
  
    '@material-ui/styles/ThemeContext',
    '@material-ui/styles/withStyles',
    '@material-ui/styles',
    '@material-ui/core',
    '@material-ui/core/styles/colorManipulator',
    '@material-ui/styles/jssPreset',
    '@material-ui/utils',
    'jss']
}

async function createCoreConfig(): Promise<webpack.Configuration> {
  const name = "core"
  return makeDefaultConfig(
    name,
    coreDir,
    ["react-hot-loader/patch", "./src/init"],
    "electron-renderer",
    [
      // /^\@flipper/,
      /electron/,
      ...makeCommonExternals(coreDir, [...WebpackHotWhitelist, ...(getWhitelistIds()),/flipper/])
    ],
    [
      new HtmlWebpackPlugin({
        title: "Flipper",
        inject: false,
        template: "./assets/index.pug"
      })
    ]
  )
}

function applyMode(
  name: string,
  config: webpack.Configuration
): webpack.Configuration {
  if (mode !== "development") return config

  const entry: Array<string> = Array.isArray(config.entry)
    ? (config.entry as any)
    : [config.entry]

  return {
    ...config,
    entry: [
      `webpack-hot-middleware/client?reload=true,name=${name}&path=${encodeURIComponent(
        `http://localhost:${port}/__webpack_hmr`
      )}&timeout=2000`,
      ...entry
    ],
    output: {
      ...config.output,
      publicPath: Path.resolve(packageDir, name, "dist") + Path.sep
      //filename: 'bundle.[name].js'
    },
    resolve: {
      ...config.resolve,
      alias: {
        ...(config.resolve.alias || {})
        //'react-dom': '@hot-loader/react-dom'
      }
    },
    plugins: [new webpack.HotModuleReplacementPlugin(), ...config.plugins]
  }
}

async function createPluginConfig({
  name,
  dir
}: PluginConfig): Promise<webpack.Configuration> {
  const whitelistIds = getWhitelistIds()
  return makeDefaultConfig(
    name,
    dir,
    ["./src/index"],
    "electron-renderer",
    [
      (context, request, callback) => {
        if (request.includes("plugin-")) {
          log.info("Flipper plugin request, ignoring", request, context)
        } else if (/flipper/.test(request) || whitelistIds.includes(request)) {
          log.info(`Flipper resource`, request, context)
          return callback(null, "commonjs " + request)
        } else {
          log.debug(`Checking external`, context, request)
        }
        ;(callback as any)()
      },
      /electron/,
      "lodash",
      ...ReactExternals,
      ...makeCommonExternals(dir, [/webpack-hot/])
    ],
    []
  )
}

export default async function generate(
  usePort: number,
  useMode: Mode = "development"
): Promise<Array<webpack.Configuration>> {
  port = usePort
  mode = useMode
  return [createAppConfig(), await createCoreConfig(), ...(await generatePluginConfigs())]
}
