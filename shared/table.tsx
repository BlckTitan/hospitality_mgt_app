'use client'

import { ReactNode } from 'react'
import { cn } from '../lib/utils'

export interface TableColumn<T> {
  label: string
  key: keyof T
  render?: (value: any, row: T) => ReactNode
}

interface TableProps<T> {
  columns: TableColumn<T>[]
  data: T[]
}

function TableComponent<T extends Record<string, any>>({ data, columns }: TableProps<T>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="mb-0 w-full min-w-full border-collapse border border-neutral-200 text-left text-sm">
        <thead className="bg-neutral-50">
          <tr>
            <th className="border border-neutral-200 px-3 py-2 font-semibold">SN</th>
            {columns?.map((items, index) => (
              <th key={index} className="whitespace-nowrap border border-neutral-200 px-3 py-2 font-semibold">
                {items.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 &&
            data.map((row, index) => (
              <tr key={index} className="odd:bg-white even:bg-neutral-50 hover:bg-neutral-100">
                <td className="border border-neutral-200 px-3 py-2">{index + 1}</td>
                {columns.map((col, i) => (
                  <td key={i} className="whitespace-nowrap border border-neutral-200 px-3 py-2">
                    {col.render ? col.render(row[col.key], row) : (row[col.key] as ReactNode)}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )
}

export default TableComponent
