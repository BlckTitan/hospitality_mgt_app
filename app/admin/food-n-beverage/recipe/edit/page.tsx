'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import Link from 'next/link';
import { api } from '../../../../../convex/_generated/api';
import { EditFormComponent } from '../components/editRecipeForm';

export default function RecipeEditPage() {
  const searchParams = useSearchParams();
  const recipeId = searchParams.get('recipe_id');

  const recipeResponse = useQuery(
    api.recipes.getRecipe,
    recipeId ? { recipeId: recipeId as any } : 'skip'
  );

  if (!recipeId) {
    return (
      <div className='w-full p-4 bg-white'>
        <div className='alert alert-danger'>
          <p>Recipe ID is required. Please go back and select a recipe to edit.</p>
          <Link href='/admin/food-n-beverage/recipe' className='btn btn-primary'>
            Back to Recipes
          </Link>
        </div>
      </div>
    );
  }

  if (!recipeResponse) {
    return (
      <div className='w-full p-4 bg-white'>
        <p className='text-center my-4'>Loading recipe...</p>
      </div>
    );
  }

  if (!recipeResponse.success || !recipeResponse.data) {
    return (
      <div className='w-full p-4 bg-white'>
        <div className='alert alert-danger'>
          <p>{recipeResponse.message || 'Recipe not found'}</p>
          <Link href='/admin/food-n-beverage/recipe' className='btn btn-primary'>
            Back to Recipes
          </Link>
        </div>
      </div>
    );
  }

  const recipe = recipeResponse.data;

  return (
    <div className='w-full p-4 bg-white'>
      <h3 className='mb-4'>Edit Recipe</h3>
      <EditFormComponent recipe={recipe} />
      <Link href='/admin/food-n-beverage/recipe' className='btn btn-secondary mt-3'>
        Back to Recipes
      </Link>
    </div>
  );
}
