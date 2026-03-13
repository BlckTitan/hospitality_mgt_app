'use client';

import React, { useState } from 'react';
import { Button } from 'react-bootstrap';
import { FcPlus } from 'react-icons/fc';
import RecipeLines from './components/recipeLines';
import { CreateRecipeLineForm } from './components/createRecipeLineForm';
import { useQuery } from 'convex/react';
import { useSearchParams } from 'next/navigation';
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import BootstrapModal from '../../../../shared/modal';

export default function RecipeLinePage() {
  const searchParams = useSearchParams();
  const recipeId = searchParams.get('recipe_id');
  const [modalShow, setModalShow] = useState(false);
  const [propertyId, setPropertyId] = useState<string>('');

  // Fetch properties to get the current property
  const propertiesResponse = useQuery(api.property.getAllProperties);
  const properties = propertiesResponse?.data || [];
  const currentPropertyId = propertyId || properties?.[0]?._id || '';

  const recipeResponse = useQuery(
    api.recipes.getRecipe, 
    recipeId && currentPropertyId ? { recipeId: recipeId as Id<'recipes'>, propertyId: currentPropertyId as Id<'properties'> } : 'skip'
  );

  const recipe = recipeResponse?.data;

  if (!recipeId) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-red-600">Recipe not found</h3>
          <a href="/admin/food-n-beverage/recipe" className="text-blue-600 hover:underline">
            Go back to Recipes
          </a>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-gray-700">Loading...</h3>
        </div>
      </div>
    );
  }

  // check if property is loading
  if (!propertiesResponse?.data) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        Loading...
      </div>
    );
  }

  if (propertiesResponse.data?.length === 0) {
    return (
      <div className='w-full h-full flex justify-center items-center'>
        <p className='text-xl'>No properties yet!</p>
      </div>
    );
  }

  return (
    <div className="w-full p-4 bg-white">
      <header className="w-full border-b flex justify-between items-center mb-4">
        <div>
          <h3>{recipe.name}</h3>
          <p className="text-sm text-gray-600">Recipe Ingredients</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline-secondary"
            onClick={() => window.history.back()}
          >
            Back
          </Button>
          <Button
            variant="light"
            className="cursor-pointer"
            style={{ width: 'fit', height: 'fit', padding: '0', borderRadius: '100%' }}
            onClick={() => setModalShow(true)}
            title="Add new ingredient"
          >
            <FcPlus className="w-8 h-8" />
          </Button>
        </div>
      </header>

      <div className="mb-4">
        {recipe.servings && (
          <p className="text-sm"><strong>Servings:</strong> {recipe.servings}</p>
        )}
        {recipe.instructions && (
          <div className="mt-2">
            <p className="text-sm"><strong>Instructions:</strong></p>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{recipe.instructions}</p>
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <h4 className="mb-4">Ingredients</h4>
        <RecipeLines 
          recipeId={recipeId}
          currentPropertyId={currentPropertyId}
          onDelete={() => setModalShow(false)}
        />
      </div>

      <ModalComponent
        modalShow={modalShow}
        setModalShow={setModalShow}
        onSuccess={() => {
          setModalShow(false);
        }}
        recipeId={recipeId}
        propertyId={(recipe.menuItem as any)?.propertyId || ''}
      />
    </div>
  );
}

function ModalComponent(props: any) {
  return (
    <>
      <BootstrapModal
        show={props.modalShow}
        onHide={() => props.setModalShow(false)}
        backdrop='static'
        keyboard={false}
        heading='Add Ingredient to Recipe'
        body={
          <CreateRecipeLineForm
            onSuccess={props.onSuccess}
            onClose={() => props.setModalShow(false)}
            recipeId={props.recipeId}
            propertyId={props.propertyId}
          />
        }
      />
    </>
  );
}
