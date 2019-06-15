package org.stato.nativeplugins.table;

import org.stato.nativeplugins.components.Sidebar;
import java.util.Map;

public class MockTableRow extends TableRow {
  public MockTableRow(String id, Map<Column, ? extends Value> values, Sidebar sidebar) {
    super(id, values, sidebar);
  }
}