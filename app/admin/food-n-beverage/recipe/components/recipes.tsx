'use client';

import { useMutation } from 'convex/react';
import { toast } from 'sonner';
import { Suspense } from 'react';
import { FiTrash2 } from 'react-icons/fi';
import { MdEditDocument } from 'react-icons/md';
import { GiCook } from 'react-icons/gi';
import { Button } from 'react-bootstrap';
import PaginationComponent from '../../../../../shared/pagination';
import { api } from '../../../../../convex/_generated/api';
import { Id } from '../../../../../convex/_generated/dataModel';
import { TableColumn } from '../../../../../shared/table';

interface RecipeProps {
  _id: string;
  menuItemId: string;
  name: string;
  servings?: number;
  instructions: string;
  totalCost?: number;
  createdAt: number;
  updatedAt: number;
}

export function Recipes({ currentPropertyId }: { currentPropertyId: Id<'properties'> }) {
  const deleteRecipe = useMutation(api.recipes.deleteRecipe);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm('Are you sure you want to delete recipe: ' + name + '?')) return;
    try {
      const response = await deleteRecipe({ recipeId: id as any });
      if (response.success) {
        toast.success(response.message || 'Recipe deleted successfully');
        setTimeout(() => {
          window.location.href = '/admin/food-n-beverage/recipe';
        }, 2000);
      } else {
        toast.error(response.message || 'Failed to delete recipe');
      }
    } catch (error) {
      console.error(`Failed to delete recipe! ${error}`);
      toast.error('Failed to delete recipe. Please try again.');
    }
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const tableColumns: TableColumn<RecipeProps>[] = [
    { label: 'Name', key: 'name' },
    {
      label: 'Servings',
      key: 'servings',
      render: (value) => <span>{value || '-'}</span>
    },
    {
      label: 'Total Cost',
      key: 'totalCost',
      render: (value) => <span>${(value || 0).toFixed(2)}</span>
    },
    {
      label: 'Created At',
      key: 'createdAt',
      render: (value) => <span>{formatDateTime(value)}</span>
    },
    {
      label: 'Action',
      key: '_id',
      render: (value, row) => (
        <div className='flex justify-evenly lg:justify-start items-center gap-1'>
          <a
            href={`/admin/food-n-beverage/recipe-line?recipe_id=${row._id}`}
            className='!mr-2 !no-underline !text-green-600 hover:!text-green-700'
            title='Manage ingredients'
          >
            <i className='icon'><GiCook size={20} /></i>
          </a>
          <a
            href={`/admin/food-n-beverage/recipe/edit?recipe_id=${row._id}`}
            className='!mr-2 !no-underline !text-amber-400'
            title='Edit recipe'
          >
            <i className='icon'><MdEditDocument /></i>
          </a>
          <Button
            variant='white'
            onClick={() => handleDelete(row._id, row.name)}
            title='Delete recipe'
          >
            <i className='icon'>
              <FiTrash2 />
            </i>
          </Button>
        </div>
      ),
    },
  ];


  return (
    <div className='w-full h-full overflow-x-scroll lg:!overflow-x-hidden'>
      <Suspense>
        <PaginationComponent collectionName='recipes' columns={tableColumns} />
      </Suspense>
    </div>
  );
}
