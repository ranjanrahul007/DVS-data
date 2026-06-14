export interface TableConfig {
  id: string;
  tableTitle: string;
  tableSubtitle: string;
  columns: string[];
  rows: Record<string, unknown>[];
}

export interface PortalConfig {
  portalName: string;
  tagline: string;
  lastUpdated: string;
  tables: TableConfig[];
}

export const portalConfig: PortalConfig = {
  portalName: "Data Portal",
  tagline: "National Data Sharing & Accessibility Portal",
  lastUpdated: "June 13, 2026",
  tables: [
    {
      id: "custom-table-1",
      tableTitle: "Custom Table 1",
      tableSubtitle: "Source: Edit to specify data source or description",
      columns: ["Column 1", "Column 2", "Column 3"],
      rows: [
        {
          "Column 1": "",
          "Column 2": "",
          "Column 3": ""
        },
        {
          "Column 1": "",
          "Column 2": "",
          "Column 3": ""
        }
      ]
    }
  ]
};
