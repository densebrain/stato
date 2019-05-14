/**
 * Copyright 2018-present Facebook.
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 * @format
 */
import * as React from "react"
import { Component } from "react"
import { oc } from 'ts-optchain';

import Text from "./Text"
import { colors } from "../themes/colors"
import ManagedTable from "./table/ManagedTable"
import FlexRow from "./FlexRow"
import Glyph from "./Glyph"
import styled, { styleCreator } from "../styled"
import {isNumber} from "typeguard"
import {ThemeProps, withTheme} from "../themes"
import {TableBodyRow} from "./table/types"
const Padder = styled("div")(
  styleCreator(
    ({ padded, backgroundColor }) => ({
      padding: padded ? 10 : 0,
      backgroundColor
    }),
    ["padded", "backgroundColor"]
  )
)
const Container = styled("div")(
  styleCreator(
    ({ isCrash, padded }) => ({
      backgroundColor: isCrash ? colors.redTint : "transparent",
      border: padded ? `1px solid ${isCrash ? colors.red : colors.light15}` : "none",
      borderRadius: padded ? 5 : 0,
      overflow: "hidden"
    }),
    ["isCrash", "padded", "backgroundColor"]
  )
)
const Title = styled(FlexRow)(
  styleCreator(
    ({ isCrash }) => ({
      color: isCrash ? colors.red : "inherit",
      padding: 8,
      alignItems: "center",
      minHeight: 32
    }),
    ["isCrash", "padded", "backgroundColor"]
  )
)
const Reason = styled(Text)(
  styleCreator(
    ({ isCrash }) => ({
      color: isCrash ? colors.red : colors.light80,
      fontWeight: "bold",
      fontSize: 13
    }),
    ["isCrash", "padded", "backgroundColor"]
  )
)
const Line = styled(Text)(
  styleCreator(
    ({ isCrash, isBold }) => ({
      color: isCrash ? colors.red : colors.light80,
      fontWeight: isBold ? "bold" : "normal"
    }),
    ["isCrash", "padded", "backgroundColor"]
  )
)
const Icon = styled(Glyph)({
  marginRight: 5
})
const COLUMNS:{[key in keyof StackTraceElement]: number | string} = {
  lineNumber: 40,
  address: 150,
  library: 150,
  message: "flex",
  caller: 200
}

type StackTraceElement = {
  isBold?: boolean,
  library?: string | null | undefined,
  address?: string | null | undefined,
  caller?: string | null | undefined,
  lineNumber?: string | null | undefined,
  message?: string | null | undefined
}

type ColumnKey = keyof typeof COLUMNS
/**
 * Display a stack trace
 */

export default withTheme()(class StackTrace extends Component<ThemeProps<{
  children: Array<StackTraceElement>,
  reason?: string,
  isCrash?: boolean,
  padded?: boolean,
  backgroundColor?: string
},string,true>> {
  render() {
    const { children, theme:{colors} } = this.props

    if (!children || children.length === 0) {
      return null
    }

    const columns = Object.keys(children[0]).reduce((acc, cv: ColumnKey) => {
      if (cv !== "isBold") {
        acc[cv] = {
          label: cv,
          value: cv
        }
      }

      return acc
    }, {} as {[key in ColumnKey]: {label: string, value: string}})
    const columnOrder = Object.keys(COLUMNS).map((key: ColumnKey) => ({
      key,
      visible: Boolean(columns[key])
    }))
    const columnSizes = Object.keys(COLUMNS).reduce((acc, cv:ColumnKey) => {
      acc[cv] =
        COLUMNS[cv] === "flex"
          ? "flex"
          : children.reduce((acc, line) => {
          const value = line[cv]
          return !isNumber(value) ? acc : Math.max(acc, oc(line[cv]).length || 0)
        }, 0) * 8 + 16 // approx 8px per character + 16px padding left/right

      return acc
    }, {} as {[key in ColumnKey]: number | string})
    const rows = children.map((l, i) => ({
      key: i.toString(),
      columns: Object.keys(columns).reduce((acc, cv: ColumnKey) => {
        acc[cv] = {
          align: cv === "lineNumber" ? "right" : "left",
          value: (
            <Line code isCrash={this.props.isCrash} bold={l.isBold || false}>
              {l[cv]}
            </Line>
          )
        }
        return acc
      }, {} as {[key in ColumnKey]: {
        align: "right" | "left"
        value: React.ReactNode
      }})
    }) as TableBodyRow)
    return (
      <Padder padded={this.props.padded} backgroundColor={this.props.backgroundColor}>
        <Container isCrash={this.props.isCrash} padded={this.props.padded}>
          {this.props.reason && (
            <Title isCrash={this.props.isCrash}>
              {this.props.isCrash && <Icon name="stop" variant="filled" size={16} color={colors.error} />}
              <Reason isCrash={this.props.isCrash} code>
                {this.props.reason}
              </Reason>
            </Title>
          )}
          <ManagedTable
            columns={columns}
            items={rows}
            hideHeader={true}
            autoHeight
            zebra={false}
            columnOrder={columnOrder}
            columnSizes={columnSizes}
            highlightableRows={false}
          />
        </Container>
      </Padder>
    )
  }
})
