'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from 'convex/react';
import { api } from '../../../../../convex/_generated/api';
import { EditRecipeLineForm } from '../components/editRecipeLineForm';
import BootstrapModal from '../../../../../shared/modal';
import { Id } from '../../../../../convex/_generated/dataModel';

interface RecipeLineData {
  _id: string;
  quantity: number;
  unit: string;
  wastePercent?: number;
  inventoryItem?: {
    _id: string;
    name: string;
  };
}

export default function RecipeLineEditPage() {
  const searchParams = useSearchParams();
  const recipeLineId = searchParams.get('recipe_line_id');
  const recipeId = searchParams.get('recipe_id');
  const [modalShow, setModalShow] = useState(true);

  const recipeLineResponse = useQuery(
    api.recipes.getRecipeLine,
    recipeLineId ? { recipeLineId: recipeLineId as Id<'recipeLines'> } : 'skip'
  );

  const recipeLine = recipeLineResponse?.data;

  if (!recipeLineId || !recipeId) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-red-600">Recipe Line ID or Recipe ID is missing</h3>
          <a href="/admin/food-n-beverage/recipe" className="text-blue-600 hover:underline">
            Go back to Recipes
          </a>
        </div>
      </div>
    );
  }

  if (!recipeLineResponse) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-gray-700">Loading...</h3>
        </div>
      </div>
    );
  }

  if (!recipeLine) {
    return (
      <div className="w-full p-4 bg-white">
        <div className="text-center py-8">
          <h3 className="text-red-600">Recipe ingredient not found</h3>
          <a 
            href={`/admin/food-n-beverage/recipe-line?recipe_id=${recipeId}`}
            className="text-blue-600 hover:underline"
          >
            Go back to Recipe Ingredients
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <ModalComponent
        modalShow={modalShow}
        setModalShow={setModalShow}
        recipeLine={recipeLine}
        recipeId={recipeId}
      />
    </>
  );
}

function ModalComponent(props: {
  modalShow: boolean;
  setModalShow: (show: boolean) => void;
  recipeLine: RecipeLineData;
  recipeId: string;
}) {
  return (
    <BootstrapModal
      show={props.modalShow}
      onHide={() => props.setModalShow(false)}
      backdrop="static"
      keyboard={false}
      heading="Edit Recipe Ingredient"
      body={
        <EditRecipeLineForm
          onSuccess={() => {
            props.setModalShow(false);
          }}
          onClose={() => {
            window.history.back();
          }}
          recipeLine={props.recipeLine}
        />
      }
    />
  );
}
