'use client'

import Table from 'react-bootstrap/Table';

export interface TableColumn<T> {
  label: string;
  key: keyof T;
  render?: (value: any, row: T) => React.ReactNode;
}

interface TableProps<T>{
  columns: TableColumn<T>[]
  data: T[]
}
function TableComponent<T extends Record <string, any>>({data, columns}: TableProps<T>) {

  return (
    <>

      <Table striped bordered hover >

        <thead>
          <tr>
              <th>SN</th>
              {columns && columns.map((items, index) => (
                  <th 
                    key={index}
                    style={{textWrap: 'nowrap'}}
                  >
                    {items.label}
                  </th>
              ))}
          </tr>
        </thead>

        <tbody>
            {
              data.length > 0 && data.map((row, index) => (
                <tr key={index}>
                  <td>{index+1}</td>
                  {columns.map((col, i) => (
                    <td key={i}>
                      {col.render ? col.render(row[col.key], row) : (row[col.key] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              ))
            }
        </tbody>

      </Table>


    </>
  );
}

export default TableComponent;



