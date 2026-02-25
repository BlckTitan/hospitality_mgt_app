'use client';

import { useQuery, useMutation } from 'convex/react';
import { toast } from 'sonner';
import { Suspense } from 'react';
import { FcEmptyTrash } from 'react-icons/fc';
import { MdEditDocument } from 'react-icons/md';
import { Button } from 'react-bootstrap';
import PaginationComponent from '../../../../../shared/pagination';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { TableColumn } from '../../../../../shared/table';

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
  currentPropertyId: string;
  onDelete?: () => void;
}

const RecipeLines = ({ recipeId, currentPropertyId, onDelete }: RecipeLinesComponentProps) => {
  const recipeLinesResponse = useQuery(api.recipeLines.getAllRecipeLines, {
    recipeId: recipeId as Id<'recipes'>,
    propertyId: currentPropertyId as Id<'properties'>,
  });
  const recipeLines = recipeLinesResponse?.data || [];
  const removeRecipeLine = useMutation(api.recipeLines.deleteRecipeLine);

  const handleDelete = async (id: string, ingredientName: string) => {
    if (!confirm(`Are you sure you want to remove ${ingredientName} from this recipe?`)) return;
    try {
      const response = await removeRecipeLine({ recipeLineId: id as Id<'recipeLines'>, propertyId: currentPropertyId as Id<'properties'> });

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
      toast.error('Failed to delete recipe ingredient. Please try again.');
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

  return (
    <div className='w-full h-full overflow-x-scroll lg:!overflow-x-hidden'>
      <Suspense>
        <PaginationComponent 
          collectionName='recipeLines' 
          columns={tableColumns}
          jointTableData={(recipeLinesResponse?.success === true) && recipeLines}
        />
      </Suspense>
    </div>
  );
};

export default RecipeLines;
