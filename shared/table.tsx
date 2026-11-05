'use client'

import { ReactNode } from 'react'
import { cn } from '../lib/utils'

export interface TableColumn<T> {
  label: string
  key: keyof T
  render?: (value: any, row: T) => ReactNode
  /** Keep this column at the left edge while the rest of the row scrolls. */
  pin?: 'left'
}

interface TableProps<T> {
  columns: TableColumn<T>[]
  data: T[]
  showIndex?: boolean
}

function TableComponent<T extends Record<string, any>>({ data, columns, showIndex = true }: TableProps<T>) {
  const pinned = columns.some((column) => column.pin === 'left')
  const headCell = 'whitespace-nowrap border border-neutral-200 px-3 py-2 font-semibold'
  const bodyCell = 'whitespace-nowrap border border-neutral-200 px-3 py-2'
  const pinHead = 'sticky left-0 z-20 min-w-36 bg-neutral-50 border-r-2 border-r-neutral-300'
  const pinBody = 'sticky left-0 z-10 min-w-36 bg-white border-r-2 border-r-neutral-300 group-even:bg-neutral-50 group-hover:bg-neutral-100'

  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn(
          'mb-0 w-full min-w-full border border-neutral-200 text-left text-sm',
          pinned ? 'border-separate border-spacing-0' : 'border-collapse',
        )}
      >
        <thead className="bg-neutral-50">
          <tr>
            {showIndex && <th className={headCell}>SN</th>}
            {columns?.map((items, index) => (
              <th key={index} className={cn(headCell, items.pin === 'left' && pinHead)}>
                {items.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 &&
            data.map((row, index) => (
              <tr key={index} className="group odd:bg-white even:bg-neutral-50 hover:bg-neutral-100">
                {showIndex && <td className={bodyCell}>{index + 1}</td>}
                {columns.map((col, i) => (
                  <td key={i} className={cn(bodyCell, col.pin === 'left' && pinBody)}>
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
