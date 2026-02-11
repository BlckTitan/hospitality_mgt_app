'use client';

import { FcEmptyTrash } from "react-icons/fc";
import { MdEditDocument } from "react-icons/md";
import { Button } from "react-bootstrap";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { Id } from "../../../../../convex/_generated/dataModel";
import { api } from "../../../../../convex/_generated/api";
import { TableColumn } from "../../../../../shared/table";

interface RecipeLineProps {
  _id: string;
  recipeId: string;
  inventoryItemId: string;
  quantity: number;
  unit: string;
  wastePercent?: number;
  createdAt: number;
  updatedAt: number;
  inventoryItem?: {
    _id: string;
    name: string;
    sku: string;
    unitCost?: number;
  };
}

interface RecipeLinesComponentProps {
  recipeId: string;
  onDelete?: () => void;
}

const RecipeLines = ({ recipeId, onDelete }: RecipeLinesComponentProps) => {
  const recipeLineData = useQuery(api.recipes.getAllRecipeLines, { recipeId: recipeId as Id<'recipes'> });
  const removeRecipeLine = useMutation(api.recipes.deleteRecipeLine);

  const handleDelete = async (id: string, ingredientName: string) => {
    if (!confirm(`Are you sure you want to remove ${ingredientName} from this recipe?`)) return;
    try {
      const response = await removeRecipeLine({ recipeLineId: id as Id<'recipeLines'> });

      if (response.success === true) {
        toast.success(response.message);
        if (onDelete) onDelete();
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        return toast.error(response.message);
      }
    } catch (error) {
      console.log(`Failed to delete recipe line! ${error}`);
      toast.error("Failed to delete recipe ingredient. Please try again.");
    }
  };

  const tableColumns: TableColumn<RecipeLineProps>[] = [
    {
      label: 'Ingredient',
      key: 'inventoryItem',
      render: (value, row) => (
        <span>{row.inventoryItem?.name || 'N/A'}</span>
      )
    },
    {
      label: 'SKU',
      key: 'inventoryItem',
      render: (value, row) => (
        <span>{row.inventoryItem?.sku || 'N/A'}</span>
      )
    },
    {
      label: 'Quantity',
      key: 'quantity',
      render: (value, row) => (
        <span>{row.quantity}</span>
      )
    },
    {
      label: 'Unit',
      key: 'unit',
    },
    {
      label: 'Waste %',
      key: 'wastePercent',
      render: (value, row) => (
        <span>{row.wastePercent || 0}%</span>
      )
    },
    {
      label: 'Unit Cost',
      key: 'inventoryItem',
      render: (value, row) => (
        <span>${(row.inventoryItem?.unitCost || 0).toFixed(2)}</span>
      )
    },
    {
      label: 'Action',
      key: '_id',
      render: (value, row) => (
        <div className='flex justify-evenly lg:justify-start items-center gap-1'>
          <a
            href={`/admin/food-n-beverage/recipe-line/edit?recipe_line_id=${row._id}&recipe_id=${row.recipeId}`}
            className='!mr-2 !no-underline !text-amber-400'
          >
            <i className='icon'><MdEditDocument /></i>
          </a>

          <Button
            variant='white'
            onClick={() => handleDelete(row._id, row.inventoryItem?.name || 'Ingredient')}
            title='Delete recipe ingredient'
            className='!p-0 !border-0'
          >
            <i className='icon'>
              <FcEmptyTrash />
            </i>
          </Button>
        </div>
      ),
    },
  ];

  const recipeLinesData = recipeLineData?.data || [];

  return (
    <div className='w-full'>
      {recipeLinesData.length === 0 ? (
        <div className='text-center py-8 text-gray-500'>
          <p>No ingredients added to this recipe yet.</p>
        </div>
      ) : (
        <div className='w-full overflow-x-auto'>
          <table className='w-full border-collapse'>
            <thead>
              <tr className='bg-gray-100'>
                {tableColumns.map((col) => (
                  <th key={col.key} className='border p-2 text-left font-semibold'>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recipeLinesData.map((row: RecipeLineProps) => (
                <tr key={row._id} className='border-b hover:bg-gray-50'>
                  {tableColumns.map((col) => (
                    <td key={col.key} className='border p-2'>
                      {col.render ? col.render(row[col.key as keyof RecipeLineProps], row) : String(row[col.key as keyof RecipeLineProps])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RecipeLines;
